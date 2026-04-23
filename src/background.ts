import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_MODEL, DEFAULT_BASE_URL, deobfuscateApiKey } from './utils';

const MAX_LINES_PER_FILE = 100;
const MAX_COMMITS_LENGTH = 50;
const MAX_DIFF_LENGTH = 30000;
const MAX_TEMPLATE_LENGTH = 4000;
const MAX_EXTRA_CONTEXT_LENGTH = 1000;
const MAX_USER_DRAFT_LENGTH = 2000;

interface UserDraft {
  title: string;
  body: string;
}

interface GenerateRequest {
  action: 'GENERATE_PR';
  commits: string[];
  prUrl: string;
  extraContext?: string;
  userDraft?: UserDraft;
  useCachedDiff?: boolean;
}

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const diffCache = new Map<string, string>();

chrome.runtime.onMessage.addListener((request: GenerateRequest, _sender, sendResponse) => {
  if (request.action === 'GENERATE_PR') {
    handleGeneratePR(request)
      .then(response => sendResponse(response))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleGeneratePR(request: GenerateRequest) {
  const { commits, prUrl, extraContext, userDraft, useCachedDiff } = request;

  let cleanedDiff: string;
  if (useCachedDiff && diffCache.has(prUrl)) {
    cleanedDiff = diffCache.get(prUrl)!;
  } else {
    const diffUrl = prUrl.endsWith('.diff') ? prUrl : `${prUrl}.diff`;
    const diffResponse = await fetch(diffUrl);
    if (!diffResponse.ok) {
      throw new Error('Failed to fetch PR diff. Make sure the PR URL is accessible.');
    }
    const fullDiff = await diffResponse.text();
    cleanedDiff = cleanGitDiff(filterDiff(fullDiff));
    diffCache.set(prUrl, cleanedDiff);
  }

  const template = await fetchRepoTemplate(prUrl);
  const settings = await getSettings();
  return await generate(commits, cleanedDiff, settings, { extraContext, userDraft, template });
}

const cleaningPatterns = {
  gitHeaders: /^(diff --git |index |--- |(\+\+\+ )).*$/gm,
  lineNumbers: /^@@.*@@.*$/gm,
  truncations: /^\.\.\. \(truncated \d+ lines\).*$/gm,
  diffMarkers: /^([+\-])/gm,
  fileMetadata: /^(new file mode|deleted file mode|similarity index|rename from|rename to|copy from|copy to).*$/gm,
  excessiveNewlines: /\n{3,}/g,
  lineWhitespace: /^[ \t]+|[ \t]+$/gm
};

function cleanGitDiff(text: string) {
  let cleaned = text;
  cleaned = cleaned.replace(cleaningPatterns.gitHeaders, '');
  cleaned = cleaned.replace(cleaningPatterns.lineNumbers, '');
  cleaned = cleaned.replace(cleaningPatterns.truncations, '');
  cleaned = cleaned.replace(cleaningPatterns.fileMetadata, '');
  cleaned = cleaned.replace(cleaningPatterns.diffMarkers, '');
  cleaned = cleaned.replace(cleaningPatterns.excessiveNewlines, '\n\n');
  cleaned = cleaned.replace(cleaningPatterns.lineWhitespace, '');
  return cleaned.trim();
}

function filterDiff(diff: string): string {
  const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.env'];

  const files = diff.split('diff --git ');
  const processedFiles = files.map(fileChunk => {
    if (!fileChunk.trim()) return '';

    const firstLine = fileChunk.split('\n')[0];
    const match = firstLine.match(/a\/(.*) b\//);
    const filename = match ? match[1] : 'unknown';

    if (IGNORED_FILES.some(ignored => filename.includes(ignored))) {
      return `(Skipped ${filename})`;
    }

    const lines = fileChunk.split('\n');
    if (lines.length > MAX_LINES_PER_FILE) {
      return lines.slice(0, MAX_LINES_PER_FILE).join('\n') + `\n... (truncated ${lines.length - MAX_LINES_PER_FILE} lines)`;
    }
    return fileChunk;
  });

  return processedFiles.join('diff --git ');
}

function parseOwnerRepo(prUrl: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(prUrl);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

const TEMPLATE_PATHS = [
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/pull_request_template.md',
  'docs/PULL_REQUEST_TEMPLATE.md',
  'docs/pull_request_template.md',
  'PULL_REQUEST_TEMPLATE.md',
  'pull_request_template.md',
];

async function fetchRepoTemplate(prUrl: string): Promise<string | null> {
  const parsed = parseOwnerRepo(prUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const cacheKey = `template:${owner}/${repo}`;

  const cached = await sessionGet<string | ''>(cacheKey);
  if (cached !== undefined) return cached || null;

  for (const path of TEMPLATE_PATHS) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = (await res.text()).slice(0, MAX_TEMPLATE_LENGTH);
        await sessionSet(cacheKey, text);
        return text;
      }
    } catch {
      // network error — try next path
    }
  }

  await sessionSet(cacheKey, '');
  return null;
}

function sessionGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!chrome.storage?.session) {
      resolve(undefined);
      return;
    }
    chrome.storage.session.get([key], (res) => resolve(res?.[key]));
  });
}

function sessionSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    if (!chrome.storage?.session) {
      resolve();
      return;
    }
    chrome.storage.session.set({ [key]: value }, () => resolve());
  });
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKeyEncoded', 'baseUrl', 'model'], (result) => {
      resolve({
        apiKey: result.apiKeyEncoded ? deobfuscateApiKey(result.apiKeyEncoded) : '',
        baseUrl: result.baseUrl || DEFAULT_BASE_URL,
        model: result.model || DEFAULT_MODEL
      });
    });
  });
}

interface PromptExtras {
  extraContext?: string;
  userDraft?: UserDraft;
  template?: string | null;
}

async function generate(commits: string[], diff: string, settings: Settings, extras: PromptExtras) {
  if (!settings.apiKey) throw new Error('Gemini API Key is missing. Open the extension popup to add one.');

  const prompt = constructPrompt(commits, diff, extras);

  if (!settings.baseUrl || settings.baseUrl === DEFAULT_BASE_URL) {
    const genAI = new GoogleGenerativeAI(settings.apiKey);
    const jsonModel = genAI.getGenerativeModel({
      model: settings.model,
      generationConfig: { responseMimeType: 'application/json' } as any
    });

    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    return parseJson(response.text());
  }

  const normalizedBase = settings.baseUrl.endsWith('/') ? settings.baseUrl.slice(0, -1) : settings.baseUrl;
  const url = `${normalizedBase}/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Error (${response.status}): ${errText.substring(0, 100)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Invalid response structure from AI.');
  return parseJson(text);
}

function parseJson(raw: string) {
  const jsonText = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('The AI returned an invalid response. Please try again.');
  }
  if (!parsed.title || !parsed.description) {
    throw new Error('The AI response is missing required title or description fields.');
  }
  return parsed;
}

function constructPrompt(commits: string[], diff: string, extras: PromptExtras): string {
  const sections: string[] = [];

  if (extras.template) {
    sections.push(
      `Repo template to fill:\nThe repository provides the PR template below. Populate it using information derived from the commits and diff. Preserve its section order, headings, checklist items, and any HTML comments. Use this instead of your own default structure.\n\n<<<TEMPLATE\n${extras.template.slice(0, MAX_TEMPLATE_LENGTH)}\nTEMPLATE`
    );
  }

  const userDraft = extras.userDraft;
  const draftTitle = userDraft?.title?.trim() || '';
  const draftBody = userDraft?.body?.trim() || '';
  if (draftTitle || draftBody) {
    const parts: string[] = [
      'User has already written the following — refine and expand, do not discard their intent:',
    ];
    if (draftTitle) parts.push(`Draft title:\n${draftTitle.slice(0, MAX_USER_DRAFT_LENGTH)}`);
    if (draftBody) parts.push(`Draft body:\n${draftBody.slice(0, MAX_USER_DRAFT_LENGTH)}`);
    sections.push(parts.join('\n\n'));
  }

  const extra = extras.extraContext?.trim();
  if (extra) {
    sections.push(`User guidance:\n${extra.slice(0, MAX_EXTRA_CONTEXT_LENGTH)}`);
  }

  const targetStructure = extras.template
    ? `Use the repo template above as the structure for "description". Do not use the default structure.`
    : `Target Markdown Structure for "description":
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

- [Issue/Ticket/Doc title](url) — brief note on relevance`;

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

- **Description**: Produce a thorough, reviewer-friendly description following the target structure below.

${sections.length > 0 ? sections.join('\n\n') + '\n\n' : ''}${targetStructure}

Commits:
${commits.slice(0, MAX_COMMITS_LENGTH).join('\n')}

Diff:
${diff.substring(0, MAX_DIFF_LENGTH)}
  `;
}
