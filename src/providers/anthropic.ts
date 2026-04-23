import { parseJsonResponse, trimBaseUrl, type Provider, type ProviderSettings } from './types';

export const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_MODEL_OPTIONS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const SYSTEM_PROMPT = 'You must respond with a single valid JSON object matching the requested shape. Do not include prose, code fences, or explanatory text — only the JSON object itself.';

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
      const errText = await response.text();
      throw new Error(`Anthropic error (${response.status}): ${errText.substring(0, 200)}`);
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
};
