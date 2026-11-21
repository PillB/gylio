import { catalogFor } from './catalogs.js';

/**
 * How the first language is chosen, shared by i18n.js and by the build, which starts that language's file
 * downloading from index.html before the app's code has arrived (vite.config.ts, languagePreload).
 */

// The languages text is stored under. A regional variant the app has no text of its own for (`en-US`, `es-MX`)
// stores nothing and reads its base language, so `resolvedLanguage` is always one of these three.
export const supportedLngs = ['en', 'es', 'es-PE'];

/** Where the person's choice is kept. */
export const LANGUAGE_KEY = 'gylio_lang';

export const detection = {
  // Explicit user choice wins; browser locale is only the first-visit default.
  order: ['localStorage', 'navigator', 'htmlTag'],
  caches: ['localStorage'],
  lookupLocalStorage: LANGUAGE_KEY,
};

// English is the fallback for a language the app does not have. Spanish has none: every key exists in both
// languages (scripts/check-i18n.mjs fails the build otherwise), so a fallback would only make every Spanish
// visit download the English text as well.
export const fallbackLng = (code) => (catalogFor(code) === 'en' ? ['en'] : []);

/**
 * Which language file i18next will fetch first, from the codes it looks at in `detection.order`: the stored
 * choice, the browser's languages, the page's `lang`. The first code it supports wins (en or es with any region,
 * `_` read as `-`, the language part lowercased only when there is a region, as i18next does); with none, English.
 * `cimode` (i18next's show-the-keys mode) fetches nothing. detection.test.ts checks this against i18next itself.
 *
 * The build copies this function's source into index.html, so it uses nothing from outside itself and only
 * syntax every browser the app supports can run.
 */
export function firstLanguageFile(codes) {
  for (var i = 0; i < codes.length; i++) {
    var raw = codes[i];
    if (typeof raw !== 'string' || !raw) continue;
    if (raw === 'cimode') return null;
    var code = raw.replace(/_/g, '-');
    var language = code.indexOf('-') > 0 ? code.split('-')[0].toLowerCase() : code;
    if (language === 'en') return 'en';
    if (language === 'es') return 'es-PE';
  }
  return 'en';
}
