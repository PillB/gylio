/**
 * financeAssumptions.js — the inputs behind docs/billing report numbers.
 * Each value names its source; [A] marks an assumption to replace with real data.
 */

'use strict';

const { PLANS } = require('./plans');

const base = {
  months: 36,
  // Demand [A]: 300 sign-ups in month 1, growth 8% fading 5% a month (vocal-studio lesson:
  // compounding 8% for 3 years is 15×, which almost nobody achieves).
  signups0: 300,
  signupGrowth: 0.08,
  growthFade: 0.95,
  // Months 1–3 are a gifted beta: nobody is charged and no RUC is needed (see report).
  betaMonths: 3,
  // Adapty: 31–65% start a trial depending on paywall timing; 30% assumed, below the midpoint [A].
  trialStartRate: 0.3,
  // Recurly: no-card trials convert ~12% vs ~40% with a card up front; 10% assumed [A].
  trialToPaid: 0.1,
  // Freemium conversion of retained free users per month (freemium median ~2.1% by day 35) [A: 0.2%/month].
  freemiumMonthly: 0.002,
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
  // Compliance floor once the RUC exists: contador S/250 (RMT entry price, get 3 quotes) = $66.67.
  // No per-charge boletas with Paddle as merchant of record (one monthly export factura via free SEE-SOL);
  // add S/70 (NubeFact) = $18.67 if Mercado Pago passes are switched on.
  fixedMonthly: 66.67,
  // Paddle payout wire up to $15 when a payout is made.
  payoutFeeMonthly: 15,
  // AdSense only after approval (~month 4); ~4 ad pageviews per free user per month; blended RPM $2.5 (Peru $0.8–1.8, US $5–15).
  adsStartMonth: 3,
  adPageviewsPerFreeUser: 4,
  adRpmUsd: 2.5,
  // RMT: 10% on profit up to 15 UIT.
  incomeTaxRate: 0.1,
  // Up-front: INDECOPI classes 9+42 (S/1,068 ≈ $285), domain ($10), accountant set-up [A $100].
  initialInvestment: 395,
  // Peru SME cost of capital [A]; the result barely moves with it (see report).
  discountRateAnnual: 0.15,
  // The founder's time, valued like the vocal-studio model: hours so far × Lima senior rate S/120 ($32).
  hoursInvested: 60,
  hourlyRateUsd: 32,
};

const scenarios = {
  pessimistic: { ...base, signups0: 150, signupGrowth: 0, trialToPaid: 0.07, monthlyChurn: 0.12, freemiumMonthly: 0.001 },
  base,
  optimistic: { ...base, signups0: 500, signupGrowth: 0.15, trialStartRate: 0.4, trialToPaid: 0.14, monthlyChurn: 0.07, annualShare: 0.45 },
};

module.exports = { base, scenarios };
