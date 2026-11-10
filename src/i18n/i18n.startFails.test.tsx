// @vitest-environment jsdom
/** The first language's text cannot be fetched: the module says so, and the page shown instead needs no text file. */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./catalogs.js', async (original) => ({
  ...(await original<typeof import('./catalogs.js')>()),
  loadCatalog: async () => {
    throw new TypeError('Failed to fetch dynamically imported module');
  },
}));

import i18n, { ready } from './i18n.js';
import StartProblem from './StartProblem.jsx';

afterEach(cleanup);

describe('the language module when its first file does not arrive', () => {
  it('rejects, so the app is not drawn with keys in place of words', async () => {
    await expect(ready).rejects.toThrow(/could not be loaded/);
    expect(i18n.resolvedLanguage).toBeUndefined();
    expect(i18n.t('settings')).toBe('settings');
  });
});

describe('the page shown instead', () => {
  it('says what happened in both languages, each marked with its language, and offers a reload', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true });
    render(<StartProblem />);
    const alert = screen.getByRole('alert');
    const [english, spanish] = Array.from(alert.querySelectorAll('p'));
    expect(english.lang).toBe('en');
    expect(english.textContent).toMatch(/could not finish loading/);
    expect(spanish.lang).toBe('es');
    expect(spanish.textContent).toMatch(/no pudo terminar de cargar/);
    fireEvent.click(screen.getByRole('button', { name: 'Reload / Recargar' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
