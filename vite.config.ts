/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { contentSecurityPolicy, inlineScriptHashes } from './src/lib/csp.ts';

/**
 * Adds the Content-Security-Policy <meta> tag to the built index.html, with
 * the hash of every inline script (the theme bootstrap). Build only: the dev
 * server's hot reload needs inline scripts and websockets.
 */
function cspMeta(): Plugin {
  return {
    name: 'jobfit-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        const policy = contentSecurityPolicy(await inlineScriptHashes(html));
        return html.replace(/(<meta charset="[^"]*"\s*\/?>)/i, `$1\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      },
    },
  };
}

// Served from https://naniiic137.github.io/jobfit-ai/ on GitHub Pages.
export default defineConfig({
  base: '/jobfit-ai/',
  plugins: [react(), cspMeta()],
  server: { port: 5182, strictPort: true },
  preview: { port: 5182, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment.
    setupFiles: ['src/test/setup.ts'],
  },
});
