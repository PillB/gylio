/** The routine limit test's results in the admin analytics tab, with the real English catalogue. */
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.js';

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const analytics = vi.hoisted(() => vi.fn());
vi.mock('../billing/billingApi', () => ({ adminApi: { analytics } }));

import { AnalyticsTab } from './AnalyticsTab';

const summary = {
  days: 7, truncated: false, events: 10, sessions: 4, signedInSessions: 1,
  totals: [], funnel: [], experiments: [], ads: [], daily: [],
};

afterEach(() => { cleanup(); analytics.mockReset(); });

describe('the routine limit test in the admin analytics', () => {
  it('shows each group with its 7 to 28 day funnel and its guardrails', async () => {
    analytics.mockResolvedValue({
      ...summary,
      routineLimit: [{ variant: 'three_plus_surprise', exposed: 120, reached1Day: 80, reached7Days: 40, reached28Days: 18, from7To28: 0.45, limitReachedSessions: 30, extraGiven: 38, seePro: 2, created: 150, deleted: 9 }],
    });
    render(<AnalyticsTab />);
    const table = await screen.findByRole('table', { name: 'Routine limit test' });
    const cells = within(table).getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells).toEqual(['three_plus_surprise', '120', '80', '40', '18', '45%', '30', '38', '2', '150', '9']);
    expect(within(table).getByRole('columnheader', { name: '7 → 28 days' })).toBeTruthy();
    expect(screen.getByText(/about 470 devices per group that reached 7 days/)).toBeTruthy();
  });

  it('shows an empty table, not an error, from a server that does not report the test yet', async () => {
    analytics.mockResolvedValue(summary);
    render(<AnalyticsTab />);
    const table = await screen.findByRole('table', { name: 'Routine limit test' });
    expect(within(table).queryAllByRole('cell')).toEqual([]);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
