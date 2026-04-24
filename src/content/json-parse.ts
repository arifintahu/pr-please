const HEX_RADIX = 16;
const HEX_ESCAPE_LENGTH = 6;

interface PartialJson {
  title?: string;
  description?: string;
}

function decodeEscape(s: string, i: number): { ch: string; consumed: number } | null {
  if (s[i] !== '\\' || i + 1 >= s.length) return null;
  const next = s[i + 1];
  const simple: Record<string, string> = {
    n: '\n',
    r: '\r',
    t: '\t',
    '"': '"',
    '\\': '\\',
    '/': '/',
  };
  if (simple[next] !== undefined) return { ch: simple[next], consumed: 2 };
  if (next === 'u' && i + 5 < s.length) {
    const code = parseInt(s.slice(i + 2, i + HEX_ESCAPE_LENGTH), HEX_RADIX);
    if (!isNaN(code)) return { ch: String.fromCharCode(code), consumed: HEX_ESCAPE_LENGTH };
  }
  return null;
}

export function unescapePartialJsonString(s: string): string {
  let result = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') break;
    const decoded = decodeEscape(s, i);
    if (decoded) {
      result += decoded.ch;
      i += decoded.consumed;
    } else {
      result += s[i];
      i++;
    }
  }
  return result;
}

function parseCompleteJson(raw: string): PartialJson | null {
  try {
    const p = JSON.parse(raw);
    if (p?.title || p?.description) {
      return { title: String(p.title || ''), description: String(p.description || '') };
    }
  } catch {
    // Fall through to partial extraction below.
  }
  return null;
}

function extractPartialDescription(raw: string): string | undefined {
  const descMarker = '"description"';
  const descIdx = raw.indexOf(descMarker);
  if (descIdx === -1) return undefined;
  const after = raw.slice(descIdx + descMarker.length);
  const colonQuote = after.match(/^\s*:\s*"/);
  if (!colonQuote) return undefined;
  return unescapePartialJsonString(after.slice(colonQuote[0].length));
}

export function extractPartialJson(raw: string): PartialJson | null {
  const complete = parseCompleteJson(raw);
  if (complete) return complete;

  const result: PartialJson = {};
  const titleMatch = raw.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) result.title = unescapePartialJsonString(titleMatch[1]);
  const description = extractPartialDescription(raw);
  if (description !== undefined) result.description = description;
  return result.title !== undefined || result.description !== undefined ? result : null;
}

export function parseGenerationJson(raw: string): { title: string; description: string } {
  const stripped = raw
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The AI returned an invalid response. Please try again.');
    parsed = JSON.parse(match[0]);
  }
  if (!isGeneration(parsed)) {
    throw new Error('The AI response is missing required fields.');
  }
  return { title: String(parsed.title), description: String(parsed.description) };
}

function isGeneration(value: unknown): value is { title: unknown; description: unknown } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.title) && Boolean(v.description);
}
