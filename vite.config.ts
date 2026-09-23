/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://naniiic137.github.io/jobfit-ai/ on GitHub Pages.
export default defineConfig({
  base: '/jobfit-ai/',
  plugins: [react()],
  server: { port: 5182, strictPort: true },
  preview: { port: 5182, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment.
    setupFiles: ['src/test/setup.ts'],
  },
});
