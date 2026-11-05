/**
 * The Pro prompt with the real English catalogue: where Pro can be bought it offers the trial and the price from the
 * pricing catalogue; where it can't (billing off) it says so and offers nothing to buy.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.js';

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../core/analytics')>()),
  track,
}));

import { UpgradePrompt } from './UpgradePrompt';
import { TourProNudge } from '../../components/GuidedTourOverlay';

const renderPrompt = (props: Partial<React.ComponentProps<typeof UpgradePrompt>> = {}) =>
  render(<MemoryRouter><UpgradePrompt featureName="Social" outcomes={['Plan time with friends']} {...props} /></MemoryRouter>);

afterEach(() => { cleanup(); track.mockClear(); vi.unstubAllEnvs(); });

describe('the Pro prompt', () => {
  it('says Pro, not Premium, and offers the trial and the catalogue price where Pro can be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    renderPrompt();
    const region = screen.getByRole('region', { name: 'A Pro feature' });
    expect(region.textContent).toContain('Social is part of Pro');
    expect(region.textContent).toContain('Start a 7-day free trial');
    expect(screen.getByRole('button', { name: 'Start 7-day free trial' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'See plans' })).toBeTruthy();
    expect(region.textContent).toMatch(/(\$6\.99 a month, or \$49\.99 a year)|(S\/\s?14\.90 a month, or S\/\s?99\.00 a year)/);
    expect(region.textContent).not.toMatch(/Premium|\$12|\$10/);
    expect(track).toHaveBeenCalledWith('upgrade_prompt_viewed', expect.objectContaining({ selling: true }));
  });

  it('says Pro is not on sale yet and offers nothing to buy where it cannot be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    renderPrompt();
    const region = screen.getByRole('region', { name: 'A Pro feature' });
    expect(region.textContent).toContain("This is part of Gylio Pro, which isn't on sale yet. Everything else in Gylio is free to use now.");
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(region.textContent).not.toMatch(/trial|\$|S\//);
    expect(track).toHaveBeenCalledWith('upgrade_prompt_viewed', expect.objectContaining({ selling: false }));
  });

  it('keeps the compact prompt to a label where Pro cannot be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    renderPrompt({ compact: true });
    expect(screen.getByText('✦ Pro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try free' })).toBeNull();
    cleanup();
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    renderPrompt({ compact: true });
    expect(screen.getByRole('button', { name: 'Try free' })).toBeTruthy();
  });
});

describe('the guided tour on a Pro screen', () => {
  it('offers the trial only where Pro can be bought', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    const { container } = render(<TourProNudge onUnlock={() => undefined} />);
    expect(container.textContent).toBe('');
    cleanup();
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    render(<TourProNudge onUnlock={() => undefined} />);
    expect(screen.getByRole('button', { name: /Start 7-day free trial to unlock/ })).toBeTruthy();
  });
});
