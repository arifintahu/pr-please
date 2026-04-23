import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseJsonResponse, trimBaseUrl, type Provider, type ProviderSettings } from './types';

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
};
