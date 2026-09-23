import { postJson } from './http';
import { ProviderError, type CompletionRequest, type LlmClient } from './types';

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
}

/**
 * Any OpenAI-compatible Chat Completions endpoint (Groq, OpenRouter, LM Studio,
 * vLLM, OpenAI itself). Uses JSON mode (`response_format: json_object`), the
 * most widely supported option; the exact schema is enforced by zod afterwards.
 */
export function openAiCompatClient(baseUrl: string, apiKey: string, model: string): LlmClient {
  const root = baseUrl.replace(/\/+$/, '');
  return {
    id: 'openai',
    model,
    async complete({ prompt, signal }: CompletionRequest) {
      const body = {
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: prompt.system }, ...prompt.messages],
      };
      const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      const data = (await postJson(`${root}/chat/completions`, body, headers, signal)) as ChatCompletion;
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) throw new ProviderError(`Empty completion (finish reason: ${data.choices?.[0]?.finish_reason ?? 'unknown'}).`);
      return text;
    },
  };
}
