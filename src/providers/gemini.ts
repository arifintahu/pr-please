import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseJsonResponse, readSseLines, trimBaseUrl, type Provider, type ProviderSettings, type TokenUsage } from './types';

export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
export const GEMINI_MODEL_OPTIONS = [
  'gemini-3.1-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-low',
  'gemini-3.1-pro-high',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

export const geminiProvider: Provider = {
  id: 'gemini',
  label: 'Google Gemini',
  defaultBaseUrl: GEMINI_DEFAULT_BASE_URL,
  defaultModel: GEMINI_DEFAULT_MODEL,
  modelOptions: GEMINI_MODEL_OPTIONS,
  requiresApiKey: true,

  async generate(prompt: string, settings: ProviderSettings) {
    if (!settings.apiKey) {
      throw new Error('Gemini API key is missing. Open the extension popup to add one.');
    }

    if (!settings.baseUrl || settings.baseUrl === GEMINI_DEFAULT_BASE_URL) {
      const genAI = new GoogleGenerativeAI(settings.apiKey);
      const jsonModel = genAI.getGenerativeModel({
        model: settings.model,
        generationConfig: { responseMimeType: 'application/json' } as any,
      });
      const result = await jsonModel.generateContent(prompt);
      const resp = await result.response;
      const parsed = parseJsonResponse(resp.text());
      const meta = (resp as any).usageMetadata;
      if (meta) {
        parsed.usage = {
          inputTokens: meta.promptTokenCount ?? 0,
          outputTokens: meta.candidatesTokenCount ?? 0,
        };
      }
      return parsed;
    }

    const url = `${trimBaseUrl(settings.baseUrl)}/v1beta/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini error (${response.status}): ${errText.substring(0, 200)}`);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Invalid response structure from Gemini.');
    const parsed = parseJsonResponse(text);
    const meta = data.usageMetadata;
    if (meta) {
      parsed.usage = {
        inputTokens: meta.promptTokenCount ?? 0,
        outputTokens: meta.candidatesTokenCount ?? 0,
      };
    }
    return parsed;
  },

  async stream(prompt: string, settings: ProviderSettings, onChunk: (text: string) => void): Promise<TokenUsage | undefined> {
    if (!settings.apiKey) {
      throw new Error('Gemini API key is missing. Open the extension popup to add one.');
    }

    if (!settings.baseUrl || settings.baseUrl === GEMINI_DEFAULT_BASE_URL) {
      const genAI = new GoogleGenerativeAI(settings.apiKey);
      const model = genAI.getGenerativeModel({ model: settings.model });
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) onChunk(text);
      }
      const response = await result.response;
      const meta = (response as any).usageMetadata;
      if (meta) {
        return { inputTokens: meta.promptTokenCount ?? 0, outputTokens: meta.candidatesTokenCount ?? 0 };
      }
      return undefined;
    }

    const url = `${trimBaseUrl(settings.baseUrl)}/v1beta/models/${settings.model}:streamGenerateContent?key=${encodeURIComponent(settings.apiKey)}&alt=sse`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini error (${response.status}): ${errText.substring(0, 200)}`);
    }

    let usage: TokenUsage | undefined;
    for await (const line of readSseLines(response.body!)) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) onChunk(text);
      if (data.usageMetadata) {
        usage = { inputTokens: data.usageMetadata.promptTokenCount ?? 0, outputTokens: data.usageMetadata.candidatesTokenCount ?? 0 };
      }
    }
    return usage;
  },
};
