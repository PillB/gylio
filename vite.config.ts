import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildCsp } from './csp.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredBase = (process.env.VITE_BASE_PATH || '/gylio/').trim();
const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;

/** Fills the CSP meta tag from the build's own environment (see csp.config.js). */
const contentSecurityPolicy = () => {
  let env: Record<string, string> = {};
  return {
    name: 'gylio-content-security-policy',
    configResolved(config) {
      env = config.env;
    },
    transformIndexHtml(html: string) {
      const csp = buildCsp({
        apiBaseUrl: env.VITE_API_BASE_URL,
        clerkPublishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
        adsense: env.VITE_ADS_PROVIDER === 'adsense',
      });
      return html.replace('__GYLIO_CSP__', csp);
    },
  };
};

/**
 * Writes precache.json: every file the build emits, for the service worker to cache at install, so an
 * installed app opens offline on any screen, not only the ones visited while online. The worker used to read
 * manifest.json, which is the web app manifest (name, icons), not a file list, so it cached no scripts at all.
 */
const PRECACHE_FILE = 'precache.json';
const PRECACHEABLE = /\.(js|css|html|svg|png|woff2?)$/;

const precacheList = () => ({
  name: 'gylio-precache-list',
  apply: 'build' as const,
  enforce: 'post' as const,
  generateBundle(_options: unknown, bundle: Record<string, { fileName: string }>) {
    const files = Object.values(bundle)
      .map((output) => output.fileName)
      .filter((file) => PRECACHEABLE.test(file) && file !== 'service-worker.js' && !file.startsWith('.vite/'))
      .sort();
    (this as unknown as { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void }).emitFile({
      type: 'asset',
      fileName: PRECACHE_FILE,
      source: JSON.stringify(files),
    });
  },
});

// Vite configuration for GYLIO
// - Enables React support
// - Maps react-native imports to react-native-web
// - Uses VITE_BASE_PATH so the same build can target GitHub Pages (/gylio/)
//   or a root-hosted production SPA (/)
// - Fails a production build when the Clerk publishable key is missing
export default defineConfig(({ mode }) => {
  // The Clerk key is mandatory for the root-hosted production SPA, but the
  // GitHub Pages build is a deliberately keyless static preview (pages.yml sets
  // only VITE_BASE_PATH), so requiring it there would break that deployment.
  if (mode === 'production' && base === '/' && !process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      '[build] VITE_CLERK_PUBLISHABLE_KEY is required for root-hosted production builds. ' +
      'Set it in your CI environment or .env.local file.'
    );
  }
  if (mode === 'production' && !process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    console.warn(
      `[build] VITE_CLERK_PUBLISHABLE_KEY is not set; building ${base} without authentication.`
    );
  }

  return {
  base,
  // The Cloudflare deploy (worker/scripts/setup.sh) points this at an empty folder and pins every VITE_ setting
  // itself, so a stray .env file on the Mac that deploys cannot change what ships.
  envDir: process.env.GYLIO_ENV_DIR || undefined,
  plugins: [react(), contentSecurityPolicy(), precacheList()],
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
  };
});
