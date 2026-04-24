export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerationResult {
  title: string;
  description: string;
  usage?: TokenUsage;
}

export interface Provider {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelOptions: string[];
  requiresApiKey: boolean;
  generate(prompt: string, settings: ProviderSettings): Promise<GenerationResult>;
  stream?(
    prompt: string,
    settings: ProviderSettings,
    onChunk: (text: string) => void
  ): Promise<TokenUsage | undefined>;
}

export function parseJsonResponse(raw: string): GenerationResult {
  const jsonText = raw
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The AI returned an invalid response. Please try again.');
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error('The AI returned an invalid response. Please try again.');
    }
  }
  if (!parsed.title || !parsed.description) {
    throw new Error('The AI response is missing required title or description fields.');
  }
  return { title: String(parsed.title), description: String(parsed.description) };
}

export function trimBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function formatHttpError(provider: string, status: number, body: string): Error {
  const trimmed = body.trim();
  const detail = trimmed
    ? trimmed.substring(0, 300)
    : `No response body. Check that the base URL and API key match the proxy's auth scheme.`;
  return new Error(`${provider} error (${status}): ${detail}`);
}

export function requireBody(body: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> {
  if (!body) throw new Error('Response body is empty.');
  return body;
}

export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer) yield buffer;
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) yield line;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* readSseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const line of readLines(body)) {
    if (line.trim()) yield line;
  }
}
