import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for GYLIO
// - Enables React support
// - Maps 'react-native' imports to 'react-native-web' so that React Native components can run in the browser
// - Configures Vite to allow serving files from the parent directory (docs, assets)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'expo-sqlite': '/src/core/shims/expo-sqlite-web'
    }
  },
  server: {
    fs: {
      // Permit importing local files outside root (e.g. docs) during development
      allow: ['..']
    }
  }
});