import { deobfuscateApiKey, loadSettings, type StoredSettings } from './utils';
import { getProvider, type ProviderSettings } from './providers';

const MAX_LINES_PER_FILE = 100;
const MAX_COMMITS_LENGTH = 50;
const MAX_DIFF_LENGTH = 30000;
const MAX_TEMPLATE_LENGTH = 4000;
const MAX_EXTRA_CONTEXT_LENGTH = 1000;
const MAX_USER_DRAFT_LENGTH = 2000;
const MAX_ISSUES_FETCHED = 3;
const MAX_ISSUE_BODY_LENGTH = 500;
const ISSUE_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

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

  const [template, issues] = await Promise.all([
    fetchRepoTemplate(prUrl),
    fetchLinkedIssues(prUrl, commits, cleanedDiff),
  ]);
  const settings = await loadSettings();
  return await generate(commits, cleanedDiff, settings, { extraContext, userDraft, template, issues });
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

interface LinkedIssue {
  number: number;
  title: string;
  body: string;
}

interface IssueCacheEntry {
  data: LinkedIssue | null;
  ts: number;
}

async function fetchLinkedIssues(prUrl: string, commits: string[], diff: string): Promise<LinkedIssue[]> {
  const parsed = parseOwnerRepo(prUrl);
  if (!parsed) return [];
  const { owner, repo } = parsed;

  const haystack = commits.join('\n') + '\n' + diff;
  const matches = haystack.match(/(?<![\w&])#(\d+)\b/g) || [];
  const unique: number[] = [];
  for (const m of matches) {
    const n = Number(m.slice(1));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (!unique.includes(n)) unique.push(n);
    if (unique.length >= MAX_ISSUES_FETCHED) break;
  }
  if (unique.length === 0) return [];

  const results = await Promise.all(unique.map((n) => loadIssue(owner, repo, n)));
  return results.filter((r): r is LinkedIssue => r !== null);
}

async function loadIssue(owner: string, repo: string, number: number): Promise<LinkedIssue | null> {
  const key = `issue:${owner}/${repo}#${number}`;
  const cached = await sessionGet<IssueCacheEntry>(key);
  if (cached && Date.now() - cached.ts < ISSUE_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) {
      await sessionSet(key, { data: null, ts: Date.now() });
      return null;
    }
    const json = await res.json();
    const issue: LinkedIssue = {
      number,
      title: String(json.title || '').slice(0, 200),
      body: String(json.body || '').slice(0, MAX_ISSUE_BODY_LENGTH),
    };
    await sessionSet(key, { data: issue, ts: Date.now() });
    return issue;
  } catch {
    return null;
  }
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

interface PromptExtras {
  extraContext?: string;
  userDraft?: UserDraft;
  template?: string | null;
  issues?: LinkedIssue[];
}

async function generate(commits: string[], diff: string, settings: StoredSettings, extras: PromptExtras) {
  const provider = getProvider(settings.provider);
  const config = settings.providers[settings.provider];
  const providerSettings: ProviderSettings = {
    apiKey: config.apiKeyEncoded ? deobfuscateApiKey(config.apiKeyEncoded) : '',
    baseUrl: config.baseUrl || provider.defaultBaseUrl,
    model: config.model || provider.defaultModel,
  };

  const prompt = constructPrompt(commits, diff, extras);
  return provider.generate(prompt, providerSettings);
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

  const issues = extras.issues || [];
  if (issues.length > 0) {
    const rendered = issues.map((i) => `#${i.number} — ${i.title}\n${i.body}`).join('\n\n');
    sections.push(`Referenced issues:\n${rendered}`);
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
