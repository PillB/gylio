import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { themes } from '../core/themes';
import { track } from '../core/analytics';
import WelcomeBackBanner, { touchLastActive } from './WelcomeBackBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // An interpolated day count shows up in the text, so a test can read the gap.
    t: (key: string, options?: { days?: number }) =>
      typeof options?.days === 'number' ? `${key}:${options.days}` : key,
  }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/analytics', () => ({
  track: vi.fn(),
  Events: new Proxy({}, { get: (_target, key) => String(key) }),
}));

// The banner compares two stored ISO dates, so month and year boundaries are
// where a slip in the date arithmetic shows up.
function openOn(today: string, lastActive: string) {
  // Local noon: the banner reads the local day, and noon is a day away from either edge in every zone.
  vi.setSystemTime(new Date(`${today}T12:00:00`));
  localStorage.setItem('gylio:lastActiveDate', lastActive);
  render(<WelcomeBackBanner />);
}

describe('WelcomeBackBanner gap between visits', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(track).mockClear();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each([
    ['across a January to February boundary', '2026-02-02', '2026-01-30', 3],
    ['when the earlier month is shorter than the next one', '2026-02-02', '2026-01-29', 4],
    ['across a year boundary', '2026-01-02', '2025-12-30', 3],
  ])('shows the banner with the real gap %s', (_label, today, lastActive, gap) => {
    openOn(today, lastActive);

    expect(screen.getByText(`welcomeBack.gapNote:${gap}`)).toBeTruthy();
    expect(track).toHaveBeenCalledWith('WELCOME_BACK_SHOWN', { gapDays: gap, lastStreak: null });
  });

  it('stays hidden for a two-day gap across a month end', () => {
    openOn('2026-03-02', '2026-02-28');

    expect(screen.queryByRole('complementary')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

// The stamp that says "I was here today" is a calendar day. It is read from the local clock; the UTC day would be
// tomorrow from 19:00 in Lima, and a dismissal made at 18:00 would stop holding at 20:00.
describe('WelcomeBackBanner day stamp in Lima', () => {
  beforeEach(() => {
    localStorage.clear();
    process.env.TZ = 'America/Lima';
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete process.env.TZ;
  });

  it('stamps the local day in the evening', () => {
    vi.setSystemTime(new Date('2026-11-21T01:30:00Z')); // Fri 20 Nov, 20:30 in Lima
    touchLastActive();
    expect(localStorage.getItem('gylio:lastActiveDate')).toBe('2026-11-20');
  });

  it('stays dismissed for the rest of the local day', () => {
    vi.setSystemTime(new Date('2026-11-20T23:00:00Z')); // 18:00 in Lima
    localStorage.setItem('gylio:lastActiveDate', '2026-11-10');
    const first = render(<WelcomeBackBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'welcomeBack.continueAriaLabel' }));
    first.unmount();

    vi.setSystemTime(new Date('2026-11-21T01:30:00Z')); // 20:30 the same day in Lima
    render(<WelcomeBackBanner />);
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
