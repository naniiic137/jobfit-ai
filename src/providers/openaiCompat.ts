import { postJson } from './http';
import { ProviderError, type CompletionRequest, type LlmClient } from './types';

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
}

/** Endpoints (base URL + model) that rejected `json_schema`; they get `json_object` from then on. */
const NO_JSON_SCHEMA = new Set<string>();

/**
 * Any OpenAI-compatible Chat Completions endpoint (Groq, OpenRouter, LM Studio,
 * vLLM, OpenAI itself). Asks for structured output with the exact JSON Schema
 * (`response_format: json_schema`) and, if the endpoint or model rejects it
 * with a 400/422, falls back to plain JSON mode (`json_object`). Either way
 * zod validates the answer afterwards.
 */
export function openAiCompatClient(baseUrl: string, apiKey: string, model: string): LlmClient {
  const root = baseUrl.replace(/\/+$/, '');
  const key = `${root}|${model}`;
  return {
    id: 'openai',
    model,
    async complete({ prompt, jsonSchema, signal }: CompletionRequest) {
      const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      const call = (responseFormat: Record<string, unknown>) =>
        postJson(
          `${root}/chat/completions`,
          {
            model,
            temperature: 0.4,
            response_format: responseFormat,
            messages: [{ role: 'system', content: prompt.system }, ...prompt.messages],
          },
          { headers, signal },
        ) as Promise<ChatCompletion>;

      let data: ChatCompletion;
      if (NO_JSON_SCHEMA.has(key)) {
        data = await call({ type: 'json_object' });
      } else {
        try {
          data = await call({ type: 'json_schema', json_schema: { name: 'jobfit_analysis', schema: jsonSchema, strict: false } });
        } catch (e) {
          if (!(e instanceof ProviderError) || (e.status !== 400 && e.status !== 422)) throw e;
          NO_JSON_SCHEMA.add(key);
          data = await call({ type: 'json_object' });
        }
      }
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) throw new ProviderError(`Empty completion (finish reason: ${data.choices?.[0]?.finish_reason ?? 'unknown'}).`);
      return text;
    },
  };
}
