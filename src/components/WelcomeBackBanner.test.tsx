import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { themes } from '../core/themes';
import { track } from '../core/analytics';
import WelcomeBackBanner from './WelcomeBackBanner';

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
  vi.setSystemTime(new Date(`${today}T12:00:00Z`));
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
