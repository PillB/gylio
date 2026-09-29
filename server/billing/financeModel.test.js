import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const m = require('./financeModel');
const { base, scenarios } = require('./financeAssumptions');

// Anchors are worked out by hand in the comments, not taken from the code.
describe('netPerCharge', () => {
  it('removes tax, then the 5% + $0.50 fee on the gross', () => {
    // tax = 49.99 − 49.99/1.08 = 3.70296; fee = 2.4995 + 0.5 = 2.9995; net = 43.28754
    expect(m.netPerCharge(49.99, { taxRate: 0.08, feePct: 0.05, feeFixed: 0.5 })).toBeCloseTo(43.2875, 3);
  });
  it('shows how the fixed fee eats a small monthly charge', () => {
    // S/14.90 = $3.9733; tax 18% → 0.6061; fee 0.19867 + 0.5; FX 1.5% → (3.9733 − 0.6061 − 0.6987) × 0.985 = 2.6286
    expect(m.netPerCharge(14.9 / 3.75, { taxRate: 0.18, feePct: 0.05, feeFixed: 0.5, fxSpread: 0.015 })).toBeCloseTo(2.6286, 3);
  });
});

describe('npv, payback, infra', () => {
  it('discounts at the monthly equivalent of the annual rate', () => {
    // 12.682503% a year is exactly 1% a month: −100 + 110/1.01 = 8.9109
    expect(m.npv([-100, 110], 0.12682503)).toBeCloseTo(8.9109, 3);
  });
  it('finds the month the running total turns non-negative', () => {
    expect(m.paybackMonth([-100, 30, 30, 40])).toBe(3);
    expect(m.paybackMonth([-100, 10, 10])).toBeNull();
  });
  it('interpolates infra cost between the researched anchors', () => {
    // 5,500 MAU: 1 + (4,500/9,000) × 15 = 8.5
    expect(m.infraCost(5500, base.infraAnchors)).toBeCloseTo(8.5, 6);
    expect(m.infraCost(200, base.infraAnchors)).toBe(1);
  });
});

describe('simulate', () => {
  it('never recovers the investment with no sign-ups', () => {
    const result = m.simulate({ ...base, signups0: 0 });
    expect(result.paybackMonth).toBeNull();
    expect(result.npv).toBeLessThan(-base.initialInvestment);
  });

  it('orders the scenarios: pessimistic < base < optimistic NPV', () => {
    const [p, b, o] = ['pessimistic', 'base', 'optimistic'].map((k) => m.simulate(scenarios[k]).npv);
    expect(p).toBeLessThan(b);
    expect(b).toBeLessThan(o);
  });

  it('collects a yearly plan up front, so cash in month 1 exceeds 1/12 of the year', () => {
    const yearlyOnly = m.simulate({ ...base, annualShare: 1, months: 2 });
    const monthlyOnly = m.simulate({ ...base, annualShare: 0, months: 2 });
    expect(yearlyOnly.rows[0].revenue).toBeGreaterThan(monthlyOnly.rows[0].revenue);
  });
});

describe('breakEvenPayers', () => {
  it('matches a hand calculation for a single-market case', () => {
    const p = { ...base, peruShare: 0, taxIntl: 0, annualShare: 0, prices: { monthly: { USD: 1000, PEN: 0 }, yearly: { USD: 0, PEN: 0 } } };
    // net per month = 10 − 0.5 − 0.5 = 9; costs at 1k MAU = 1 + 40 + 15 = 56 → ceil(56/9) = 7
    expect(m.breakEvenPayers(p, 1000)).toBe(7);
  });
});

describe('priceSensitivity', () => {
  it('with inelastic demand the best price is higher than with elastic demand', () => {
    const factors = [0.6, 0.8, 1, 1.2, 1.5, 2];
    const [inelastic, elastic] = m.priceSensitivity(base, factors, [-0.5, -2]);
    expect(inelastic.bestFactor).toBeGreaterThan(elastic.bestFactor);
  });
});
