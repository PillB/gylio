import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredBase = (process.env.VITE_BASE_PATH || '/gylio/').trim();
const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;

/**
 * Vite serves public/ files from the origin root during development, while
 * GitHub Pages mounts the built dist directory beneath the repository base.
 * The footer intentionally points to `${base}deployment-guide.html` so the
 * deployed URL is correct. During development/Playwright, serve that same
 * based URL directly from public/ before Vite's SPA fallback handles it.
 */
const deploymentGuidePublicBaseBridge = () => ({
  name: 'deployment-guide-public-base-bridge',
  configureServer(server) {
    if (base === '/') return;

    const basedGuidePath = `${base}deployment-guide.html`.replace(/\/{2,}/g, '/');
    const guideFile = path.resolve(__dirname, 'public', 'deployment-guide.html');

    server.middlewares.use((req, res, next) => {
      if (!req.url) return next();
      const pathname = req.url.split('?', 1)[0];
      if (pathname !== basedGuidePath) return next();

      try {
        const html = fs.readFileSync(guideFile, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(html);
      } catch (error) {
        next(error);
      }
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
