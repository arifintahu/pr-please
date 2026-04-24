import type { ProviderId } from './providers/types';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface Prices {
  input: number; // USD per 1M tokens
  output: number;
}

// Static price table — prices drift; treat as estimates only.
const MODEL_PRICES: Partial<Record<string, Prices>> = {
  // Gemini
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.5-flash-lite': { input: 0.015, output: 0.06 },
  // OpenAI (estimates — may drift)
  'gpt-5.4': { input: 2.0, output: 8.0 },
  'gpt-5.4-mini': { input: 0.3, output: 1.2 },
  'gpt-5.4-nano': { input: 0.08, output: 0.32 },
  // Anthropic
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
};

const PROVIDER_DEFAULTS: Record<ProviderId, Prices | null> = {
  gemini: { input: 0.075, output: 0.3 },
  openai: { input: 0.3, output: 1.2 },
  anthropic: { input: 3.0, output: 15.0 },
  ollama: null, // local — no cost
};

function fmt(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function estimateCost(usage: TokenUsage, provider: ProviderId, model: string): string {
  const prices = MODEL_PRICES[model] ?? PROVIDER_DEFAULTS[provider];
  const tokenLine = `${fmt(usage.inputTokens)} in / ${fmt(usage.outputTokens)} out`;
  if (!prices) return tokenLine; // Ollama or unknown
  const cost =
    (usage.inputTokens / 1_000_000) * prices.input +
    (usage.outputTokens / 1_000_000) * prices.output;
  return `~ $${cost.toFixed(4)} · ${tokenLine}`;
}
