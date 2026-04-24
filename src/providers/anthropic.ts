import {
  formatHttpError,
  parseJsonResponse,
  readSseLines,
  requireBody,
  trimBaseUrl,
  type Provider,
  type ProviderSettings,
  type TokenUsage,
} from './types';

export const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_MODEL_OPTIONS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const SYSTEM_PROMPT =
  'You must respond with a single valid JSON object matching the requested shape. Do not include prose, code fences, or explanatory text — only the JSON object itself.';

export const anthropicProvider: Provider = {
  id: 'anthropic',
  label: 'Anthropic',
  defaultBaseUrl: ANTHROPIC_DEFAULT_BASE_URL,
  defaultModel: ANTHROPIC_DEFAULT_MODEL,
  modelOptions: ANTHROPIC_MODEL_OPTIONS,
  requiresApiKey: true,

  async generate(prompt: string, settings: ProviderSettings) {
    if (!settings.apiKey) {
      throw new Error('Anthropic API key is missing. Open the extension popup to add one.');
    }

    const base = trimBaseUrl(settings.baseUrl || ANTHROPIC_DEFAULT_BASE_URL);
    const url = `${base}/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw formatHttpError('Anthropic', response.status, await response.text());
    }
    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Invalid response structure from Anthropic.');
    const parsed = parseJsonResponse(text);
    if (data.usage) {
      parsed.usage = {
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
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
      throw new Error('Anthropic API key is missing. Open the extension popup to add one.');
    }

    const base = trimBaseUrl(settings.baseUrl || ANTHROPIC_DEFAULT_BASE_URL);
    const response = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw formatHttpError('Anthropic', response.status, await response.text());
    }

    let usage: TokenUsage | undefined;
    for await (const line of readSseLines(requireBody(response.body))) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        onChunk(data.delta.text);
      } else if (data.type === 'message_start' && data.message?.usage) {
        usage = { inputTokens: data.message.usage.input_tokens ?? 0, outputTokens: 0 };
      } else if (data.type === 'message_delta' && data.usage) {
        if (usage) usage.outputTokens = data.usage.output_tokens ?? 0;
      }
    }
    return usage;
  },
};
