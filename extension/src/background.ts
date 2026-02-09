import { GoogleGenerativeAI } from '@google/generative-ai';

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

  // 3. Get Settings
  const settings = await getSettings();

  // 4. Call LLM
  if (settings.mode === 'local') {
    return await generateLocal(commits, filteredDiff, settings.apiKey);
  } else {
    return await generateRemote(commits, filteredDiff, settings.serviceUrl);
  }
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
    chrome.storage.local.get(['mode', 'apiKey', 'serviceUrl'], (result: { [key: string]: any }) => {
      resolve({
        mode: result.mode || 'local',
        apiKey: result.apiKey || '',
        serviceUrl: result.serviceUrl || 'http://localhost:3000'
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
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" } as any
  });

  const result = await jsonModel.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}

async function generateRemote(commits: string[], diff: string, serviceUrl: string) {
  const url = serviceUrl.endsWith('/') ? `${serviceUrl}generate` : `${serviceUrl}/generate`;
  
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

# Demo
<!-- Add a screenshot or a video demonstration when possible -->

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
