import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import esPE from './es-PE.json';
import tasksEn from './tasks.en.json';
import tasksEsPE from './tasks.es-PE.json';

/**
 * Production localization configuration.
 *
 * Shipping locales must pass translation-key parity, interpolation-placeholder
 * parity, browser-layout tests and human review before they are exposed in the
 * language selector. Additional draft catalogs may remain in src/i18n without
 * being advertised as production-ready.
 *
 * English is the source/fallback catalog. Peruvian Spanish is the maintained
 * Spanish catalog. A generic browser locale of `es` intentionally resolves to
 * the same Peruvian-Spanish catalog until a separate neutral-Spanish catalog
 * is complete and reviewed.
 *
 * Feature-scoped catalogs are merged over the legacy monolith so new copy can
 * evolve in small, reviewable files without rewriting very large JSON blobs.
 */

const enCatalog = {
  ...en,
  tasks: {
    ...en.tasks,
    ...tasksEn,
  },
};

const esPECatalog = {
  ...esPE,
  tasks: {
    ...esPE.tasks,
    ...tasksEsPE,
  },
};

const resources = {
  en:      { translation: enCatalog },
  es:      { translation: esPECatalog },
  'es-PE': { translation: esPECatalog },
};

const supportedLngs = ['en', 'es', 'es-PE'];

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
  .use(LanguageDetector)
  .use(initReactI18next);

const initialization = i18n.init({
  resources,

  detection: {
    // Explicit user choice wins; browser locale is only the first-visit default.
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    lookupLocalStorage: 'gylio_lang',
  },

  fallbackLng: 'en',
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
void initialization.then(() => syncDocumentLanguage(i18n.resolvedLanguage));

export default i18n;
