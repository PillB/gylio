import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredBase = (process.env.VITE_BASE_PATH || '/gylio/').trim();
const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;

/**
 * Vite serves files from public/ at the origin root during development, while
 * the built artifact is mounted beneath `base` by static hosts such as GitHub
 * Pages. The product footer intentionally uses BASE_URL so its URL is correct
 * after build. This tiny development-only bridge makes the same URL work in
 * local/Playwright development without coupling the standalone guide to React.
 */
const deploymentGuidePublicBaseBridge = () => ({
  name: 'deployment-guide-public-base-bridge',
  configureServer(server) {
    if (base === '/') return;
    const basedGuidePath = `${base}deployment-guide.html`.replace(/\/{2,}/g, '/');
    server.middlewares.use((req, _res, next) => {
      if (!req.url) return next();
      const [pathname, query] = req.url.split('?', 2);
      if (pathname === basedGuidePath) {
        req.url = `/deployment-guide.html${query ? `?${query}` : ''}`;
      }
      next();
    });
  },
});

// Vite configuration for GYLIO
// - Enables React support
// - Maps react-native imports to react-native-web
// - Uses VITE_BASE_PATH so the same build can target GitHub Pages (/gylio/)
//   or a root-hosted production SPA (/)
export default defineConfig({
  base,
  plugins: [react(), deploymentGuidePublicBaseBridge()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'service-worker': path.resolve(__dirname, 'src/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        manualChunks: (id) => {
          // react-i18next imports React. Keeping those modules in separate forced
          // chunks created a vendor-react -> vendor-i18n -> vendor-react cycle.
          // Group the React adapter with React and leave framework-agnostic
          // i18next in its own cacheable chunk.
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-i18next')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-native-web') || id.includes('node_modules/react-native-paper')) {
            return 'vendor-rnw';
          }
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/i18next')) {
            return 'vendor-i18n';
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '/gylio/',
        replacement: `${path.resolve(__dirname, '.')}/`,
      },
      {
        find: 'react-native-web/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(__dirname, 'src/shims/codegenNativeComponent.js'),
      },
      {
        find: 'react-native/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(__dirname, 'src/shims/codegenNativeComponent.js'),
      },
      {
        find: '@react-native/assets-registry/registry',
        replacement: path.resolve(__dirname, 'src/shims/assets-registry.js'),
      },
      { find: 'react-native', replacement: 'react-native-web' },
      {
        find: 'expo-notifications',
        replacement: path.resolve(__dirname, 'src/shims/expo-notifications.ts'),
      },
      {
        find: 'expo-speech',
        replacement: path.resolve(__dirname, 'src/shims/expo-speech.ts'),
      },
      {
        find: 'expo-av',
        replacement: path.resolve(__dirname, 'src/shims/expo-av.ts'),
      },
      {
        find: 'expo-sqlite',
        replacement: path.resolve(__dirname, 'src/shims/expo-sqlite.ts'),
      },
      {
        find: 'react-native-safe-area-context',
        replacement: path.resolve(__dirname, 'src/shims/react-native-safe-area-context.js'),
      },
      {
        find: 'expo-modules-core',
        replacement: path.resolve(__dirname, 'src/shims/expo-modules-core.ts'),
      },
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
    exclude: [
      'expo-speech',
      'expo-av',
      'expo-sqlite',
      'expo-notifications',
      'expo-router',
    ],
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Backend not running: offline-first UI can continue locally.
          });
        },
      },
    },
  },
});
