import {
  parseJsonResponse,
  readLines,
  requireBody,
  trimBaseUrl,
  type Provider,
  type ProviderSettings,
  type TokenUsage,
} from './types';

export const OLLAMA_DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3.1';
export const OLLAMA_MODEL_OPTIONS = [
  'llama3.1',
  'llama3.2',
  'qwen2.5-coder',
  'codellama',
  'mistral',
  'deepseek-coder-v2',
];

export const ollamaProvider: Provider = {
  id: 'ollama',
  label: 'Ollama (local)',
  defaultBaseUrl: OLLAMA_DEFAULT_BASE_URL,
  defaultModel: OLLAMA_DEFAULT_MODEL,
  modelOptions: OLLAMA_MODEL_OPTIONS,
  requiresApiKey: false,

  async generate(prompt: string, settings: ProviderSettings) {
    const base = trimBaseUrl(settings.baseUrl || OLLAMA_DEFAULT_BASE_URL);
    const url = `${base}/api/generate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errText.substring(0, 200)}`);
    }
    const data = await response.json();
    const text = data.response;
    if (!text) throw new Error('Invalid response structure from Ollama.');
    const parsed = parseJsonResponse(text);
    if (data.prompt_eval_count != null || data.eval_count != null) {
      parsed.usage = {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      };
    }
    return parsed;
  },

  async stream(
    prompt: string,
    settings: ProviderSettings,
    onChunk: (text: string) => void
  ): Promise<TokenUsage | undefined> {
    const base = trimBaseUrl(settings.baseUrl || OLLAMA_DEFAULT_BASE_URL);
    const response = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: settings.model, prompt, stream: true, format: 'json' }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errText.substring(0, 200)}`);
    }

    let usage: TokenUsage | undefined;
    for await (const line of readLines(requireBody(response.body))) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (data.response) onChunk(data.response);
      if (data.done && (data.prompt_eval_count != null || data.eval_count != null)) {
        usage = { inputTokens: data.prompt_eval_count ?? 0, outputTokens: data.eval_count ?? 0 };
      }
    }
    return usage;
  },
};
