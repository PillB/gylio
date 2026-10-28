/** Pricing behaviour the review found broken, checked through the real page. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.js';
import i18n from 'i18next';

const auth = { userId: 'user_1' as string | null, authLoaded: true };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
const entitlementState = { entitlement: null as unknown, setEntitlement: vi.fn(), refresh: vi.fn() };
vi.mock('../billing/EntitlementContext', () => ({ useEntitlement: () => entitlementState }));
vi.mock('../../core/analytics', () => ({ track: vi.fn() }));
const api = vi.hoisted(() => ({ startTrial: vi.fn(), plans: vi.fn(), portal: vi.fn() }));
vi.mock('../billing/billingApi', async (orig) => ({ ...(await orig<typeof import('../billing/billingApi')>()), billingApi: api }));

import { ThemeProvider } from '../../core/context/ThemeContext';
import { ApiRequestError } from '../billing/billingApi';
import PricingPage from './PricingPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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

  it('confirms a payment when the person comes back from Mercado Pago', async () => {
    await i18n.changeLanguage('en');
    entitlementState.entitlement = entitlement({});
    window.history.replaceState(null, '', '/pricing?collection_status=approved&payment_id=123');
    await renderPage();
    expect((await screen.findByRole('status')).textContent).toMatch(/Payment received/);
    expect(window.location.search).toBe('');
  });
});
