/**
 * The real provider and banner against a stubbed network: checks what is
 * written to this device and what is sent to the account on first sign-in.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../i18n/i18n.js';
import i18n from 'i18next';

vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user_1' }) }));
vi.mock('../../core/utils/authToken', () => ({ authHeaders: async (extra?: Record<string, string>) => ({ ...(extra ?? {}) }) }));

import { ThemeProvider } from '../../core/context/ThemeContext';
import { AccountSyncProvider } from './AccountSyncContext';
import SyncConflictBanner from './SyncConflictBanner';
import { META_KEY } from './accountSync';

const ON_DEVICE = '{"tasks":{"rows":[{"id":1,"title":"on device"}],"nextId":2}}';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const serverCopy = { version: 4, updatedAt: '2026-10-01T10:00:00.000Z', data: { gylio_sqlite: '{"tasks":["from account"]}' } };
let reload: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
  reload = vi.fn();
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const renderSync = () => render(
  <ThemeProvider><AccountSyncProvider><SyncConflictBanner /></AccountSyncProvider></ThemeProvider>
);

describe('first sign-in on a device', () => {
  it('brings the account data onto an empty device', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ state: serverCopy })));
    renderSync();
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(localStorage.getItem('gylio_sqlite')).toBe('{"tasks":["from account"]}');
    expect(JSON.parse(localStorage.getItem(META_KEY) as string)).toMatchObject({ userId: 'user_1', version: 4 });
  });

  it("uploads this device's data when the account has none", async () => {
    localStorage.setItem('gylio_sqlite', ON_DEVICE);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ state: null }))
      .mockResolvedValueOnce(json({ saved: true, state: { version: 1, updatedAt: 't', data: {} } }));
    vi.stubGlobal('fetch', fetchMock);
    renderSync();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.baseVersion).toBe(0);
    expect(body.data.gylio_sqlite).toBe(ON_DEVICE);
    expect(reload).not.toHaveBeenCalled();
  });

  it('asks before overwriting when both sides have data, and keeps the device copy on request', async () => {
    localStorage.setItem('gylio_sqlite', ON_DEVICE);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ state: serverCopy }))
      .mockResolvedValueOnce(json({ saved: true, state: { ...serverCopy, version: 5 } }));
    vi.stubGlobal('fetch', fetchMock);
    renderSync();

    fireEvent.click(await screen.findByRole('button', { name: "Keep this device's data" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).baseVersion).toBe(4);
    expect(localStorage.getItem('gylio_sqlite')).toBe(ON_DEVICE);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('review fixes: saving', () => {
  it('stops re-sending data the server refused as too large, and says why', async () => {
    localStorage.setItem('gylio_sqlite', ON_DEVICE);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ state: null }))
      .mockResolvedValue(new Response('{}', { status: 413 }));
    vi.stubGlobal('fetch', fetchMock);
    renderSync();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    // A later save attempt with unchanged data must not call the server again.
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries the first sync when the connection comes back', async () => {
    localStorage.setItem('gylio_sqlite', ON_DEVICE);
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(json({ state: null }))
      .mockResolvedValueOnce(json({ saved: true, state: { version: 1, updatedAt: 't', data: {} } }));
    vi.stubGlobal('fetch', fetchMock);
    renderSync();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(localStorage.getItem(META_KEY) as string)).toMatchObject({ userId: 'user_1', version: 1 });
  });

  it('reloads when another tab replaced the data, instead of overwriting it later', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ state: null })));
    renderSync();
    // The provider mounts once the theme has loaded; keep signalling until it listens.
    await waitFor(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'gylio:sync:replacedAt', newValue: 'now' }));
      expect(reload).toHaveBeenCalled();
    });
    reload.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme-mode', newValue: 'dark' }));
    expect(reload).not.toHaveBeenCalled();
  });

  it("keeps the account's copy as a backup before 'Keep this device's data' replaces it", async () => {
    localStorage.setItem('gylio_sqlite', ON_DEVICE);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json({ state: serverCopy }))
      .mockResolvedValueOnce(json({ saved: true, state: { ...serverCopy, version: 5 } })));
    renderSync();
    fireEvent.click(await screen.findByRole('button', { name: "Keep this device's data" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('gylio:preRestoreBackup') as string)[0]).toMatchObject({
      ownerId: 'user_1', data: serverCopy.data,
    }));
  });
});
