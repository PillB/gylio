import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the app build (@vitejs/plugin-react): automatic JSX runtime, so .jsx
  // components that do not import React can be rendered in tests.
  esbuild: { jsx: 'automatic' },
  // Same shim the app build uses (vite.config.ts): useTasks lazy-imports expo-notifications.
  resolve: {
    alias: { 'expo-notifications': path.resolve(__dirname, 'src/shims/expo-notifications.ts') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
