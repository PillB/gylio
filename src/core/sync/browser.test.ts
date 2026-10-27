import { describe, expect, it, vi } from 'vitest';
import { attachBrowserSignals, webLockExclusive } from './browser';
import { SKIPPED } from './engine';
import type { SyncEngine } from './engine';

describe('one tab at a time', () => {
  it('runs the work when the lock is free and skips when another tab holds it', async () => {
    const free = webLockExclusive({ request: async (_n, _o, cb) => cb({}) });
    expect(await free(async () => 'ran')).toBe('ran');
    const held = webLockExclusive({ request: async (_n, _o, cb) => cb(null) });
    expect(await held(async () => 'ran')).toBe(SKIPPED);
  });

  it('asks for the lock without waiting in line', async () => {
    const request = vi.fn(async (_n: string, _o: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<unknown>) => cb({}));
    await webLockExclusive({ request } as never)(async () => 1);
    expect(request.mock.calls[0][1]).toEqual({ ifAvailable: true });
  });

  it('just runs when the browser has no Web Locks', async () => {
    expect(await webLockExclusive(undefined)(async () => 'ran')).toBe('ran');
  });
});

describe('browser signals', () => {
  const fakeEngine = () => ({ setOnline: vi.fn(), setVisible: vi.fn(), kick: vi.fn() }) as unknown as SyncEngine & Record<'setOnline' | 'setVisible' | 'kick', ReturnType<typeof vi.fn>>;

  it('starts from the current network and visibility, follows changes, and stops when detached', () => {
    const engine = fakeEngine();
    const detach = attachBrowserSignals(engine, { win: window, doc: document });
    expect(engine.setOnline).toHaveBeenCalledWith(true);
    window.dispatchEvent(new Event('offline'));
    expect(engine.setOnline).toHaveBeenLastCalledWith(false);
    window.dispatchEvent(new Event('online'));
    expect(engine.setOnline).toHaveBeenLastCalledWith(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.setVisible).toHaveBeenLastCalledWith(false);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    detach();
    const calls = engine.setOnline.mock.calls.length;
    window.dispatchEvent(new Event('offline'));
    expect(engine.setOnline.mock.calls.length).toBe(calls);
  });
});
