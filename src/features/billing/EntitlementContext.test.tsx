import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = { userId: 'user_a' as string | null };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
const entitlement = vi.fn();
vi.mock('./billingApi', () => ({ billingApi: { entitlement: () => entitlement() } }));

import { EntitlementProvider, useEntitlement } from './EntitlementContext';

let seen: ReturnType<typeof useEntitlement> | null = null;
function Probe() {
  seen = useEntitlement();
  return null;
}
const mount = async () => {
  render(<EntitlementProvider><Probe /></EntitlementProvider>);
  await act(async () => undefined);
};
const focusTab = async () => act(async () => { window.dispatchEvent(new Event('focus')); });

beforeEach(() => {
  localStorage.clear();
  auth.userId = 'user_a';
  seen = null;
  entitlement.mockReset();
  entitlement.mockResolvedValue({ plan: 'pro', source: 'gift', expiresAt: null, renews: false, trial: { eligible: false, endsAt: null }, subscription: null });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('EntitlementProvider', () => {
  it('never asks in a build without the billing server, not even when the tab regains focus', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    await mount();
    await focusTab();
    await focusTab();
    expect(entitlement).not.toHaveBeenCalled();
    expect(seen?.entitlement).toBeNull();
    expect(await seen?.refresh()).toBeNull();
    expect(entitlement).not.toHaveBeenCalled();
  });

  it('still honours a Pro answer saved on this device, until it would have expired', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    localStorage.setItem('gylio:entitlement:v1', JSON.stringify({ userId: 'user_a', plan: 'pro', expiresAt: tomorrow, source: 'gift' }));
    await mount();
    expect(seen?.entitlement?.plan).toBe('pro');
    expect(entitlement).not.toHaveBeenCalled();
  });

  it('asks on start and on every focus when the build has the server', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    await mount();
    expect(entitlement).toHaveBeenCalledTimes(1);
    await focusTab();
    expect(entitlement).toHaveBeenCalledTimes(2);
    expect(seen?.entitlement?.plan).toBe('pro');
  });
});
