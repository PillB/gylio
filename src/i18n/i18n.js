import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import esPE from './es-PE.json';
import de from './de.json';
import fr from './fr.json';
import it from './it.json';
import zh from './zh.json';
import sw from './sw.json';
import hi from './hi.json';
import id from './id.json';

/**
 * i18n configuration.
 *
 * Product localization policy:
 * - English is the source/fallback catalog.
 * - Peruvian Spanish is the maintained Spanish catalog.
 * - A generic browser locale of `es` intentionally resolves to the same
 *   Peruvian-Spanish catalog until a separate neutral-Spanish catalog exists.
 * - An explicit user choice stored in `gylio_lang` wins over browser locale.
 * - Runtime values are interpolated into complete translatable messages;
 *   sentence fragments should not be assembled in application code.
 * - CI checks catalog key and interpolation-placeholder parity so missing
 *   translations are caught before deployment.
 */

const resources = {
  en:      { translation: en },
  es:      { translation: esPE },
  'es-PE': { translation: esPE },
  de:      { translation: de },
  fr:      { translation: fr },
  it:      { translation: it },
  zh:      { translation: zh },
  sw:      { translation: sw },
  hi:      { translation: hi },
  id:      { translation: id },
};

const supportedLngs = ['en', 'es', 'es-PE', 'de', 'fr', 'it', 'zh', 'sw', 'hi', 'id'];

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
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    lookupLocalStorage: 'gylio_lang',
  },

  // Regional catalogs fall back to English. Generic `es` is intentionally
  // backed by the es-PE resource above, rather than silently falling to English.
  fallbackLng: {
    'es-PE': ['en'],
    es:      ['en'],
    de:      ['en'],
    fr:      ['en'],
    it:      ['en'],
    zh:      ['en'],
    sw:      ['en'],
    hi:      ['en'],
    id:      ['en'],
    default: ['en'],
  },

  supportedLngs,
  nonExplicitSupportedLngs: true,

  interpolation: {
    escapeValue: false, // React escapes rendered text.
  },

  // Empty translations must not erase labels or controls. Missing-key drift is
  // a CI failure; in development it is also surfaced in the console.
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
