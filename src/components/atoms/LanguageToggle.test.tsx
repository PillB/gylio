// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { themes } from '../../core/themes';

const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/analytics', async (original) => ({
  ...(await original<typeof import('../../core/analytics')>()),
  track: (...args: unknown[]) => track(...args),
}));
vi.mock('../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));

/** The network for the language files: a file can be made to fail, or to wait until the test lets it through. */
// Hoisted: the language module asks for its first file while this file's imports are still being resolved.
const network = vi.hoisted(() => ({ down: false, hold: null as Promise<void> | null }));
vi.mock('../../i18n/catalogs.js', async (original) => {
  const real = await original<typeof import('../../i18n/catalogs.js')>();
  return {
    ...real,
    loadCatalog: async (language: string) => {
      if (network.hold) await network.hold;
      if (network.down) throw new TypeError('Failed to fetch dynamically imported module');
      return real.loadCatalog(language);
    },
  };
});

import i18n, { ready } from '../../i18n/i18n.js';
import LanguageToggle from './LanguageToggle';

const Page: React.FC = () => {
  const { t } = useTranslation();
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageToggle />
      <h2>{t('settings')}</h2>
    </I18nextProvider>
  );
};

const selector = () => screen.getByRole('combobox') as HTMLSelectElement;
const sent = (name: string) => track.mock.calls.filter(([event]) => event === name).map(([, props]) => props);

beforeEach(async () => {
  await ready;
  network.down = false;
  network.hold = null;
  await i18n.changeLanguage('en');
  track.mockClear();
});
afterEach(cleanup);

describe('the language selector', () => {
  it('offers the two reviewed languages by their own names and shows the one in use', () => {
    render(<Page />);
    expect(Array.from(selector().options).map((option) => option.textContent)).toEqual(['English', 'Español (Perú)']);
    expect(selector().value).toBe('en');
    expect(selector().getAttribute('aria-label')).toBe('Select language');
  });

  it('changes the page to Spanish once the Spanish text has arrived, and counts the change', async () => {
    render(<Page />);
    fireEvent.change(selector(), { target: { value: 'es-PE' } });
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeTruthy();
    expect(selector().value).toBe('es-PE');
    expect(selector().getAttribute('aria-label')).toBe('Seleccionar idioma');
    expect(selector().getAttribute('aria-busy')).toBe('false');
    expect(sent('language_changed')).toEqual([{ to: 'es-PE' }]);
    expect(sent('language_load_failed')).toEqual([]);
  });

  it('shows the chosen language as chosen, and busy, while its text is on the way; the page waits in the old one', async () => {
    let arrive = () => undefined as void;
    network.hold = new Promise<void>((resolve) => { arrive = resolve; });
    render(<Page />);
    fireEvent.change(selector(), { target: { value: 'es-PE' } });
    expect(selector().value).toBe('es-PE');
    expect(selector().getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    await act(async () => arrive());
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeTruthy();
    expect(selector().getAttribute('aria-busy')).toBe('false');
  });

  it('stays in the language it was in, and says why, when the text cannot be fetched', async () => {
    network.down = true;
    render(<Page />);
    fireEvent.change(selector(), { target: { value: 'es-PE' } });
    expect((await screen.findByRole('alert')).textContent).toBe('Could not load that language. Check your connection and try again.');
    expect(selector().value).toBe('en');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(i18n.resolvedLanguage).toBe('en');
    expect(sent('language_load_failed')).toEqual([{ to: 'es-PE' }]);
    expect(sent('language_changed')).toEqual([]);

    // Trying again with the connection back clears the message.
    network.down = false;
    fireEvent.change(selector(), { target: { value: 'es-PE' } });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeTruthy();
  });
});
