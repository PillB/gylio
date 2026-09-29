/**
 * financeModel.js — unit economics, break-even, NPV, ROI, payback and price
 * sensitivity for Gylio Pro. Pure and deterministic; every input is explicit.
 *
 * Method, and its limits (stated in the report too):
 *  - A monthly cohort simulation over `months`. New sign-ups arrive each month;
 *    a share start the 7-day trial, a share of trials convert, and free users
 *    also convert slowly (freemium). Payers pick monthly or yearly.
 *  - Yearly plans are paid up front (cash timing matters for NPV and payback);
 *    they renew at `annualRenewal` after 12 months. Monthly plans churn each month.
 *  - Prices are tax-inclusive. The merchant of record (Paddle) remits the tax
 *    and keeps 5% + $0.50 of the gross; PEN takes an FX spread when converted.
 *  - Demand response to price is NOT known for Gylio. Price sensitivity uses a
 *    constant-elasticity assumption on conversion, run at several elasticities,
 *    so the answer is a range, not a point estimate.
 */

'use strict';

const round2 = (x) => Math.round(x * 100) / 100;

/** Seller's net from one tax-inclusive charge through a merchant of record. */
function netPerCharge(gross, { taxRate, feePct, feeFixed, fxSpread = 0 }) {
  const tax = gross - gross / (1 + taxRate);
  const fee = gross * feePct + feeFixed;
  return (gross - tax - fee) * (1 - fxSpread);
}

/** Monthly discount rate equivalent to an annual rate. */
const monthlyRate = (annual) => (1 + annual) ** (1 / 12) - 1;

function npv(cashflows, annualRate) {
  const r = monthlyRate(annualRate);
  return cashflows.reduce((sum, cf, t) => sum + cf / (1 + r) ** t, 0);
}

/** First month index where the running total is >= 0, or null if never. */
function paybackMonth(cashflows) {
  let total = 0;
  for (let t = 0; t < cashflows.length; t += 1) {
    total += cashflows[t];
    if (total >= 0 && t > 0) return t;
  }
  return null;
}

/** Infra cost by active users, linear between the researched anchor points. */
function infraCost(mau, anchors) {
  if (mau <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i += 1) {
    const [x1, y1] = anchors[i];
    const [x0, y0] = anchors[i - 1];
    if (mau <= x1) return y0 + ((mau - x0) / (x1 - x0)) * (y1 - y0);
  }
  const [xl, yl] = anchors[anchors.length - 1];
  return yl * (mau / xl);
}

/** Net per payer from each price, blended across currencies. */
function planNets(p) {
  const markets = [
    { share: p.peruShare, currency: 'PEN', taxRate: p.taxPeru, fx: p.fxSpread, toUsd: 1 / p.penPerUsd },
    { share: 1 - p.peruShare, currency: 'USD', taxRate: p.taxIntl, fx: 0, toUsd: 1 },
  ];
  const blend = (plan) => markets.reduce((sum, m) => {
    const grossUsd = (plan[m.currency] / 100) * m.toUsd;
    const net = netPerCharge(grossUsd, { taxRate: m.taxRate, feePct: p.feePct, feeFixed: p.feeFixed, fxSpread: m.fx });
    return sum + m.share * net;
  }, 0);
  return { monthly: blend(p.prices.monthly), yearly: blend(p.prices.yearly) };
}

function newPayers(state, t, p) {
  const signups = p.signups0 * (1 + p.signupGrowth) ** t;
  const fromTrial = signups * p.trialStartRate * p.trialToPaid;
  const fromFree = state.free * p.freemiumMonthly;
  return { signups, payers: (fromTrial + fromFree) * p.conversionMultiplier, fromFree };
}

function stepMonth(state, t, p, nets) {
  const { signups, payers, fromFree } = newPayers(state, t, p);
  const newYearly = payers * p.annualShare;
  const newMonthly = payers - newYearly;
  const renewingYearly = t >= 12 ? state.yearlyCohorts[t - 12] * p.annualRenewal : 0;
  state.yearlyCohorts[t] = newYearly + renewingYearly;
  state.monthly = state.monthly * (1 - p.monthlyChurn) + newMonthly;
  state.free = state.free * p.freeRetention + signups * (1 - p.trialStartRate * p.trialToPaid) - fromFree;

  const activeYearly = state.yearlyCohorts.slice(Math.max(0, t - 11), t + 1).reduce((a, b) => a + b, 0);
  const revenue = state.monthly * nets.monthly + state.yearlyCohorts[t] * nets.yearly;
  const mau = state.free + state.monthly + activeYearly;
  const adsRevenue = t >= p.adsStartMonth ? state.free * p.adPageviewsPerFreeUser * p.adRpmUsd / 1000 : 0;
  const costs = infraCost(mau, p.infraAnchors) + p.fixedMonthly + (revenue > 100 ? p.payoutFeeMonthly : 0);
  const preTax = revenue + adsRevenue - costs;
  const cashflow = preTax > 0 ? preTax * (1 - p.incomeTaxRate) : preTax;
  return {
    month: t + 1, mau: Math.round(mau), payers: Math.round(state.monthly + activeYearly),
    mrr: round2(state.monthly * nets.monthly + activeYearly * nets.yearly / 12),
    revenue: round2(revenue), ads: round2(adsRevenue), costs: round2(costs), cashflow: round2(cashflow),
  };
}

function simulate(params) {
  const p = { ...params };
  const nets = planNets(p);
  const state = { free: 0, monthly: 0, yearlyCohorts: [] };
  const rows = [];
  for (let t = 0; t < p.months; t += 1) rows.push(stepMonth(state, t, p, nets));
  const cashflows = [-p.initialInvestment, ...rows.map((r) => r.cashflow)];
  const cumulative = cashflows.reduce((a, b) => a + b, 0);
  return {
    nets: { monthly: round2(nets.monthly), yearly: round2(nets.yearly) },
    rows,
    npv: round2(npv(cashflows, p.discountRateAnnual)),
    roi: p.initialInvestment > 0 ? round2(cumulative / p.initialInvestment) : null,
    paybackMonth: paybackMonth(cashflows),
    firstProfitableMonth: (rows.find((r) => r.cashflow > 0) || {}).month ?? null,
  };
}

/** Break-even paying users per month: fixed + infra costs / blended net per payer-month. */
function breakEvenPayers(p, mau) {
  const nets = planNets(p);
  const perPayerMonth = p.annualShare * nets.yearly / 12 + (1 - p.annualShare) * nets.monthly;
  const costs = infraCost(mau, p.infraAnchors) + p.fixedMonthly + p.payoutFeeMonthly;
  return Math.ceil(costs / perPayerMonth);
}

/** Scale every price by `factor` and conversion by factor^elasticity; return NPV. */
function priceScenario(base, factor, elasticity) {
  const scale = (prices) => Object.fromEntries(Object.entries(prices).map(([c, v]) => [c, Math.round(v * factor)]));
  return simulate({
    ...base,
    prices: { monthly: scale(base.prices.monthly), yearly: scale(base.prices.yearly) },
    conversionMultiplier: base.conversionMultiplier * factor ** elasticity,
  });
}

/** NPV-maximising price factor per elasticity, from a grid of factors. */
function priceSensitivity(base, factors, elasticities) {
  return elasticities.map((e) => {
    const points = factors.map((f) => ({ factor: f, npv: priceScenario(base, f, e).npv }));
    const best = points.reduce((a, b) => (b.npv > a.npv ? b : a));
    return { elasticity: e, points, bestFactor: best.factor };
  });
}

module.exports = {
  breakEvenPayers,
  infraCost,
  monthlyRate,
  netPerCharge,
  npv,
  paybackMonth,
  planNets,
  priceScenario,
  priceSensitivity,
  simulate,
};
