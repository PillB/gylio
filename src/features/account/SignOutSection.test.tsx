import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMOVE_ON_LOAD_KEY } from '../../core/account/removeDeviceData';

const signOutEvents = () =>
  (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props: unknown }[])
    .filter((event) => event.name === 'sign_out')
    .map((event) => event.props);

const auth = {
  userId: 'user_a' as string | null,
  signOut: vi.fn(async (after: () => void) => after()) as ((after: () => void) => Promise<void>) | null,
};
const sync = { snapshot: null as { pending: number } | null };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
vi.mock('../../core/sync/SyncContext', () => ({ useSync: () => sync }));
vi.mock('../../core/sync/flag', () => ({ syncEnabled: () => true }));
vi.mock('./download', () => ({ downloadDataFile: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: { count?: number }) => (values?.count ? `${key}:${values.count}` : key), i18n: { language: 'en' } }),
}));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('../../core/hooks/useAccessibility', () => ({ default: () => ({ speak: () => undefined }) }));

import { downloadDataFile } from './download';
import SignOutCard, { whatRemovalLoses } from './SignOutSection';

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  auth.userId = 'user_a';
  auth.signOut = vi.fn(async (after: () => void) => after());
  sync.snapshot = { pending: 0 };
  replace = vi.fn();
  Object.defineProperty(window, 'location', { value: { ...window.location, hash: '', replace }, writable: true, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('signing out from Settings', () => {
  it('signs out and keeps the data on this device', async () => {
    render(<SignOutCard />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'account.signOut.keep' })));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(localStorage.getItem(REMOVE_ON_LOAD_KEY)).toBeNull();
  });

  it('says what removing loses, offers a download, and removes only after sign-out went through', async () => {
    sync.snapshot = { pending: 3 };
    render(<SignOutCard />);
    const remove = screen.getByRole('button', { name: 'account.signOut.remove' });
    fireEvent.click(remove);
    expect(remove.getAttribute('aria-expanded')).toBe('true');
    const question = screen.getByRole('group', { name: 'account.signOut.confirmTitle' });
    expect(document.activeElement?.textContent).toBe('account.signOut.confirmTitle');
    expect(question.textContent).toContain('account.signOut.synced');
    expect(question.textContent).toContain('account.signOut.pending:3');
    expect(question.textContent).toContain('account.signOut.staysHere');

    fireEvent.click(screen.getByRole('button', { name: 'account.download' }));
    expect(downloadDataFile).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'account.signOut.confirm' })));
    expect(localStorage.getItem(REMOVE_ON_LOAD_KEY)).toBe('user_a');
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(signOutEvents()).toEqual([
      { step: 'asked', removeData: true },
      { step: 'downloaded', removeData: true },
      { step: 'signed_out', removeData: true },
    ]);
  });

  it('removes nothing and says so when sign-out fails, for example offline', async () => {
    auth.signOut = vi.fn(async () => {
      throw new Error('offline');
    });
    render(<SignOutCard />);
    fireEvent.click(screen.getByRole('button', { name: 'account.signOut.remove' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'account.signOut.confirm' })));
    expect(screen.getByRole('alert').textContent).toBe('account.signOut.failed');
    expect(localStorage.getItem(REMOVE_ON_LOAD_KEY)).toBeNull();
    expect(signOutEvents()).toEqual([{ step: 'asked', removeData: true }, { step: 'failed', removeData: true }]);
    expect(replace).not.toHaveBeenCalled();
  });

  it('cancelling closes the question and puts focus back on the button', async () => {
    render(<SignOutCard />);
    const remove = screen.getByRole('button', { name: 'account.signOut.remove' });
    fireEvent.click(remove);
    fireEvent.click(screen.getByRole('button', { name: 'account.signOut.cancel' }));
    expect(screen.queryByRole('group')).toBeNull();
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    expect(document.activeElement).toBe(remove);
  });

  it('opens on this card when the account menu links here', () => {
    Object.defineProperty(window, 'location', { value: { ...window.location, hash: '#sign-out', replace }, writable: true, configurable: true });
    render(<SignOutCard />);
    expect(document.activeElement?.id).toBe('sign-out');
  });

  it('is not there for someone signed out, or without sign-in', () => {
    auth.userId = null;
    const { container, rerender } = render(<SignOutCard />);
    expect(container.textContent).toBe('');
    auth.userId = 'user_a';
    auth.signOut = null;
    rerender(<SignOutCard />);
    expect(container.textContent).toBe('');
  });
});

describe('whatRemovalLoses', () => {
  it('with account sync: what the account keeps, and changes not sent yet', () => {
    expect(whatRemovalLoses({ syncOn: true, pending: 0, savedAt: null }).map((line) => line.key)).toEqual(['account.signOut.synced']);
    expect(whatRemovalLoses({ syncOn: true, pending: 2, savedAt: null })).toEqual([
      { key: 'account.signOut.synced' },
      { key: 'account.signOut.pending', values: { count: 2 } },
    ]);
  });

  it('without it: the last copy saved to the account, or that the device holds the only copy', () => {
    expect(whatRemovalLoses({ syncOn: false, pending: 0, savedAt: '28/10/2026' })).toEqual([{ key: 'account.signOut.savedCopy', values: { when: '28/10/2026' } }]);
    expect(whatRemovalLoses({ syncOn: false, pending: 0, savedAt: null })).toEqual([{ key: 'account.signOut.deviceOnly' }]);
  });
});
