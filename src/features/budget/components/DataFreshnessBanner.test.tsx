import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { contrastRatio, themes } from '../../../core/themes';
import { track } from '../../../core/analytics';
import DataFreshnessBanner from './DataFreshnessBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../../../core/analytics', () => ({ track: vi.fn(), Events: new Proxy({}, { get: (_t, k) => String(k) }) }));

const rgbToHex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

const thisMonth = monthKey(new Date());
const lastMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15));
const nextMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15));

describe('DataFreshnessBanner', () => {
  beforeEach(() => vi.mocked(track).mockClear());

  it('renders the stale label as AA text on the surface', () => {
    render(<DataFreshnessBanner lastTransactionDate={new Date(2020, 0, 1)} budgetMonthKey={thisMonth} />);
    const label = screen.getByText('Data may be stale');
    const color = rgbToHex(getComputedStyle(label).color);
    expect(contrastRatio(color, themes.light.colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  describe('which budget month it judges', () => {
    it('warns when the current month has no recent transactions', () => {
      render(<DataFreshnessBanner lastTransactionDate={null} budgetMonthKey={thisMonth} />);
      expect(screen.getByRole('alert').textContent).toContain('Data may be stale');
    });

    it('suggests a review when the last transaction is a few days old', () => {
      render(<DataFreshnessBanner lastTransactionDate={daysAgo(3)} budgetMonthKey={thisMonth} />);
      expect(screen.getByRole('status').textContent).toContain('Review suggested');
    });

    it('stays silent for a past month, whose old transactions are expected', () => {
      const { container } = render(
        <DataFreshnessBanner lastTransactionDate={daysAgo(40)} budgetMonthKey={lastMonth} />,
      );

      expect(container.firstChild).toBeNull();
      expect(track).not.toHaveBeenCalled();
    });

    it('stays silent for a month that has not started, which has no transactions yet', () => {
      const { container } = render(<DataFreshnessBanner lastTransactionDate={null} budgetMonthKey={nextMonth} />);

      expect(container.firstChild).toBeNull();
      expect(track).not.toHaveBeenCalled();
    });
  });

  // The analytics queue is kept in localStorage, so an event must not carry the date of a
  // transaction or the month a budget covers.
  describe('the stale-warning analytics event', () => {
    it.each([
      ['10 days old', daysAgo(10), '8-30'],
      ['45 days old', daysAgo(45), '31-90'],
      ['200 days old', daysAgo(200), '90+'],
      ['missing', null, 'never'],
    ])('records only a day bucket when the last transaction is %s', (_label, lastTransactionDate, bucket) => {
      render(<DataFreshnessBanner lastTransactionDate={lastTransactionDate} budgetMonthKey={thisMonth} />);

      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith('BUDGET_DATA_STALE_WARNING_SHOWN', { daysSinceLastTransaction: bucket });
    });

    it('records nothing while the data is fresh', () => {
      render(<DataFreshnessBanner lastTransactionDate={daysAgo(0)} budgetMonthKey={thisMonth} />);

      expect(track).not.toHaveBeenCalled();
    });
  });
});
