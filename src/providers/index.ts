import { geminiProvider } from './gemini';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { ollamaProvider } from './ollama';
import type { Provider, ProviderId } from './types';

export * from './types';
export { geminiProvider, openaiProvider, anthropicProvider, ollamaProvider };

export const PROVIDERS: Record<ProviderId, Provider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  ollama: ollamaProvider,
};

export const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'anthropic', 'ollama'];

export function getProvider(id: string): Provider {
  const p = PROVIDERS[id as ProviderId];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function isProviderId(id: unknown): id is ProviderId {
  return typeof id === 'string' && id in PROVIDERS;
}
