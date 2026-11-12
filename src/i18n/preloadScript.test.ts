import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAILED_KEY } from './catalogs.js';
import { LANGUAGE_KEY } from './detection.js';
import { languagePreloadScript } from './preloadScript.js';

const FILES = { en: '/assets/catalog.en-a1.js', 'es-PE': '/assets/catalog.es-PE-b2.js' };

const setBrowser = (languages: string[]) => {
  Object.defineProperty(navigator, 'languages', { configurable: true, get: () => languages });
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => languages[0] ?? '' });
};

/** Runs the script as index.html would, and returns what it asked the browser to preload. */
const run = () => {
  // Runs the exact text the build writes into the page.
  new Function(languagePreloadScript(FILES))();
  return [...document.head.querySelectorAll('link[rel="modulepreload"]')].map((link) => ({
    href: link.getAttribute('href'),
    crossOrigin: (link as HTMLLinkElement).crossOrigin,
  }));
};

beforeEach(() => setBrowser(['en-US']));
afterEach(() => {
  document.head.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('the language preload in index.html', () => {
  it('preloads English for an English browser, the way the app imports it', () => {
    expect(run()).toEqual([{ href: FILES.en, crossOrigin: '' }]);
  });

  it('preloads Spanish for a Spanish browser', () => {
    setBrowser(['fr-FR', 'es-MX']);
    expect(run()).toEqual([{ href: FILES['es-PE'], crossOrigin: '' }]);
  });

  it("follows the person's stored choice over the browser", () => {
    localStorage.setItem(LANGUAGE_KEY, 'es-PE');
    expect(run().map((link) => link.href)).toEqual([FILES['es-PE']]);
  });

  it('preloads nothing after a failed download, when the app imports the file under a new address', () => {
    sessionStorage.setItem(FAILED_KEY, JSON.stringify({ en: 1 }));
    expect(run()).toEqual([]);
  });

  it('still preloads from the browser languages when storage refuses to be read', () => {
    setBrowser(['es-PE']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(run().map((link) => link.href)).toEqual([FILES['es-PE']]);
  });
});
