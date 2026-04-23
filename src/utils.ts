export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
export const LOCALHOST_BASE_URL = 'http://127.0.0.1:8045';
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const GITHUB_REPO = 'arifintahu/pr-please';

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
