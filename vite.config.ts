import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildCsp } from './csp.config.js';
import { staticLegalPage } from './src/features/legal/staticPage';

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

/** Emits privacy.html and terms.html (both languages) next to the app so the text is checkable in dist/. */
const emitLegalPages = () => ({
  name: 'gylio-emit-legal-pages',
  generateBundle() {
    const read = (file: string) => fs.readFileSync(path.resolve(__dirname, 'src/features/legal/content', file), 'utf-8');
    for (const doc of ['privacy', 'terms'] as const) {
      this.emitFile({
        type: 'asset',
        fileName: `${doc}.html`,
        source: staticLegalPage(doc, { es: read(`${doc}.es-PE.md`), en: read(`${doc}.en.md`) }, base),
      });
    }
  },
});

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

/**
 * Gives src/i18n/catalogs.js the final address of each language file. Safari answers a second import of a file
 * that failed to download with the same failure, even after a reload, so the loader fetches it again under a new
 * address (`?attempt=1`), and for that it needs the address the build gave the file.
 */
const CATALOG_LOADER = path.resolve(__dirname, 'src/i18n/catalogs.js');
const CATALOG_PLACEHOLDER =
  "typeof __GYLIO_CATALOG_ADDRESSES__ === 'undefined' ? null : __GYLIO_CATALOG_ADDRESSES__";

const catalogAddresses = () => {
  const references: Record<string, string> = {};
  return {
    name: 'gylio-catalog-addresses',
    apply: 'build' as const,
    buildStart(this: { emitFile: (file: { type: 'chunk'; id: string; name: string }) => string }) {
      for (const language of ['en', 'es-PE']) {
        references[language] = this.emitFile({
          type: 'chunk',
          id: path.resolve(__dirname, `src/i18n/catalog.${language}.js`),
          name: `catalog.${language}`,
        });
      }
    },
    transform(code: string, id: string) {
      if (id !== CATALOG_LOADER) return null;
      if (!code.includes(CATALOG_PLACEHOLDER)) throw new Error('[build] src/i18n/catalogs.js no longer has the catalogue address placeholder');
      const addresses = Object.entries(references)
        .map(([language, reference]) => `'${language}': import.meta.ROLLUP_FILE_URL_${reference}`)
        .join(', ');
      return { code: code.replace(CATALOG_PLACEHOLDER, `{ ${addresses} }`), map: null };
    },
  };
};

// Vite configuration for GYLIO
// - Enables React support
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
  plugins: [react(), contentSecurityPolicy(), emitLegalPages(), catalogAddresses(), precacheList()],
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
