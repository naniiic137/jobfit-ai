import { ProviderError } from './types';

/** Free tiers and local models can be slow, but a request should never hang forever. */
export const REQUEST_TIMEOUT_MS = 90_000;

export interface PostOptions {
  headers?: Record<string, string>;
  /** The caller's signal (the Cancel button). */
  signal?: AbortSignal;
  /** Extra advice shown under network errors (e.g. Ollama's CORS setup). */
  hint?: string;
  timeoutMs?: number;
}

/** Abort when the caller cancels OR when the timeout fires, whichever comes first. */
function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout]);
  // Older browsers without AbortSignal.any.
  const ctrl = new AbortController();
  for (const s of [signal, timeout]) {
    if (s.aborted) ctrl.abort(s.reason);
    else s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** fetch + JSON with readable errors (CORS and network failures surface as a TypeError). */
export async function postJson(url: string, body: unknown, opts: PostOptions = {}): Promise<unknown> {
  const { headers = {}, signal, hint, timeoutMs = REQUEST_TIMEOUT_MS } = opts;
  const combined = withTimeout(signal, timeoutMs);
  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: combined,
    });
    text = await res.text();
  } catch (err) {
    // The user pressed Cancel: let the caller treat it as a silent abort.
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : err;
    if (combined.aborted) {
      throw new ProviderError(
        `The request to ${hostOf(url)} timed out after ${Math.round(timeoutMs / 1000)} s.`,
        undefined,
        'The model may be overloaded or too slow. Try again, pick a smaller or faster model, or switch to offline mode.',
      );
    }
    throw new ProviderError(`Could not reach ${hostOf(url)}. Check the URL, your connection, or CORS settings.`, undefined, hint);
  }
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      detail = typeof j.error === 'string' ? j.error : (j.error?.message ?? detail);
    } catch {
      /* keep raw text */
    }
    const auth = res.status === 401 || res.status === 403 ? ' Check your API key.' : '';
    const rate = res.status === 429 ? ' Rate limit reached: wait a minute and retry.' : '';
    throw new ProviderError(`HTTP ${res.status}: ${detail}${auth}${rate}`, res.status, hint);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ProviderError('The provider returned a non-JSON HTTP response.', res.status);
  }
}
