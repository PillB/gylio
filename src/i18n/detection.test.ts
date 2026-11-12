import i18next, { type BackendModule } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { afterEach, describe, expect, it } from 'vitest';
import { catalogFor } from './catalogs.js';
import { LANGUAGE_KEY, detection, fallbackLng, firstLanguageFile, supportedLngs } from './detection.js';

/**
 * index.html guesses which language file the app will fetch first (preloadScript.js) with firstLanguageFile. Here
 * that guess is checked against i18next itself, set up exactly as i18n.js sets it up, for stored choices and browser
 * languages of every shape: a wrong guess would download a file nobody uses.
 */
const STORED = [null, '', 'en', 'es-PE', 'es', 'es-pe', 'es_ES', 'en-GB', 'EN', 'ES', 'fr', 'garbage', 'cimode'];
const BROWSERS = [
  [],
  ['en-US'],
  ['es-PE'],
  ['es-419'],
  ['fr-FR', 'es-ES'],
  ['fr'],
  ['ES'],
  ['EN-us', 'es'],
  ['Es-MX'],
  ['es_MX'],
  ['pt-BR', 'en'],
  ['de', 'fr'],
  ['zh-Hant-TW', 'es'],
];

const setBrowser = (languages: string[]) => {
  Object.defineProperty(navigator, 'languages', { configurable: true, get: () => languages });
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => languages[0] ?? '' });
};

/** The language files i18next asks for when it starts, as the app's backend would fetch them. */
const filesI18nextFetches = async () => {
  const fetched = new Set<string>();
  const backend: BackendModule = {
    type: 'backend',
    init() {},
    read(language, _namespace, done) {
      if (supportedLngs.includes(language)) fetched.add(catalogFor(language));
      done(null, {});
    },
  };
  await i18next.createInstance().use(backend).use(LanguageDetector).init({ detection, fallbackLng, supportedLngs, nonExplicitSupportedLngs: true });
  return [...fetched];
};

afterEach(() => localStorage.clear());

describe('the first language file', () => {
  it('is set up the way i18n.js is', () => {
    expect(detection.lookupLocalStorage).toBe(LANGUAGE_KEY);
    expect(detection.order).toEqual(['localStorage', 'navigator', 'htmlTag']);
  });

  const cases = STORED.flatMap((stored) => BROWSERS.map((browser) => [stored, browser] as const));
  it.each(cases)('stored %j, browser %j: the guess is the file i18next fetches', async (stored, browser) => {
    localStorage.clear();
    if (stored !== null) localStorage.setItem(LANGUAGE_KEY, stored);
    setBrowser([...browser]);
    const fetched = await filesI18nextFetches();
    expect(fetched.length).toBeLessThanOrEqual(1);
    const guess = firstLanguageFile([stored, ...browser, browser[0] ?? '', document.documentElement.getAttribute('lang')]);
    expect(guess).toBe(fetched[0] ?? null);
  });
});
