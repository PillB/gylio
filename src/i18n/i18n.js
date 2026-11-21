import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { loadCatalog } from './catalogs.js';
import { detection, fallbackLng, supportedLngs } from './detection.js';

/**
 * Production localization configuration.
 *
 * Shipping locales must pass translation-key parity, interpolation-placeholder
 * parity, browser-layout tests and human review before they are exposed in the
 * language selector. Only reviewed catalogs live in src/i18n (claims.test.ts
 * checks this); a new language starts from the current English catalog.
 *
 * English is the source/fallback catalog. Peruvian Spanish is the maintained
 * Spanish catalog. A generic browser locale of `es` intentionally resolves to
 * the same Peruvian-Spanish catalog until a separate neutral-Spanish catalog
 * is complete and reviewed.
 *
 * Each language's text is its own file, fetched when the language is first used (catalogs.js); this module holds
 * no text, so it can start before any of it has arrived. `ready` says when the first language is in.
 */

/** i18next asks this for a language's text: at start-up for the detected language, later when another is chosen. */
const catalogBackend = {
  type: 'backend',
  init() {},
  read(language, _namespace, done) {
    if (!supportedLngs.includes(language)) {
      done(null, {});
      return;
    }
    loadCatalog(language).then((catalog) => done(null, catalog), (error) => done(error, null));
  },
};

const canonicalDocumentLanguage = (language) => {
  if (!language) return 'en';
  const normalized = String(language).replace('_', '-');
  if (normalized === 'es' || normalized.toLowerCase().startsWith('es-')) return 'es-PE';
  return normalized;
};

const syncDocumentLanguage = (language) => {
  if (typeof document === 'undefined') return;
  const resolved = canonicalDocumentLanguage(i18n.resolvedLanguage || language || 'en');
  document.documentElement.lang = resolved;
  document.documentElement.dir = i18n.dir(resolved);
};

i18n
  .use(catalogBackend)
  .use(LanguageDetector)
  .use(initReactI18next);

const initialization = i18n.init({
  // Explicit user choice wins; browser locale is only the first-visit default (detection.js).
  detection,
  fallbackLng,
  supportedLngs,
  nonExplicitSupportedLngs: true,

  interpolation: {
    escapeValue: false, // React escapes rendered text.
  },

  // Never let an empty translation erase a visible label/control. CI catches
  // missing keys before deployment; development also reports them explicitly.
  returnEmptyString: false,
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lngs, ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing key: ${ns}:${key} for [${lngs.join(', ')}]`);
    }
  },
});

i18n.on('languageChanged', syncDocumentLanguage);

/**
 * Settles when the first language has been fetched: the app is drawn after this, so no screen shows keys in place
 * of text. Rejects when that file could not be fetched, which index.jsx answers with a page that offers a reload.
 */
export const ready = initialization.then(() => {
  if (!i18n.resolvedLanguage) throw new Error('[i18n] the text for the first language could not be loaded');
  syncDocumentLanguage(i18n.resolvedLanguage);
});
// Whoever waits on `ready` still sees the failure; this only keeps a failure nobody is waiting on yet from being
// reported as an unhandled rejection.
ready.catch(() => undefined);

/**
 * Change language once its text has arrived. Rejects, leaving the language as it was, when the file cannot be
 * fetched; calling i18next directly would switch anyway and show keys.
 */
export const switchLanguage = async (language) => {
  await loadCatalog(language);
  await i18n.changeLanguage(language);
};

export default i18n;
