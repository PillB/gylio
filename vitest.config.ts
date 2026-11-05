import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the app build (@vitejs/plugin-react): automatic JSX runtime, so .jsx
  // components that do not import React can be rendered in tests.
  esbuild: { jsx: 'automatic' },
  // Same shims the app build uses (vite.config.ts): useTasks lazy-imports expo-notifications, the database
  // module (src/core/db.ts) opens expo-sqlite, which on the web is a localStorage-backed stand-in, and read-aloud
  // (useAccessibility) lazy-imports expo-av and expo-speech.
  resolve: {
    alias: {
      'expo-notifications': path.resolve(__dirname, 'src/shims/expo-notifications.ts'),
      'expo-sqlite': path.resolve(__dirname, 'src/shims/expo-sqlite.ts'),
      'expo-av': path.resolve(__dirname, 'src/shims/expo-av.ts'),
      'expo-speech': path.resolve(__dirname, 'src/shims/expo-speech.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
