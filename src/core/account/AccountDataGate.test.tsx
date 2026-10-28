import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVE_PREFIX, OWNER_KEY, OWNER_SIGNED_IN_KEY } from './deviceOwner';

const auth = {
  isLoaded: true,
  isSignedIn: true as boolean,
  userId: 'user_b' as string | null,
  signOut: vi.fn(async () => undefined),
};
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../context/ThemeContext', async () => {
  const { themes } = await import('../themes');
  return { useTheme: () => ({ theme: themes.light }) };
});

import { AccountDataGate } from './AccountDataGate';

let reload: ReturnType<typeof vi.fn>;

const mount = () =>
  render(
    <AccountDataGate>
      <p>app</p>
    </AccountDataGate>,
  );

beforeEach(() => {
  localStorage.clear();
  Object.assign(auth, { isLoaded: true, isSignedIn: true, userId: 'user_b' });
  reload = vi.fn();
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the data on a shared device', () => {
  it("never shows A's data to B: it is set aside before the app renders, and the page reloads", async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"A: pay rent"}]}}');
    mount();
    expect(screen.queryByText('app')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('device.switching');
    await act(async () => undefined);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gylio_sqlite')).toBeNull();
    expect(localStorage.getItem(`${ARCHIVE_PREFIX}user_a`)).toContain('A: pay rent');
  });

  it("brings back B's data, set aside earlier, after the previous owner removed theirs, before the app shows", async () => {
    localStorage.setItem(`${ARCHIVE_PREFIX}user_b`, JSON.stringify({ gylio_sqlite: '{"tasks":{"rows":[{"title":"B: call mum"}]}}' }));
    mount();
    expect(screen.queryByText('app')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('device.restoring');
    await act(async () => undefined);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gylio_sqlite')).toContain('B: call mum');
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
  });

  it('opens the app for the first account on a device, and remembers it', async () => {
    localStorage.setItem('gylio_sqlite', '{"tasks":{"rows":[]}}');
    mount();
    expect(screen.getByText('app')).toBeTruthy();
    await act(async () => undefined);
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBe('true');
    expect(reload).not.toHaveBeenCalled();
  });

  it('notes a sign-out, so the data does not open offline for whoever comes next', async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
    Object.assign(auth, { isSignedIn: false, userId: null });
    mount();
    expect(screen.getByText('app')).toBeTruthy();
    await act(async () => undefined);
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBe('false');
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_a');
  });

  it('leaves the decision to the routes while sign-in is still loading', async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    Object.assign(auth, { isLoaded: false, isSignedIn: false, userId: null });
    mount();
    expect(screen.getByText('app')).toBeTruthy();
    await act(async () => undefined);
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBeNull();
  });

  it('keeps the data hidden and offers a sign-out when the device has no room to set it aside', async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"A"}]}}');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    mount();
    await act(async () => undefined);
    setItem.mockRestore();
    expect(screen.queryByText('app')).toBeNull();
    expect(screen.getByRole('heading', { name: 'device.noRoom.title' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'device.noRoom.signOut' }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('gylio_sqlite')).toContain('"A"');
  });

  it('reloads when another tab switched the account, so this tab cannot save over the new data', async () => {
    localStorage.setItem(OWNER_KEY, 'user_b');
    mount();
    await act(async () => undefined);
    window.dispatchEvent(new StorageEvent('storage', { key: OWNER_KEY, oldValue: 'user_b', newValue: 'user_c' }));
    expect(reload).toHaveBeenCalledTimes(1);
    // The first account claiming a device changes nothing on screen, so no reload.
    window.dispatchEvent(new StorageEvent('storage', { key: OWNER_KEY, oldValue: null, newValue: 'user_b' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
