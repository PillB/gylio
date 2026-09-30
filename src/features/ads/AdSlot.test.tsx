/**
 * AdSlot component tests. Real i18n catalogue and theme; useSubscription and
 * analytics are mocked so entitlement gating and impression tracking can be
 * asserted without a backend.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.js';
import { ThemeProvider } from '../../core/context/ThemeContext';

const trackMock = vi.fn();
vi.mock('../../core/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../core/analytics')>()),
  track: (...args: unknown[]) => trackMock(...args),
}));

const hasFeatureMock = vi.fn(() => false);
vi.mock('../subscription/useSubscription', () => ({
  useSubscription: () => ({
    plan: 'free_user',
    isFree: true,
    isPaid: false,
    hasFeature: (feature: string) => hasFeatureMock(feature),
    trialDays: 7,
  }),
}));

import AdSlot from './AdSlot';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  trackMock.mockClear();
  // mockClear keeps implementations; restore the default (free plan) explicitly
  // so the Pro gate set in one test cannot leak into the next.
  hasFeatureMock.mockReset();
  hasFeatureMock.mockReturnValue(false);
});

function renderSlot(placement: 'settings' | 'qa' | 'rewards' = 'rewards') {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/rewards']}>
        {/* Probe: ThemeProvider holds children until AsyncStorage hydrates.
            This confirms the tree (and AdSlot's effects) actually mounted. */}
        <div data-testid="theme-probe" />
        <AdSlot placement={placement} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('AdSlot', () => {
  it('renders a labeled house card for free accounts and tracks exactly one impression', async () => {
    renderSlot('rewards');
    await screen.findByTestId('theme-probe');
    const ad = await screen.findByRole('complementary', { name: /from gylio/i });
    expect(ad).toBeTruthy();
    const impressions = trackMock.mock.calls.filter(([name]) => name === 'ad_impression');
    expect(impressions).toHaveLength(1);
    expect(impressions[0][1]).toMatchObject({ provider: 'house', placement: 'rewards' });
  });

  it('renders nothing and tracks nothing for ad-free (Pro) accounts', async () => {
    hasFeatureMock.mockReturnValue(true);
    renderSlot('rewards');
    await screen.findByTestId('theme-probe');
    // Give the mounted slot's effects a tick to (wrongly) fire if they would.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('renders nothing and tracks no phantom impression once the session cap is reached', async () => {
    sessionStorage.setItem('ads:house:rewards', '3');
    renderSlot('rewards');
    await screen.findByTestId('theme-probe');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
    // The counter is not consumed further by capped-out mounts.
    expect(sessionStorage.getItem('ads:house:rewards')).toBe('3');
  });
});
