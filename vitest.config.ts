import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the app build (@vitejs/plugin-react): automatic JSX runtime, so .jsx
  // components that do not import React can be rendered in tests.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
