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

export type SettingsField = 'apiKey' | 'baseUrl' | 'model';
export type SettingsErrors = Partial<Record<SettingsField, string>>;

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** A server on this machine (LM Studio, llama.cpp…) usually needs no key. */
function isLocalUrl(s: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(new URL(s.trim()).hostname);
  } catch {
    return false;
  }
}

/**
 * What stops the selected provider from working, per field. Empty when the
 * settings can be used. Only the selected provider is checked.
 */
export function validateSettings(s: ProviderSettings): SettingsErrors {
  const e: SettingsErrors = {};
  switch (s.provider) {
    case 'offline':
      break;
    case 'gemini':
      if (!s.gemini.apiKey.trim()) e.apiKey = 'Gemini needs an API key. Get a free one at aistudio.google.com/apikey, or pick “Offline demo”.';
      if (!s.gemini.model.trim()) e.model = 'Enter a Gemini model name.';
      break;
    case 'ollama':
      if (!isHttpUrl(s.ollama.baseUrl)) e.baseUrl = 'Enter the Ollama address, e.g. http://localhost:11434.';
      if (!s.ollama.model.trim()) e.model = 'Enter the name of a model you have pulled.';
      break;
    case 'openai':
      if (!isHttpUrl(s.openai.baseUrl)) e.baseUrl = 'Enter a base URL starting with http:// or https://.';
      else if (!s.openai.apiKey.trim() && !isLocalUrl(s.openai.baseUrl))
        e.apiKey = 'This provider needs an API key. Only a local server (localhost) can run without one.';
      if (!s.openai.model.trim()) e.model = 'Enter a model name.';
      break;
  }
  return e;
}

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
