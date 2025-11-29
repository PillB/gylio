import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite configuration for GYLIO
// - Enables React support
// - Maps 'react-native' imports to 'react-native-web' so that React Native components can run in the browser
// - Configures Vite to allow serving files from the parent directory (docs, assets)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react-native-web/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(__dirname, 'src/shims/codegenNativeComponent.js')
      },
      {
        find: 'react-native/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(__dirname, 'src/shims/codegenNativeComponent.js')
      },
      {
        find: '@react-native/assets-registry/registry',
        replacement: path.resolve(__dirname, 'src/shims/assets-registry.js')
      },
      { find: 'react-native', replacement: 'react-native-web' },
      {
        find: 'expo-notifications',
        replacement: path.resolve(__dirname, 'src/shims/expo-notifications.ts')
      }
    ]
  },
  server: {
    fs: {
      // Permit importing local files outside root (e.g. docs) during development
      allow: ['..']
    }
  }
});