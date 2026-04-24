import {
  parseJsonResponse,
  readSseLines,
  trimBaseUrl,
  type Provider,
  type ProviderSettings,
  type TokenUsage,
} from './types';

export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com';
export const OPENAI_DEFAULT_MODEL = 'gpt-5.4-mini';
export const OPENAI_MODEL_OPTIONS = ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'];

export const openaiProvider: Provider = {
  id: 'openai',
  label: 'OpenAI',
  defaultBaseUrl: OPENAI_DEFAULT_BASE_URL,
  defaultModel: OPENAI_DEFAULT_MODEL,
  modelOptions: OPENAI_MODEL_OPTIONS,
  requiresApiKey: true,

  async generate(prompt: string, settings: ProviderSettings) {
    if (!settings.apiKey) {
      throw new Error('OpenAI API key is missing. Open the extension popup to add one.');
    }

    const base = trimBaseUrl(settings.baseUrl || OPENAI_DEFAULT_BASE_URL);
    const url = `${base}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${errText.substring(0, 200)}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Invalid response structure from OpenAI.');
    const parsed = parseJsonResponse(text);
    if (data.usage) {
      parsed.usage = {
        inputTokens: data.usage.prompt_tokens ?? 0,
        outputTokens: data.usage.completion_tokens ?? 0,
      };
    }
    return parsed;
  },

  async stream(
    prompt: string,
    settings: ProviderSettings,
    onChunk: (text: string) => void
  ): Promise<TokenUsage | undefined> {
    if (!settings.apiKey) {
      throw new Error('OpenAI API key is missing. Open the extension popup to add one.');
    }

    const base = trimBaseUrl(settings.baseUrl || OPENAI_DEFAULT_BASE_URL);
    const response = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${errText.substring(0, 200)}`);
    }

    let usage: TokenUsage | undefined;
    for await (const line of readSseLines(response.body!)) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;
      const data = JSON.parse(payload);
      const text = data.choices?.[0]?.delta?.content;
      if (text) onChunk(text);
      if (data.usage) {
        usage = {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
        };
      }
    }
    return usage;
  },
};
