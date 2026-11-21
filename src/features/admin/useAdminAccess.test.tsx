/**
 * Which server is asked whether to open the admin console, in each build, and what the app shows until it answers.
 * Only the network and the sign-in state are replaced; the request is the real one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { forgetAdminAnswers, useAdminAccess } from './useAdminAccess';

const auth = { userId: 'user_1' as string | null, authLoaded: true };
const pro = { entitlement: null as null | { isAdmin?: boolean }, loading: false };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
vi.mock('../billing/EntitlementContext', () => ({ useEntitlement: () => pro }));

// A new response each time: a body can be read only once.
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const build = (billing: string, sync: string) => {
  vi.stubEnv('VITE_BILLING_ENABLED', billing);
  vi.stubEnv('VITE_SYNC_ENABLED', sync);
};
// Lets a request that was started reach fetch: the sign-in token is awaited first.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const paths = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map(([url]) => new URL(String(url), 'https://app.test').pathname);

beforeEach(() => {
  Object.assign(auth, { userId: 'user_1', authLoaded: true });
  Object.assign(pro, { entitlement: null, loading: false });
  forgetAdminAnswers();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('useAdminAccess on the Cloudflare site (the Worker)', () => {
  beforeEach(() => build('false', 'true'));

  it('asks the Worker, and opens the console for an admin', async () => {
    const fetchMock = answer(200, { admin: true });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current).toBe('checking');
    await waitFor(() => expect(result.current).toBe('admin'));
    expect(paths(fetchMock)).toEqual(['/api/me/admin']);
  });

  it('keeps it closed for everyone else', async () => {
    vi.stubGlobal('fetch', answer(200, { admin: false }));
    const { result } = renderHook(() => useAdminAccess());
    await waitFor(() => expect(result.current).toBe('not_admin'));
  });

  it('says it could not tell when the Worker could not be asked, and asks again next time', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', offline);
    const first = renderHook(() => useAdminAccess());
    await waitFor(() => expect(first.result.current).toBe('unknown'));
    first.unmount();
    vi.stubGlobal('fetch', answer(200, { admin: true }));
    const second = renderHook(() => useAdminAccess());
    await waitFor(() => expect(second.result.current).toBe('admin'));
  });

  it('asks once per person per visit, and again for someone else', async () => {
    const fetchMock = answer(200, { admin: false });
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useAdminAccess());
    await waitFor(() => expect(first.result.current).toBe('not_admin'));
    const again = renderHook(() => useAdminAccess());
    await waitFor(() => expect(again.result.current).toBe('not_admin'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    auth.userId = 'user_2';
    again.rerender();
    expect(again.result.current).toBe('checking');
    await waitFor(() => expect(again.result.current).toBe('not_admin'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits for sign-in to load, and asks nothing for someone signed out', async () => {
    const fetchMock = answer(200, { admin: true });
    vi.stubGlobal('fetch', fetchMock);
    Object.assign(auth, { userId: null, authLoaded: false });
    const { result, rerender } = renderHook(() => useAdminAccess());
    expect(result.current).toBe('checking');
    auth.authLoaded = true;
    rerender();
    expect(result.current).toBe('not_admin');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useAdminAccess with the full server', () => {
  beforeEach(() => build('true', 'true'));

  it("reads the Pro answer, never the Worker's question", async () => {
    const fetchMock = answer(200, { admin: true });
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(() => useAdminAccess());
    expect(result.current).toBe('checking');
    pro.entitlement = {};
    rerender();
    expect(result.current).toBe('checking');
    pro.entitlement = { isAdmin: false };
    rerender();
    expect(result.current).toBe('not_admin');
    pro.entitlement = { isAdmin: true };
    rerender();
    expect(result.current).toBe('admin');
    pro.loading = true;
    pro.entitlement = { isAdmin: false };
    rerender();
    expect(result.current).toBe('checking');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useAdminAccess on GitHub Pages (no server)', () => {
  it('keeps the console closed and asks nothing', async () => {
    build('false', 'false');
    const fetchMock = answer(200, { admin: true });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current).toBe('not_admin');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
