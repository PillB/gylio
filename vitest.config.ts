import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the app build (@vitejs/plugin-react): JSX needs no `import React`.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
