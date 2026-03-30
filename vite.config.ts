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
// - Sets base for GitHub Pages deployment
export default defineConfig({
  base: '/gylio/',
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'service-worker': path.resolve(__dirname, 'src/service-worker.ts')
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        manualChunks: (id) => {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-native-web') || id.includes('node_modules/react-native-paper')) {
            return 'vendor-rnw';
          }
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
        }
      }
    }
  },
  resolve: {
    alias: [
      {
        find: '/gylio/',
        replacement: `${path.resolve(__dirname, '.')}/`
      },
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
      },
      {
        find: 'expo-speech',
        replacement: path.resolve(__dirname, 'src/shims/expo-speech.ts')
      },
      {
        find: 'expo-av',
        replacement: path.resolve(__dirname, 'src/shims/expo-av.ts')
      },
      {
        find: 'expo-sqlite',
        replacement: path.resolve(__dirname, 'src/shims/expo-sqlite.ts')
      },
      {
        find: 'react-native-safe-area-context',
        replacement: path.resolve(__dirname, 'src/shims/react-native-safe-area-context.js')
      },
      {
        find: 'expo-modules-core',
        replacement: path.resolve(__dirname, 'src/shims/expo-modules-core.ts')
      }
    ]
  },
  optimizeDeps: {
    // @expo/vector-icons ships .js files containing JSX; tell esbuild to treat them as jsx
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    },
    // Exclude expo native packages from pre-bundling: they contain native bindings
    // (TurboModuleRegistry) that esbuild cannot resolve against react-native-web.
    // The Vite aliases above route their web imports to browser shims at transform time.
    exclude: [
      'expo-speech',
      'expo-av',
      'expo-sqlite',
      'expo-notifications',
      'expo-router',
    ]
  },
  server: {
    fs: {
      // Permit importing local files outside root (e.g. docs) during development
      allow: ['..']
    },
    proxy: {
      // Proxy /api requests to the Express backend when it is running locally.
      // This prevents 404 noise in the browser console during development when
      // the backend is not yet started. Requests silently fail at the target
      // instead of hitting the Vite dev server.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Backend not running – suppress the proxy error from the console.
          });
        }
      }
    }
  }
});
