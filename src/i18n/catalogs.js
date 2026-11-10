/**
 * One file of text per language, fetched when that language is first used. A visit in English never downloads the
 * Spanish text and the other way round (each is about 130 kB before compression). The service worker caches both
 * when it installs, so switching language works offline after that.
 */
const loaders = {
  en: () => import('./catalog.en.js'),
  'es-PE': () => import('./catalog.es-PE.js'),
};

/**
 * Which file a language code reads. Peruvian Spanish is the maintained Spanish catalogue, so every Spanish locale
 * (a browser set to `es`, `es-MX`, `es_ES`) reads it until a separate neutral-Spanish one is complete and reviewed.
 * Everything else reads English, the source catalogue.
 */
export const catalogFor = (language) => (/^es(?:[-_]|$)/i.test(String(language ?? '')) ? 'es-PE' : 'en');

/** The text for a language. Rejects when its file cannot be fetched (no connection and not cached yet). */
export const loadCatalog = (language) => loaders[catalogFor(language)]().then((module) => module.default);
