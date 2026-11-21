import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n, { ready as languageReady } from '../../i18n/i18n.js';

const clerk = vi.hoisted(() => ({ status: 'loading' as 'loading' | 'ready' | 'error' }));
// The same rule as the real components: each shows its children only in its own state of the account service.
vi.mock('@clerk/clerk-react', () => ({
  ClerkLoading: ({ children }: { children: React.ReactNode }) => (clerk.status === 'loading' ? <>{children}</> : null),
  ClerkFailed: ({ children }: { children: React.ReactNode }) => (clerk.status === 'error' ? <>{children}</> : null),
}));
const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('../../core/analytics', async (original) => ({ ...(await original<object>()), track }));

import AccountFormStatus from './AccountFormStatus';

beforeAll(() => languageReady);
beforeEach(async () => {
  await i18n.changeLanguage('en');
  track.mockClear();
});
afterEach(cleanup);

const show = (form: 'sign_in' | 'sign_up') =>
  render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <AccountFormStatus form={form} />
      </I18nextProvider>
    </React.StrictMode>,
  );
const titles = () => screen.queryAllByRole('heading', { level: 1 }).map((heading) => heading.textContent);

describe('the sign-in and sign-up pages before their form arrives', () => {
  it('title the page and say the form is loading', () => {
    clerk.status = 'loading';
    show('sign_in');
    expect(titles()).toEqual(['Sign in']);
    expect(screen.getByRole('status').textContent).toBe('Loading the form…');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('give sign-up its own title', () => {
    clerk.status = 'loading';
    show('sign_up');
    expect(titles()).toEqual(['Create your account']);
  });

  it('say so in Spanish too', async () => {
    clerk.status = 'loading';
    await i18n.changeLanguage('es-PE');
    show('sign_up');
    expect(titles()).toEqual(['Crea tu cuenta']);
    expect(screen.getByRole('status').textContent).toBe('Cargando el formulario…');
  });

  it('show nothing of their own once the form is there, since it brings its own title', () => {
    clerk.status = 'ready';
    const { container } = show('sign_in');
    expect(container.textContent).toBe('');
    expect(track).not.toHaveBeenCalled();
  });
});

describe('when the form cannot load', () => {
  it('keeps the title, says what to do, and counts it once, even where effects run twice (strict mode)', () => {
    clerk.status = 'error';
    show('sign_up');
    expect(titles()).toEqual(['Create your account']);
    expect(screen.getByRole('alert').textContent).toBe("The form couldn't load. Check your connection, then try again.");
    expect(screen.queryByRole('status')).toBeNull();
    expect(track.mock.calls).toEqual([['account_form_failed', { form: 'sign_up' }]]);
  });

  it('tries again by loading the page again', () => {
    clerk.status = 'error';
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    try {
      show('sign_in');
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
    expect(reload).toHaveBeenCalledTimes(1);
    expect(track.mock.calls).toEqual([
      ['account_form_failed', { form: 'sign_in' }],
      ['account_form_retried', { form: 'sign_in' }],
    ]);
  });
});
