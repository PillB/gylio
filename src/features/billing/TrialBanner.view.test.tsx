/** The trial reminder on screen: still said where Pro can't be bought, but with no link to plans there. */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.js';

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const endsAt = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
vi.mock('./EntitlementContext', () => ({
  useEntitlement: () => ({
    entitlement: { plan: 'pro', source: 'trial', expiresAt: endsAt, renews: false, trial: { eligible: false, endsAt }, subscription: null },
  }),
}));

import { TrialBanner } from './TrialBanner';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllEnvs(); });

describe('the trial reminder', () => {
  it('links to plans where Pro can be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    render(<MemoryRouter><TrialBanner /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('link')).toBeTruthy();
  });

  it('still tells the person, without a link to plans that cannot be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    render(<MemoryRouter><TrialBanner /></MemoryRouter>);
    expect(screen.getByRole('status').textContent).toMatch(/2 days/);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
