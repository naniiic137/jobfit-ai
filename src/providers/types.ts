import type { PromptBundle } from '../prompts/build';
import type { ProviderId } from '../types';

export interface ProviderSettings {
  provider: ProviderId;
  /** Keep API keys in localStorage across sessions (off by default: sessionStorage only). */
  rememberKeys: boolean;
  gemini: { apiKey: string; model: string };
  ollama: { baseUrl: string; model: string };
  openai: { baseUrl: string; apiKey: string; model: string };
}

export const DEFAULT_SETTINGS: ProviderSettings = {
  provider: 'offline',
  rememberKeys: false,
  // A free-tier Gemini model at the time of writing; editable in Settings.
  gemini: { apiKey: '', model: 'gemini-3.5-flash-lite' },
  ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.2' },
  // Groq's free tier exposes an OpenAI-compatible API.
  openai: { baseUrl: 'https://api.groq.com/openai/v1', apiKey: '', model: 'llama-3.3-70b-versatile' },
};

export const OLLAMA_CORS_HINT =
  'Ollama rejects browser requests from other origins by default. Restart it with OLLAMA_ORIGINS set, for example: OLLAMA_ORIGINS="https://naniiic137.github.io,http://localhost:5182" ollama serve';

export interface CompletionRequest {
  prompt: PromptBundle;
  /** JSON Schema of the expected answer, for providers that support constrained decoding. */
  jsonSchema: Record<string, unknown>;
  signal?: AbortSignal;
}

/** A provider only has to turn a prompt into raw text; parsing and validation are shared. */
export interface LlmClient {
  id: Exclude<ProviderId, 'offline'>;
  model: string;
  complete(req: CompletionRequest): Promise<string>;
}

export class ProviderError extends Error {
  readonly status: number | undefined;
  readonly hint: string | undefined;
  constructor(message: string, status?: number, hint?: string) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.hint = hint;
  }
}
