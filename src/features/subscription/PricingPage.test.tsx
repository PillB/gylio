/** Pricing behaviour the review found broken, checked through the real page. */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.js';
import i18n from 'i18next';

const auth = { userId: 'user_1' as string | null, authLoaded: true };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
const entitlementState = { entitlement: null as unknown, setEntitlement: vi.fn(), refresh: vi.fn() };
vi.mock('../billing/EntitlementContext', () => ({ useEntitlement: () => entitlementState }));
const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/analytics', () => ({ track }));
const api = vi.hoisted(() => ({ startTrial: vi.fn(), plans: vi.fn(), portal: vi.fn() }));
vi.mock('../billing/billingApi', async (orig) => ({ ...(await orig<typeof import('../billing/billingApi')>()), billingApi: api }));

import { ThemeProvider } from '../../core/context/ThemeContext';
import { ApiRequestError } from '../billing/billingApi';
import PricingPage from './PricingPage';

beforeEach(() => { vi.stubEnv('VITE_BILLING_ENABLED', 'true'); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

const renderPage = async (url = '/pricing') => {
  render(<ThemeProvider><MemoryRouter initialEntries={[url]}><PricingPage /></MemoryRouter></ThemeProvider>);
  await screen.findByRole('heading', { level: 1 });
};

const entitlement = (over: Record<string, unknown>) => ({
  plan: 'free', source: null, expiresAt: null, renews: false, trial: { eligible: true, endsAt: null }, subscription: null, ...over,
});

describe('PricingPage', () => {
  it('shows a translated reason when the trial was already used, not the English server text', async () => {
    await i18n.changeLanguage('es-PE');
    entitlementState.entitlement = entitlement({});
    api.startTrial.mockRejectedValue(new ApiRequestError(409, 'TRIAL_NOT_AVAILABLE', 'The free trial has already been used on this account'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /prueba/i }));
    expect((await screen.findByRole('alert')).textContent).toBe('La prueba gratis ya se usó en esta cuenta.');
  });

  it('offers no "manage subscription" button to someone on a Yape/card pass', async () => {
    await i18n.changeLanguage('en');
    entitlementState.entitlement = entitlement({
      plan: 'pro', source: 'subscription', expiresAt: '2026-11-01T00:00:00Z', trial: { eligible: false, endsAt: null },
      subscription: { provider: 'mercadopago', status: 'active', interval: 'pass', currentPeriodEnd: '2026-11-01T00:00:00Z', cancelAtPeriodEnd: true },
    });
    await renderPage();
    expect(screen.queryByRole('button', { name: /manage or cancel/i })).toBeNull();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeTruthy();
  });

  it('says "1 day left", not "1 days left"', async () => {
    await i18n.changeLanguage('en');
    const tomorrow = new Date(Date.now() + 20 * 3600 * 1000).toISOString();
    entitlementState.entitlement = entitlement({ plan: 'pro', source: 'trial', expiresAt: tomorrow, trial: { eligible: false, endsAt: tomorrow } });
    await renderPage();
    expect(screen.getByText(/\(1 day left\)/)).toBeTruthy();
  });

  it('lists the free routine limit the person actually has, and unlimited routines with Pro', async () => {
    await i18n.changeLanguage('en');
    entitlementState.entitlement = entitlement({});
    for (const [variant, count] of [['three', 3], ['three_plus_surprise', 3], ['five', 5]] as const) {
      window.history.replaceState(null, '', `/pricing?exp_routine_free_limit=${variant}`);
      await renderPage();
      const free = screen.getByRole('region', { name: 'Free' });
      expect(free.textContent).toContain(`Up to ${count} routines`);
      expect(screen.getByRole('region', { name: /^Pro/ }).textContent).toContain('Unlimited routines');
      cleanup();
    }
    window.history.replaceState(null, '', '/');
  });

  it('confirms a payment when the person comes back from Mercado Pago', async () => {
    await i18n.changeLanguage('en');
    entitlementState.entitlement = entitlement({});
    window.history.replaceState(null, '', '/pricing?collection_status=approved&payment_id=123');
    await renderPage();
    expect((await screen.findByRole('status')).textContent).toMatch(/Payment received/);
    expect(window.location.search).toBe('');
  });
});

describe('PricingPage where Pro is not on sale yet (billing off)', () => {
  beforeEach(() => { vi.stubEnv('VITE_BILLING_ENABLED', 'false'); });

  it('shows the planned plans and prices, says Pro is not on sale, and offers nothing to buy', async () => {
    await i18n.changeLanguage('en');
    for (const userId of [null, 'user_1']) {
      auth.userId = userId;
      entitlementState.entitlement = userId ? entitlement({}) : null;
      await renderPage();
      expect(screen.getByText(/Pro isn't on sale yet: these are the plans and prices we intend to offer/)).toBeTruthy();
      expect(screen.getByText('Not on sale yet')).toBeTruthy();
      expect(screen.getByRole('region', { name: /^Pro/ }).textContent).toMatch(/\$6\.99|S\/\s?14\.90/);
      // No trial, subscribe, sign-up or pass buttons, and no cancelling terms.
      expect(screen.queryAllByRole('button')).toEqual([]);
      expect(screen.queryByText(/Cancel anytime/)).toBeNull();
      cleanup();
    }
    auth.userId = 'user_1';
    expect(track).toHaveBeenCalledWith('paywall_viewed', expect.objectContaining({ selling: false }));
  });

  it('lists account saving only where this build saves to an account, and no ads where none run', async () => {
    await i18n.changeLanguage('en');
    entitlementState.entitlement = entitlement({});
    vi.stubEnv('VITE_SYNC_ENABLED', 'false');
    await renderPage();
    const free = () => screen.getByRole('region', { name: 'Free' }).textContent ?? '';
    expect(free()).not.toContain('saved to your account');
    expect(free()).not.toContain('A small ad');
    cleanup();
    vi.stubEnv('VITE_SYNC_ENABLED', 'true');
    await renderPage();
    expect(free()).toContain('Tasks, calendar and budget saved to your account, on all your devices');
  });

  it('lists the small ad where ads run beside Pro, and not where ads are switched off', async () => {
    await i18n.changeLanguage('en');
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    vi.stubEnv('VITE_ADS_PROVIDER', 'house');
    entitlementState.entitlement = entitlement({});
    await renderPage();
    expect(screen.getByRole('region', { name: 'Free' }).textContent).toContain('A small ad on a few quiet pages');
    cleanup();
    vi.stubEnv('VITE_ADS_PROVIDER', 'off');
    await renderPage();
    expect(screen.getByRole('region', { name: 'Free' }).textContent).not.toContain('A small ad');
  });
});
