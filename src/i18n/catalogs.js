/**
 * One file of text per language, fetched when that language is first used. A visit in English never downloads the
 * Spanish text and the other way round (each is about 130 kB before compression). The service worker caches both
 * when it installs, so switching language works offline after that.
 *
 * A file that fails to download must be possible to fetch again. Chromium and Firefox fetch a failed module again
 * when it is imported again; Safari keeps the failure and answers every later import of that address with it, even
 * after a reload (WebKit bug 270357). So after a failure the next attempt imports the same file under a new address
 * (`?attempt=<n>`), and a failure at start-up is remembered for the reload the person is then offered.
 */
import { mergeCatalog } from './mergeCatalog.js';

/**
 * Which file a language code reads. Peruvian Spanish is the maintained Spanish catalogue, so every Spanish locale
 * (a browser set to `es`, `es-MX`, `es_ES`) reads it until a separate neutral-Spanish one is complete and reviewed.
 * Everything else reads English, the source catalogue.
 */
export const catalogFor = (language) => (/^es(?:[-_]|$)/i.test(String(language ?? '')) ? 'es-PE' : 'en');

/** Remembers, for this tab, which languages failed to download, so the reload offered at start-up does not repeat it. */
export const FAILED_KEY = 'gylio:catalog-failed';

const sessionMemory = () => {
  const store = () => window.sessionStorage;
  const read = () => {
    try {
      return JSON.parse(store().getItem(FAILED_KEY) ?? '{}') ?? {};
    } catch {
      return {};
    }
  };
  const write = (failed) => {
    try {
      if (Object.keys(failed).length) store().setItem(FAILED_KEY, JSON.stringify(failed));
      else store().removeItem(FAILED_KEY);
    } catch {
      // Storage refused: the failure is remembered for this page only.
    }
  };
  return { read, write };
};

/**
 * @param {object} options
 * @param {Record<string, () => Promise<{ default: { base: object, features: object } }>>} options.loaders The files as the bundler knows them.
 * @param {Record<string, string> | null} options.addresses Each file's address in the build; none in development and tests,
 *   where a failed file is simply imported again.
 * @param {(address: string) => Promise<{ default: { base: object, features: object } }>} options.importAddress
 * @param {{ read: () => Record<string, number>, write: (failed: Record<string, number>) => void }} options.memory
 */
export const createCatalogLoader = ({ loaders, addresses, importAddress, memory }) => {
  /** Text already downloaded, by catalogue: asked for again, it is not fetched again. */
  const loaded = {};
  const failed = { ...memory.read() };

  const fetchFile = (code) => {
    const attempt = failed[code] ?? 0;
    return attempt > 0 && addresses?.[code] ? importAddress(`${addresses[code]}?attempt=${attempt}`) : loaders[code]();
  };

  return (language) => {
    const code = catalogFor(language);
    if (!loaded[code]) {
      loaded[code] = fetchFile(code).then(
        (module) => {
          if (failed[code]) {
            delete failed[code];
            memory.write(failed);
          }
          return mergeCatalog(module.default.base, module.default.features);
        },
        (error) => {
          delete loaded[code];
          failed[code] = (failed[code] ?? 0) + 1;
          memory.write(failed);
          throw error;
        },
      );
    }
    return loaded[code];
  };
};

/**
 * Filled in by the build (vite.config.ts, catalogAddresses) with each file's final address. Left as it is in
 * development and tests, where it is not defined.
 */
// eslint-disable-next-line no-undef
const builtAddresses = typeof __GYLIO_CATALOG_ADDRESSES__ === 'undefined' ? null : __GYLIO_CATALOG_ADDRESSES__;

/** The text for a language. Rejects when its file cannot be fetched (no connection and not cached yet). */
export const loadCatalog = createCatalogLoader({
  loaders: {
    en: () => import('./catalog.en.js'),
    'es-PE': () => import('./catalog.es-PE.js'),
  },
  addresses: builtAddresses,
  importAddress: (address) => import(/* @vite-ignore */ address),
  memory: typeof window === 'undefined' ? { read: () => ({}), write: () => undefined } : sessionMemory(),
});
