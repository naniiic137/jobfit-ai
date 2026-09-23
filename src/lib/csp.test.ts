import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONNECT_SRC, contentSecurityPolicy, inlineScriptHashes } from './csp';
import { DEFAULT_SETTINGS } from '../providers/types';

describe('Content Security Policy', () => {
  it('allows the default provider hosts and localhost (Ollama), nothing else', () => {
    const allowed = (url: string) => {
      const u = new URL(url);
      return CONNECT_SRC.some((src) => src === `${u.protocol}//${u.host}` || (src.endsWith(':*') && src.slice(0, -2) === `${u.protocol}//${u.hostname}`));
    };
    expect(allowed('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent')).toBe(true);
    expect(allowed(DEFAULT_SETTINGS.openai.baseUrl)).toBe(true);
    expect(allowed(DEFAULT_SETTINGS.ollama.baseUrl)).toBe(true);
    expect(allowed('https://evil.example.com/collect')).toBe(false);
  });

  it('hashes the inline theme script of index.html so it may run, and nothing else inline', async () => {
    const html = readFileSync('index.html', 'utf8');
    const hashes = await inlineScriptHashes(html);
    expect(hashes).toHaveLength(1);
    expect(hashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    const policy = contentSecurityPolicy(hashes);
    expect(policy).toContain(`script-src 'self' ${hashes[0]}`);
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(policy).toContain("object-src 'none'");
    // Fonts are self-hosted: no Google Fonts in the page.
    expect(html).not.toContain('fonts.googleapis.com');
  });
});
