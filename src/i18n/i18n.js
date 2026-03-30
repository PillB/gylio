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
 * i18n configuration — game-dev-style best practices:
 *
 * 1. English loads first as the authoritative source (fallback chain).
 * 2. User's explicit choice (localStorage) takes priority over browser locale.
 * 3. Fallback chain: es-PE → es → en, so adding es-MX later auto-inherits Spanish.
 * 4. Missing keys in dev → console.warn; in prod → empty string (never leaks raw keys to users).
 * 5. Language key is namespaced to 'gylio_lang' to avoid conflicts with other apps.
 */

const resources = {
  en:      { translation: en },
  'es-PE': { translation: esPE },
  de:      { translation: de },
  fr:      { translation: fr },
  it:      { translation: it },
  zh:      { translation: zh },
  sw:      { translation: sw },
  hi:      { translation: hi },
  id:      { translation: id },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,

    // Detection order: explicit user choice (localStorage) wins over browser default.
    // This is the #1 i18n bug in web apps — navigator fires first and overwrites
    // the user's stored preference on every return visit.
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'gylio_lang', // namespaced key
    },

    // Fallback chain: specific locale → base language → English.
    // Enables future es-MX to inherit es translations automatically.
    fallbackLng: {
      'es-PE': ['es', 'en'],
      'es':    ['en'],
      'de':    ['en'],
      'fr':    ['en'],
      'it':    ['en'],
      'zh':    ['en'],
      'sw':    ['en'],
      'hi':    ['en'],
      'id':    ['en'],
      default: ['en'],
    },

    supportedLngs: ['en', 'es', 'es-PE', 'de', 'fr', 'it', 'zh', 'sw', 'hi', 'id'],
    // Allow es-XX variants to match the base 'es' entries
    nonExplicitSupportedLngs: true,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Surface missing translation keys during development.
    // In production: return empty string so raw key paths never reach users.
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key: ${ns}:${key} for [${lngs.join(', ')}]`);
      }
    },
    parseMissingKeyHandler: () => '',
  });

export default i18n;
