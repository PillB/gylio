// @vitest-environment jsdom
/**
 * Starting in English (the browser's language here): only the English text is fetched, Spanish arrives when it is
 * chosen, and a language whose text cannot be fetched is not switched to.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Hoisted: the language module asks for its first file while this file's imports are still being resolved.
const { fetched, network } = vi.hoisted(() => ({ fetched: [] as string[], network: { spanishDown: false } }));
vi.mock('./catalogs.js', async (original) => {
  const real = await original<typeof import('./catalogs.js')>();
  return {
    ...real,
    loadCatalog: async (language: string) => {
      const catalogue = real.catalogFor(language);
      if (catalogue === 'es-PE' && network.spanishDown) throw new TypeError('Failed to fetch dynamically imported module');
      fetched.push(catalogue);
      return real.loadCatalog(language);
    },
  };
});

import i18n, { ready, switchLanguage } from './i18n.js';

beforeAll(() => ready);

describe('the language module, started in English', () => {
  it('has fetched English and nothing else', () => {
    expect(fetched).toEqual(['en']);
    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('settings')).toBe('Settings');
    expect(i18n.hasResourceBundle('es-PE', 'translation')).toBe(false);
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the language, and says so, when the chosen one cannot be fetched', async () => {
    network.spanishDown = true;
    await expect(switchLanguage('es-PE')).rejects.toThrow(/fetch/i);
    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('settings')).toBe('Settings');
    expect(document.documentElement.lang).toBe('en');
  });

  it('fetches Spanish when it is chosen, then speaks it', async () => {
    network.spanishDown = false;
    await switchLanguage('es-PE');
    expect(fetched.filter((catalogue) => catalogue === 'es-PE').length).toBeGreaterThan(0);
    expect(fetched.filter((catalogue) => catalogue === 'en')).toHaveLength(1);
    expect(i18n.resolvedLanguage).toBe('es-PE');
    expect(i18n.t('settings')).toBe('Configuración');
    expect(document.documentElement.lang).toBe('es-PE');
    expect(localStorage.getItem('gylio_lang')).toBe('es-PE');
  });

  it('goes back to English without fetching it again', async () => {
    const before = fetched.length;
    await switchLanguage('en');
    expect(i18n.t('settings')).toBe('Settings');
    // i18next has the text in memory; only the selector's own check asks the loader, which answers from memory.
    expect(fetched.slice(before)).toEqual(['en']);
  });
});
