import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { SyncRoot } from './SyncRoot';
import { useSync } from './SyncContext';
import type { SyncEngine } from './engine';

const auth = { isLoaded: true, isSignedIn: true, userId: 'user_1' as string | null, getToken: vi.fn(async (_options?: { skipCache?: boolean }) => 'token-1' as string | null) };
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }));

const started: { stop: ReturnType<typeof vi.fn>; engine: SyncEngine; options: Parameters<typeof import('./appSync').startAppSync>[0] }[] = [];
let startImpl: (options: Parameters<typeof import('./appSync').startAppSync>[0]) => Promise<{ engine: SyncEngine; bridge: unknown; stop: () => void }>;

vi.mock('./appSync', () => ({
  startAppSync: (options: never) => startImpl(options),
}));

const fakeEngine = () => ({ snapshot: () => ({ state: { kind: 'idle' }, pending: 0, refused: 0, kept: 0, lastSyncedAt: null, economy: false }), subscribe: () => () => undefined, kick: vi.fn() }) as unknown as SyncEngine;

const Probe = ({ seen }: { seen: { snapshot: unknown } }) => {
  seen.snapshot = useSync().snapshot;
  return null;
};

const mount = () => {
  const seen = { snapshot: undefined as unknown };
  const view = render(<SyncRoot><Probe seen={seen} /></SyncRoot>);
  return { seen, ...view };
};

describe('switching sync on for a signed-in person', () => {
  beforeEach(() => {
    started.length = 0;
    Object.assign(auth, { isLoaded: true, isSignedIn: true, userId: 'user_1' });
    auth.getToken.mockClear();
    startImpl = async (options) => {
      const record = { stop: vi.fn(), engine: fakeEngine(), options };
      started.push(record);
      return { engine: record.engine, bridge: {}, stop: record.stop };
    };
    vi.stubEnv('VITE_SYNC_ENABLED', 'true');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('starts nothing in a build without the sync flag', async () => {
    vi.stubEnv('VITE_SYNC_ENABLED', '');
    const { seen } = mount();
    await act(async () => undefined);
    expect(started).toHaveLength(0);
    expect(seen.snapshot).toBeNull();
  });

  it('starts nothing while signed out or while sign-in is still loading', async () => {
    Object.assign(auth, { isSignedIn: false });
    mount();
    await act(async () => undefined);
    cleanup();
    Object.assign(auth, { isSignedIn: true, isLoaded: false });
    mount();
    await act(async () => undefined);
    expect(started).toHaveLength(0);
  });

  it('starts once when signed in, shows the app the engine, and stops it when the app closes', async () => {
    const { seen, unmount } = mount();
    await act(async () => undefined);
    expect(started).toHaveLength(1);
    expect(seen.snapshot).not.toBeNull();
    unmount();
    expect(started[0].stop).toHaveBeenCalledTimes(1);
  });

  it("keeps the engine's notes under the signed-in account, and opens another account's on a switch", async () => {
    mount();
    await act(async () => undefined);
    expect(started[0].options.accountId).toBe('user_1');
    Object.assign(auth, { userId: 'user_2' });
    cleanup();
    mount();
    await act(async () => undefined);
    expect(started[started.length - 1].options.accountId).toBe('user_2');
  });

  it('gives the engine a fresh token on request, and the person\'s id', async () => {
    mount();
    await act(async () => undefined);
    const { getAuth } = started[0].options;
    expect(await getAuth({ forceRefresh: false })).toEqual({ token: 'token-1', userId: 'user_1' });
    expect(auth.getToken).toHaveBeenLastCalledWith({ skipCache: false });
    await getAuth({ forceRefresh: true });
    expect(auth.getToken).toHaveBeenLastCalledWith({ skipCache: true });
  });

  it('reports "signed out" to the engine when there is no token', async () => {
    mount();
    await act(async () => undefined);
    auth.getToken.mockResolvedValueOnce(null);
    expect(await started[0].options.getAuth({ forceRefresh: false })).toBeNull();
  });

  it('stops when the person signs out, and starts again for whoever signs in next', async () => {
    const view = mount();
    await act(async () => undefined);
    Object.assign(auth, { isSignedIn: false, userId: null });
    view.rerender(<SyncRoot><Probe seen={view.seen} /></SyncRoot>);
    await act(async () => undefined);
    expect(started[0].stop).toHaveBeenCalledTimes(1);
    expect(view.seen.snapshot).toBeNull();
    Object.assign(auth, { isSignedIn: true, userId: 'user_2' });
    view.rerender(<SyncRoot><Probe seen={view.seen} /></SyncRoot>);
    await act(async () => undefined);
    expect(started).toHaveLength(2);
  });

  it('stops an engine that finished starting after the app had already closed', async () => {
    let finish: () => void = () => undefined;
    startImpl = (options) =>
      new Promise((resolve) => {
        finish = () => {
          const record = { stop: vi.fn(), engine: fakeEngine(), options };
          started.push(record);
          resolve({ engine: record.engine, bridge: {}, stop: record.stop });
        };
      });
    const { unmount } = mount();
    unmount();
    await act(async () => finish());
    expect(started[0].stop).toHaveBeenCalledTimes(1);
  });

  it('keeps the app working, and says why, when sync cannot start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startImpl = async () => {
      throw new Error('no database');
    };
    const { seen } = mount();
    await act(async () => undefined);
    expect(seen.snapshot).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('everything stays on this device'), 'no database');
    warn.mockRestore();
  });
});
