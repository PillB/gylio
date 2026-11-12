/** Who the Feedback dialog asks to sign in first, with the real English catalogue. */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ready as languageReady } from '../../i18n/i18n.js';

// The language file arrives after the module loads; render only once it has.
beforeAll(() => languageReady);

// jsdom has no modal dialogs; open and close them the way the browser would.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.open = false; };

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light, mode: 'light' }) };
});
const auth = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));

import FeedbackButton from './FeedbackButton';

const open = () => {
  render(<MemoryRouter><FeedbackButton /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  auth.userId = null;
});

describe('the Feedback dialog', () => {
  it('on the Cloudflare site asks someone signed out to sign in first, instead of a form that cannot send', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    open();
    expect(screen.getByText('Sign in to send a report and follow its status.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });

  it('shows the form to someone signed in', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    auth.userId = 'user_1';
    open();
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('with the full server shows the form signed out too, which that server accepts', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    open();
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
  });
});
