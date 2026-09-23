import { postJson } from './http';
import { OLLAMA_CORS_HINT, ProviderError, type CompletionRequest, type LlmClient } from './types';

export { OLLAMA_CORS_HINT };

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}


/**
 * A local model through Ollama's /api/chat endpoint. `format` accepts a JSON
 * Schema (structured outputs), which constrains generation to the expected shape.
 */
export function ollamaClient(baseUrl: string, model: string): LlmClient {
  const root = baseUrl.replace(/\/+$/, '');
  return {
    id: 'ollama',
    model,
    async complete({ prompt, jsonSchema, signal }: CompletionRequest) {
      const body = {
        model,
        stream: false,
        format: jsonSchema,
        options: { temperature: 0.3, num_ctx: 16384 },
        messages: [{ role: 'system', content: prompt.system }, ...prompt.messages],
      };
      const data = (await postJson(`${root}/api/chat`, body, { signal, hint: OLLAMA_CORS_HINT })) as OllamaChatResponse;
      if (data.error) throw new ProviderError(`Ollama: ${data.error}`);
      const text = data.message?.content ?? '';
      if (!text) throw new ProviderError('Ollama returned an empty message.');
      return text;
    },
  };
}
