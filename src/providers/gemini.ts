import { postJson } from './http';
import { ProviderError, type CompletionRequest, type LlmClient } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

export function geminiRequestBody(req: CompletionRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: req.prompt.system }] },
    contents: req.prompt.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseJsonSchema: req.jsonSchema,
    },
  };
}

/**
 * Google Gemini through the Generative Language REST API (generateContent),
 * called straight from the browser. Structured output is requested with
 * responseMimeType + responseJsonSchema; zod still validates the result.
 */
export function geminiClient(apiKey: string, model: string): LlmClient {
  return {
    id: 'gemini',
    model,
    async complete(req: CompletionRequest) {
      if (!apiKey) throw new ProviderError('Add a Gemini API key in Settings (free at aistudio.google.com).');
      const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent`;
      const data = (await postJson(url, geminiRequestBody(req), { 'x-goog-api-key': apiKey }, req.signal)) as GeminiResponse;
      if (data.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the request (${data.promptFeedback.blockReason}).`);
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
      if (!text) throw new ProviderError(`Gemini returned no text (finish reason: ${data.candidates?.[0]?.finishReason ?? 'unknown'}).`);
      return text;
    },
  };
}
