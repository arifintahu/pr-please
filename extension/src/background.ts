import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_SERVICE_URL = 'http://localhost:3000';
const ALLOWED_URL_SCHEMES = ['http:', 'https:'];

interface GenerateRequest {
  action: 'GENERATE_PR';
  commits: string[];
  prUrl: string;
}

interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
}

function validateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      throw new Error(`Invalid URL scheme: ${parsed.protocol}. Only HTTP and HTTPS are allowed.`);
    }
    return parsed.href;
  } catch (e: any) {
    if (e.message.startsWith('Invalid URL scheme')) throw e;
    throw new Error('Invalid service URL format.');
  }
}

chrome.runtime.onMessage.addListener((request: GenerateRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === 'GENERATE_PR') {
    handleGeneratePR(request)
      .then(response => sendResponse(response))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open
  }
});

async function handleGeneratePR(request: GenerateRequest) {
  const { commits, prUrl } = request;

  // 1. Fetch Diff
  const diffUrl = prUrl.endsWith('.diff') ? prUrl : `${prUrl}.diff`;
  const diffResponse = await fetch(diffUrl);
  if (!diffResponse.ok) {
    throw new Error('Failed to fetch PR diff. Make sure the PR URL is accessible.');
  }
  const fullDiff = await diffResponse.text();

  // 2. Filter Diff (Privacy & Token Limits)
  const filteredDiff = filterDiff(fullDiff);
  const cleanedDiff = cleanGitDiff(filteredDiff);

  // 3. Get Settings
  const settings = await getSettings();

  // 4. Call LLM
  if (settings.mode === 'local') {
    return await generateLocal(commits, cleanedDiff, settings.apiKey);
  } else {
    return await generateRemote(commits, cleanedDiff, settings.serviceUrl);
  }
}

// Comprehensive regex patterns for cleaning git diff output 
const cleaningPatterns = { 
  // Remove git diff headers 
  gitHeaders: /^(diff --git |index |--- |(\+\+\+ )).*$/gm, 
  
  // Remove line number indicators 
  lineNumbers: /^@@.*@@.*$/gm, 
  
  // Remove truncation markers 
  truncations: /^\.\.\. \(truncated \d+ lines\).*$/gm, 
  
  // Remove leading +/- from diff lines (keep content) 
  diffMarkers: /^([+\-])/gm, 
  
  // Remove "new file mode" and similar metadata 
  fileMetadata: /^(new file mode|deleted file mode|similarity index|rename from|rename to|copy from|copy to).*$/gm, 
  
  // Remove excessive blank lines (3+ consecutive newlines) 
  excessiveNewlines: /\n{3,}/g, 
  
  // Remove leading/trailing whitespace per line 
  lineWhitespace: /^[ \t]+|[ \t]+$/gm 
}; 

// Function to clean the text 
function cleanGitDiff(text: string) { 
  let cleaned = text; 
  
  // Apply each cleaning pattern 
  cleaned = cleaned.replace(cleaningPatterns.gitHeaders, ''); 
  cleaned = cleaned.replace(cleaningPatterns.lineNumbers, ''); 
  cleaned = cleaned.replace(cleaningPatterns.truncations, ''); 
  cleaned = cleaned.replace(cleaningPatterns.fileMetadata, ''); 
  cleaned = cleaned.replace(cleaningPatterns.diffMarkers, ''); 
  cleaned = cleaned.replace(cleaningPatterns.excessiveNewlines, '\n\n'); 
  cleaned = cleaned.replace(cleaningPatterns.lineWhitespace, ''); 
  
  // Trim final result 
  return cleaned.trim(); 
}

function filterDiff(diff: string): string {
  const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.env'];
  const MAX_LINES_PER_FILE = 50;
  
  const files = diff.split('diff --git ');
  const processedFiles = files.map(fileChunk => {
    if (!fileChunk.trim()) return '';
    
    // Extract filename (heuristic)
    const firstLine = fileChunk.split('\n')[0];
    const match = firstLine.match(/a\/(.*) b\//);
    const filename = match ? match[1] : 'unknown';

    // Check ignore list
    if (IGNORED_FILES.some(ignored => filename.includes(ignored))) {
      return `(Skipped ${filename})`;
    }

    // Truncate lines
    const lines = fileChunk.split('\n');
    if (lines.length > MAX_LINES_PER_FILE) {
      return lines.slice(0, MAX_LINES_PER_FILE).join('\n') + `\n... (truncated ${lines.length - MAX_LINES_PER_FILE} lines)`;
    }
    return fileChunk;
  });

  return processedFiles.join('diff --git ');
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mode', 'serviceUrl'], (result: { [key: string]: any }) => {
      const localSettings: Settings = {
        mode: result.mode || 'local',
        apiKey: '',
        serviceUrl: result.serviceUrl || DEFAULT_SERVICE_URL
      };

      // Read API key from session storage (more secure, cleared on browser close)
      chrome.storage.session.get(['apiKey'], (sessionResult: { [key: string]: any }) => {
        localSettings.apiKey = sessionResult.apiKey || '';
        resolve(localSettings);
      });
    });
  });
}

async function generateLocal(commits: string[], diff: string, apiKey: string) {
  if (!apiKey) throw new Error('Gemini API Key is missing for Local mode.');

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const prompt = constructPrompt(commits, diff);
  
  // Request JSON output
  const jsonModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } as any
  });

  const result = await jsonModel.generateContent(prompt);
  const response = await result.response;
  let parsed: any;
  try {
    parsed = JSON.parse(response.text());
  } catch {
    throw new Error('The AI returned an invalid response. Please try again.');
  }
  if (!parsed.title || !parsed.description) {
    throw new Error('The AI response is missing required title or description fields.');
  }
  return parsed;
}

async function generateRemote(commits: string[], diff: string, serviceUrl: string) {
  const validatedBase = validateUrl(serviceUrl);
  const url = validatedBase.endsWith('/') ? `${validatedBase}generate` : `${validatedBase}/generate`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ commits, diff }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to communicate with service.');
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds');
    }
    throw error;
  }
}

function constructPrompt(commits: string[], diff: string): string {
  return `
You are a PR assistant. Analyze the code changes and return a JSON object with "title" and "description" fields.
The "description" field should contain the full markdown body using the template below.

Template:
# Task
<!-- Please add link a relevant issue or task -->

# Description
<!-- Please include a summary of the change -->
<!-- Any details that you think are important to review this PR? -->
<!-- Are there other PRs related to this one? -->

# How Has This Been Tested?
<!-- Please describe how you tested your changes -->

# Checklist
<!-- Go over all the following points, and put an x in all the boxes that apply -->
- [ ] I have performed a self-review of my own code
- [ ] I have added tests to cover my changes

Commits:
${commits.join('\n')}

Diff:
${diff.substring(0, 30000)}
  `;
}
