import { PROVIDERS, isProviderId, type ProviderId } from './providers';

export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
export const LOCALHOST_BASE_URL = 'http://127.0.0.1:8045';
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const GITHUB_REPO = 'arifintahu/pr-please';
export const DEFAULT_PROVIDER: ProviderId = 'gemini';

export type ApiProvider = 'default' | 'localhost' | 'custom';

export function resolveProvider(baseUrl: string): ApiProvider {
  const trimmed = (baseUrl || '').trim().replace(/\/$/, '');
  if (!trimmed || trimmed === DEFAULT_BASE_URL) return 'default';
  if (trimmed === LOCALHOST_BASE_URL) return 'localhost';
  return 'custom';
}
export const MODEL_OPTIONS = [
  'gemini-3.1-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-low',
  'gemini-3.1-pro-high',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

export interface ProviderConfig {
  apiKeyEncoded: string;
  baseUrl: string;
  model: string;
}

export interface StoredSettings {
  provider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
}

function emptyConfigs(): Record<ProviderId, ProviderConfig> {
  return {
    gemini: { apiKeyEncoded: '', baseUrl: PROVIDERS.gemini.defaultBaseUrl, model: PROVIDERS.gemini.defaultModel },
    openai: { apiKeyEncoded: '', baseUrl: PROVIDERS.openai.defaultBaseUrl, model: PROVIDERS.openai.defaultModel },
    anthropic: { apiKeyEncoded: '', baseUrl: PROVIDERS.anthropic.defaultBaseUrl, model: PROVIDERS.anthropic.defaultModel },
    ollama: { apiKeyEncoded: '', baseUrl: PROVIDERS.ollama.defaultBaseUrl, model: PROVIDERS.ollama.defaultModel },
  };
}

export function loadSettings(): Promise<StoredSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['provider', 'providers', 'apiKeyEncoded', 'baseUrl', 'model'], (res) => {
      const configs = emptyConfigs();

      if (res.providers && typeof res.providers === 'object') {
        for (const id of Object.keys(configs) as ProviderId[]) {
          const stored = res.providers[id];
          if (stored) {
            configs[id] = {
              apiKeyEncoded: typeof stored.apiKeyEncoded === 'string' ? stored.apiKeyEncoded : '',
              baseUrl: typeof stored.baseUrl === 'string' && stored.baseUrl ? stored.baseUrl : configs[id].baseUrl,
              model: typeof stored.model === 'string' && stored.model ? stored.model : configs[id].model,
            };
          }
        }
      } else if (res.apiKeyEncoded || res.baseUrl || res.model) {
        // Legacy single-provider settings — migrate to gemini config.
        configs.gemini = {
          apiKeyEncoded: typeof res.apiKeyEncoded === 'string' ? res.apiKeyEncoded : '',
          baseUrl: typeof res.baseUrl === 'string' && res.baseUrl ? res.baseUrl : configs.gemini.baseUrl,
          model: typeof res.model === 'string' && res.model ? res.model : configs.gemini.model,
        };
      }

      const provider = isProviderId(res.provider) ? res.provider : DEFAULT_PROVIDER;
      resolve({ provider, providers: configs });
    });
  });
}

export function saveSettings(settings: StoredSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { provider: settings.provider, providers: settings.providers },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      },
    );
  });
}

export const OBFUSCATION_KEY = 'PrPlease2024ExtKey';

export function obfuscateApiKey(plaintext: string): string {
  const bytes = new TextEncoder().encode(plaintext);
  const key = new TextEncoder().encode(OBFUSCATION_KEY);
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ key[i % key.length];
  }
  return btoa(String.fromCharCode(...result));
}

export function deobfuscateApiKey(encoded: string): string {
  try {
    const decoded = atob(encoded);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    const key = new TextEncoder().encode(OBFUSCATION_KEY);
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ key[i % key.length];
    }
    return new TextDecoder().decode(result);
  } catch {
    return '';
  }
}
