export const DEFAULT_SERVICE_URL = 'http://localhost:3000';
export const DEFAULT_LOCAL_BASE_URL = 'https://generativelanguage.googleapis.com';
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MODEL_OPTIONS = [
  'gemini-3-flash',
  'gemini-3-flash-lite',
  'gemini-3-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
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
