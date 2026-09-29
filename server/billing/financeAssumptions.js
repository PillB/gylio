/**
 * financeAssumptions.js — the inputs behind docs/billing report numbers.
 * Each value names its source; [A] marks an assumption to replace with real data.
 */

'use strict';

const { PLANS } = require('./plans');

const base = {
  months: 36,
  // Demand [A]: 300 sign-ups in month 1, growing 8% a month (organic + content).
  signups0: 300,
  signupGrowth: 0.08,
  // Adapty: 31–65% start a trial depending on paywall timing; 40% with the paywall after a value moment [A within range].
  trialStartRate: 0.4,
  // Recurly: no-card trials convert ~12% vs ~40% with card up front.
  trialToPaid: 0.12,
  // Freemium conversion of retained free users per month; 3–5% lifetime is "good" [A: 0.3%/month].
  freemiumMonthly: 0.003,
  conversionMultiplier: 1,
  // Productivity apps sell ~77% monthly (secondary source); annual-first paywall assumed to reach 35% [A].
  annualShare: 0.35,
  // Consumer subscription monthly churn 7–10% [A: 9%]; annual renewal ~50% (35% of annual cancels happen in month 1).
  monthlyChurn: 0.09,
  annualRenewal: 0.5,
  // Free-user month-over-month retention [A].
  freeRetention: 0.7,
  // Market mix at launch: Spanish-first, Peru-heavy [A].
  peruShare: 0.6,
  penPerUsd: 3.75,
  // Prices (tax-inclusive), from plans.js.
  prices: {
    monthly: { USD: PLANS.pro_monthly.prices.USD, PEN: PLANS.pro_monthly.prices.PEN },
    yearly: { USD: PLANS.pro_yearly.prices.USD, PEN: PLANS.pro_yearly.prices.PEN },
  },
  // Paddle: 5% + $0.50 all-in; up to ~1.5% FX when PEN converts to the USD payout.
  feePct: 0.05,
  feeFixed: 0.5,
  fxSpread: 0.015,
  // IGV 18% (Peru consumers); blended 8% elsewhere (many US states exempt SaaS, EU ~20%) [A].
  taxPeru: 0.18,
  taxIntl: 0.08,
  // Infra from research-infra: ~$1 at 1k MAU, ~$16 at 10k, ~$55 at 50k.
  infraAnchors: [[1000, 1], [10000, 16], [50000, 55]],
  // Contador ~S/150/month [A]; Paddle payout wire up to $15 when a payout is made.
  fixedMonthly: 40,
  payoutFeeMonthly: 15,
  // AdSense only after approval (~month 4); ~4 ad pageviews per free user per month; blended RPM $2.5 (Peru $0.8–1.8, US $5–15).
  adsStartMonth: 3,
  adPageviewsPerFreeUser: 4,
  adRpmUsd: 2.5,
  // RMT: 10% on profit up to 15 UIT.
  incomeTaxRate: 0.1,
  // Up-front: INDECOPI classes 9+42 (S/1,068 ≈ $285), domain ($10), accountant set-up [A $100].
  initialInvestment: 395,
  // Peru SME cost of capital [A].
  discountRateAnnual: 0.15,
};

const scenarios = {
  pessimistic: { ...base, signups0: 150, signupGrowth: 0.04, trialToPaid: 0.08, monthlyChurn: 0.12, freemiumMonthly: 0.0015 },
  base,
  optimistic: { ...base, signups0: 500, signupGrowth: 0.12, trialToPaid: 0.16, monthlyChurn: 0.07, annualShare: 0.45 },
};

module.exports = { base, scenarios };
