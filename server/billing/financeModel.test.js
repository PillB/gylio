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
    const yearlyOnly = m.simulate({ ...base, betaMonths: 0, annualShare: 1, months: 2 });
    const monthlyOnly = m.simulate({ ...base, betaMonths: 0, annualShare: 0, months: 2 });
    expect(yearlyOnly.rows[0].revenue).toBeGreaterThan(monthlyOnly.rows[0].revenue);
  });
});

describe('breakEvenPayers', () => {
  it('matches a hand calculation for a single-market case', () => {
    const p = { ...base, fixedMonthly: 40, peruShare: 0, taxIntl: 0, annualShare: 0, prices: { monthly: { USD: 1000, PEN: 0 }, yearly: { USD: 0, PEN: 0 } } };
    // net per month = 10 − 0.5 − 0.5 = 9; costs at 1k MAU = 1 + 40 + 15 = 56 → ceil(56/9) = 7
    expect(m.breakEvenPayers(p, 1000)).toBe(7);
  });
});

describe('conversion keeps the free pool honest', () => {
  it('moves exactly the converted users out of the free pool, whatever the multiplier', () => {
    // Month 1, no beta: 300 sign-ups x 30% start x 10% convert = 9 payers at multiplier 1.
    // Everyone is either free or paying, so active users must equal the 300 who signed up.
    for (const conversionMultiplier of [1, 2, 0.5]) {
      const r = m.simulate({ ...base, betaMonths: 0, months: 1, conversionMultiplier });
      expect(r.rows[0].mau).toBe(300);
      expect(r.rows[0].payers).toBe(Math.round(9 * conversionMultiplier));
    }
  });
});

describe('payoutFee', () => {
  it('is zero with no money, never more than the money received, and capped at the wire fee', () => {
    expect(m.payoutFee(0, { payoutFeeMonthly: 15 })).toBe(0);
    expect(m.payoutFee(8, { payoutFeeMonthly: 15 })).toBe(8);
    expect(m.payoutFee(100.01, { payoutFeeMonthly: 15 })).toBe(15);
    expect(m.payoutFee(99.99, { payoutFeeMonthly: 15 })).toBe(15); // no cliff at $100
  });
});

describe('incomeTax (RMT bracket with loss carry-forward)', () => {
  const p = { rmtThresholdPen: 3750, penPerUsd: 3.75, incomeTaxRate: 0.1, incomeTaxRateHigh: 0.3 }; // threshold $1,000
  it('offsets earlier losses, then taxes 10% up to the threshold and 30% above, per calendar year', () => {
    const tax = [];
    let st = { carry: 0, ytd: 0 };
    [-200, 900, 600].forEach((pre, t) => { const r = m.incomeTax(pre, t, st, p); tax.push(r.tax); st = r.state; });
    // t1: 900 - 200 loss = 700 taxable -> 70. t2: ytd 700 -> 1300: 300 x 10% + 300 x 30% = 120.
    expect(tax).toEqual([0, 70, 120]);
    // a new calendar year (t=12) restarts the bracket: 500 x 10% = 50
    expect(m.incomeTax(500, 12, st, p).tax).toBe(50);
  });
});

describe('breakEvenPayers mix', () => {
  it('weights plans by who is still paying, not by who signed up', () => {
    // 50% of sign-ups choose yearly, but yearly payers stay 12 months and monthly ones 1/0.10 = 10, so
    // 12/(12+10) = 6/11 of payers on any day are yearly. Per payer-month: 6/11 x 56.5/12 + 5/11 x 9 = 6.6591.
    // Costs at 1k MAU: 1 + 140 + 15 = 156 -> 156 / 6.6591 = 23.43 -> 24 (the sign-up mix would say 23).
    const p = { ...base, fixedMonthly: 140, peruShare: 0, taxIntl: 0, annualShare: 0.5, monthlyChurn: 0.1, annualRenewal: 0,
      prices: { monthly: { USD: 1000, PEN: 0 }, yearly: { USD: 6000, PEN: 0 } } };
    expect(m.breakEvenPayers(p, 1000)).toBe(24);
  });
});

describe('priceSensitivity', () => {
  it('with inelastic demand the best price is higher than with elastic demand', () => {
    const factors = [0.6, 0.8, 1, 1.2, 1.5, 2];
    const [inelastic, elastic] = m.priceSensitivity(base, factors, [-0.5, -2]);
    expect(inelastic.bestFactor).toBeGreaterThan(elastic.bestFactor);
  });
});

describe('vocal-studio lessons', () => {
  it('fades growth instead of compounding it', () => {
    // month 3 = 300 × 1.08 × (1 + 0.08 × 0.95) = 348.624
    expect(m.signupsAt(2, { signups0: 300, signupGrowth: 0.08, growthFade: 0.95 })).toBeCloseTo(348.624, 3);
    // 36 months of fading 8% stays far below the 15× of pure compounding
    const month36 = m.signupsAt(35, { signups0: 300, signupGrowth: 0.08, growthFade: 0.95 });
    expect(month36 / 300).toBeLessThan(5);
  });

  it('charges nobody during the gifted beta and pays only infrastructure then', () => {
    const r = m.simulate({ ...base, months: 5 });
    for (const row of r.rows.slice(0, 3)) {
      expect(row.revenue).toBe(0);
      expect(row.costs).toBeLessThan(5);
    }
    expect(r.rows[3].costs).toBeGreaterThan(base.fixedMonthly);
  });

  it('states return on hours as cash made over the value of the time', () => {
    const r = m.simulate({ ...base, hoursInvested: 10, hourlyRateUsd: 10 });
    expect(r.returnOnHours).toBeCloseTo(r.cumulative / 100, 2);
  });

  it('indexes linear demand to 100 buyers at the reference price', () => {
    const band = m.linearDemandBand([1000, 1490, 2000], { referenceMinor: 1490, beta: 1.2, keptPerCharge: (p) => p / 100 });
    expect(band[1].index).toBe(1490); // 100 buyers × 14.90 kept
    // 1000: 100 × (1 − 1.2 × (1000/1490 − 1)) = 139.46 buyers × 10.00
    expect(band[0].index).toBe(1395);
  });
});

