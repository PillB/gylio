import { describe, expect, it } from 'vitest';
import { buildPayoffComparison, simulateDebtPayoff } from './debtPayoff';

const sampleDebts = [
  { id: 'card', balance: 1200, annualRate: 24, minPayment: 60 },
  { id: 'loan', balance: 5000, annualRate: 8, minPayment: 120 },
];

describe('simulateDebtPayoff', () => {
  it('returns null when there are no payable debts', () => {
    expect(simulateDebtPayoff([], 'SNOWBALL', 100)).toBeNull();
    expect(simulateDebtPayoff([{ id: 'zero', balance: 0, annualRate: 12, minPayment: 40 }], 'SNOWBALL', 100)).toBeNull();
  });

  it('returns paidOff=false for infeasible plans', () => {
    const result = simulateDebtPayoff(
      [{ id: 'high-rate', balance: 1000, annualRate: 120, minPayment: 1 }],
      'AVALANCHE',
      0
    );

    expect(result).not.toBeNull();
    expect(result?.paidOff).toBe(false);
  });

  it('pays off debt and reports months and interest', () => {
    const result = simulateDebtPayoff(sampleDebts, 'SNOWBALL', 80);

    expect(result).not.toBeNull();
    expect(result?.paidOff).toBe(true);
    expect(result?.months).toBeGreaterThan(0);
    expect(result?.totalInterest).toBeGreaterThan(0);
    expect(result?.monthlyPayment).toBe(260);
  });

  it('builds side-by-side strategy comparison', () => {
    const comparison = buildPayoffComparison(sampleDebts, 80);

    expect(comparison.SNOWBALL?.months).toBeGreaterThan(0);
    expect(comparison.AVALANCHE?.months).toBeGreaterThan(0);
  });
});
