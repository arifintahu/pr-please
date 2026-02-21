import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_SERVICE_URL, DEFAULT_MODEL, DEFAULT_LOCAL_BASE_URL, deobfuscateApiKey } from './utils';

const ALLOWED_URL_SCHEMES = ['http:', 'https:'];
const TIMEOUT_MS = 60000; // 60 seconds
const MAX_LINES_PER_FILE = 100;
const MAX_COMMITS_LENGTH = 50;
const MAX_DIFF_LENGTH = 30000;

interface GenerateRequest {
  action: 'GENERATE_PR';
  commits: string[];
  prUrl: string;
}

interface Settings {
  mode: 'local' | 'remote';
  apiKey: string;
  serviceUrl: string;
  localBaseUrl: string;
  model: string;
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
    return await generateLocal(commits, cleanedDiff, settings.apiKey, settings.model, settings.localBaseUrl);
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
    chrome.storage.local.get(['mode', 'apiKeyEncoded', 'serviceUrl', 'localBaseUrl', 'model'], (result: { [key: string]: any }) => {
      resolve({
        mode: result.mode || 'local',
        apiKey: result.apiKeyEncoded ? deobfuscateApiKey(result.apiKeyEncoded) : '',
        serviceUrl: result.serviceUrl || DEFAULT_SERVICE_URL,
        localBaseUrl: result.localBaseUrl || DEFAULT_LOCAL_BASE_URL,
        model: result.model || DEFAULT_MODEL
      });
    });
  });
}

async function generateLocal(commits: string[], diff: string, apiKey: string, model: string, baseUrl: string) {
  if (!apiKey) throw new Error('Gemini API Key is missing for Local mode.');

  const prompt = constructPrompt(commits, diff);

  if (!baseUrl || baseUrl === DEFAULT_LOCAL_BASE_URL) {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Request JSON output
    const jsonModel = genAI.getGenerativeModel({ 
        model: model,
        generationConfig: { responseMimeType: "application/json" } as any
    });

    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    let parsed: any;
    try {
      let jsonText = response.text();
      // Clean up potential markdown code blocks
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('The AI returned an invalid response. Please try again.');
    }
    if (!parsed.title || !parsed.description) {
      throw new Error('The AI response is missing required title or description fields.');
    }
    return parsed;
  } else {
    // Custom Base URL Logic (e.g. for local proxies like Ollama or LocalAI)
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${normalizedBase}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Local AI Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
         throw new Error('Invalid response structure from Local AI.');
    }
    
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('The AI returned an invalid JSON response.');
    }

    if (!parsed.title || !parsed.description) {
      throw new Error('The AI response is missing required title or description fields.');
    }
    return parsed;
  }
}

async function generateRemote(commits: string[], diff: string, serviceUrl: string) {
  const validatedBase = validateUrl(serviceUrl);
  const url = validatedBase.endsWith('/') ? `${validatedBase}generate` : `${validatedBase}/generate`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        commits: commits.slice(0, MAX_COMMITS_LENGTH),
        diff: diff.substring(0, MAX_DIFF_LENGTH),
      }),
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

STRICT OUTPUT RULES:
1. Return ONLY valid JSON.
2. Do NOT include markdown formatting like \`\`\`json\` wrapper.
3. The "description" field must contain the full markdown body.

CONTENT GENERATION RULES:

- **Title**: Follow these standards for a strong PR title:
  - Use Conventional Commits prefixes: \`feat\`, \`fix\`, \`docs\`, \`refactor\`, \`chore\`, \`test\`, \`perf\`, \`ci\`, or \`style\`.
  - Write in imperative mood (e.g., "add", "fix", "remove") — not past tense or progressive tense.
  - Describe *what* the change **does**, not just what area it touches (e.g., "fix: resolve login button unresponsive on Safari" not "fix: update login button").
  - Be concise and specific: aim for under 72 characters, avoid vague phrases like "update files", "fix bug", or "update CSS".
  - If a related issue or ticket number is available in the diff/context, append it (e.g., "feat: add CSV export for reports (closes #123)").
  - Format: \`<type>: <short imperative summary> [(closes #issue)]\`

- **Summary**: Write a concise 1-2 sentence paragraph summarizing what changed and why. This should let a reviewer immediately grasp the purpose without reading the full diff.

- **Key Changes**: List the main changes as bullet points with bold component/feature names followed by nested sub-bullets for details. Group related changes together.

- **Testing**: Describe how to verify these changes — include specific steps to reproduce, test scenarios considered, or edge cases validated. If automated tests were added, mention them here.

- **Notable Implementation Details**: Highlight important technical decisions, architectural choices, or caveats as bullet points.

- **Out of Scope**: Note anything intentionally not addressed in this PR that may be relevant or planned for a follow-up, to keep the scope of review clear.

- **Impact**: Write a paragraph describing the value and effect of these changes on users or the system.

- **Related Resources**: If any related issues, tickets, documentation links, or prior PRs are referenced or inferable from the diff context, include them. Otherwise, omit this section entirely.

Target Markdown Structure for "description":
## Summary
(Concise 1-2 sentence paragraph summarizing what changed and why)

## Key Changes

- **Component or feature name**: Description of the change
  - Sub-item detail
  - Sub-item detail
- **Another component**: Description of the change

## Testing

- Step or scenario to verify the change
- Edge case or regression considered

## Notable Implementation Details

- Important technical detail or architectural decision
- Any caveats or risks

## Out of Scope

- What was intentionally not addressed and may be followed up later

## Impact

(Paragraph describing the value and effect of these changes on users or the system)

## Related Resources

- [Issue/Ticket/Doc title](url) — brief note on relevance

Commits:
${commits.slice(0, MAX_COMMITS_LENGTH).join('\n')}

Diff:
${diff.substring(0, MAX_DIFF_LENGTH)}
  `;
}
