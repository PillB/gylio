// @vitest-environment jsdom
/** Starting in Spanish (the person chose it on an earlier visit): the English text is never fetched. */
import { beforeAll, describe, expect, it, vi } from 'vitest';

const fetched = vi.hoisted(() => {
  // Before the language module is imported, which reads the saved choice as it starts.
  localStorage.setItem('gylio_lang', 'es-PE');
  return [] as string[];
});
vi.mock('./catalogs.js', async (original) => {
  const real = await original<typeof import('./catalogs.js')>();
  return {
    ...real,
    loadCatalog: async (language: string) => {
      fetched.push(real.catalogFor(language));
      return real.loadCatalog(language);
    },
  };
});

import i18n, { ready } from './i18n.js';

beforeAll(() => ready);

describe('the language module, started in Spanish', () => {
  it('has fetched Spanish and not English', () => {
    expect(fetched.length).toBeGreaterThan(0);
    expect(fetched).not.toContain('en');
    expect(i18n.resolvedLanguage).toBe('es-PE');
    expect(i18n.t('settings')).toBe('Configuración');
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(false);
    expect(document.documentElement.lang).toBe('es-PE');
  });

  it('shows a key that exists in neither language as written, without reaching for English', () => {
    expect(i18n.t('thisKeyDoesNotExist', 'Written in the code')).toBe('Written in the code');
    expect(fetched).not.toContain('en');
  });
});
