import { ProviderError } from './types';

/** fetch + JSON with readable errors (CORS and network failures surface as a TypeError). */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal?: AbortSignal,
  hint?: string,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      /* keep url */
    }
    throw new ProviderError(`Could not reach ${host}. Check the URL, your connection, or CORS settings.`, undefined, hint);
  }
  const text = await res.text();
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
