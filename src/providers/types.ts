export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface GenerationResult {
  title: string;
  description: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelOptions: string[];
  requiresApiKey: boolean;
  generate(prompt: string, settings: ProviderSettings): Promise<GenerationResult>;
}

export function parseJsonResponse(raw: string): GenerationResult {
  const jsonText = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
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
