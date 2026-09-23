/**
 * Content Security Policy for the built site (injected as a <meta> tag by the
 * Vite build, see vite.config.ts; the dev server is left alone because its
 * hot-reload client needs inline scripts and websockets).
 *
 * connect-src is the important part: the page may only talk to itself, the
 * LLM providers the app knows, and localhost (Ollama, LM Studio). Even an
 * injected script could not send a CV or an API key anywhere else.
 */
export const CONNECT_SRC = [
  "'self'",
  // Google Gemini
  'https://generativelanguage.googleapis.com',
  // OpenAI-compatible APIs suggested in Settings and the README
  'https://api.groq.com',
  'https://openrouter.ai',
  'https://api.openai.com',
  'https://api.mistral.ai',
  'https://api.together.xyz',
  'https://api.deepseek.com',
  // Local models: Ollama (11434), LM Studio (1234), vLLM…
  'http://localhost:*',
  'http://127.0.0.1:*',
] as const;

/** `scriptHashes` are the 'sha256-…' sources of the inline scripts in index.html. */
export function contentSecurityPolicy(scriptHashes: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    // pdf.js runs in a worker loaded from our own origin.
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src ${CONNECT_SRC.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** 'sha256-…' CSP sources for every inline (src-less) <script> in an HTML document. */
export async function inlineScriptHashes(html: string): Promise<string[]> {
  const { createHash } = await import('node:crypto');
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1]!, 'utf8').digest('base64')}'`,
  );
}
