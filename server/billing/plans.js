/**
 * plans.js — the Pro catalogue shown in the app.
 *
 * Amounts here are for display and for checking Mercado Pago payments. For
 * Paddle, the price objects in the Paddle dashboard are the source of truth for
 * what is charged; keep these numbers equal to them. Minor units (cents/céntimos).
 *
 * Why these numbers (see docs/billing/PRICING_MODEL.md for the full model):
 *  - USD yearly 49.99 sits with TickTick (49.99) and below Todoist (~60) and
 *    Tiimo (79.99); the monthly price makes yearly a clear ~40% saving.
 *  - PEN is a purchasing-power price for Peru rather than a currency conversion.
 */

'use strict';

const TRIAL_DAYS = 7;

const PLANS = {
  pro_monthly: {
    interval: 'month',
    prices: { USD: 699, PEN: 1490 },
    paddlePriceEnv: 'PADDLE_PRICE_PRO_MONTHLY',
  },
  pro_yearly: {
    interval: 'year',
    prices: { USD: 4999, PEN: 9900 },
    paddlePriceEnv: 'PADDLE_PRICE_PRO_YEARLY',
  },
};

/** One-time prepaid passes (Mercado Pago: cards and Yape). They never auto-renew. */
const PASSES = {
  pass_30: { days: 30, currency: 'PEN', amountMinor: 1490 },
  pass_365: { days: 365, currency: 'PEN', amountMinor: 9900 },
};

function publicCatalog(env = process.env) {
  return {
    trialDays: TRIAL_DAYS,
    plans: Object.entries(PLANS).map(([id, plan]) => ({
      id,
      interval: plan.interval,
      prices: plan.prices,
      available: Boolean(env.PADDLE_API_KEY && env[plan.paddlePriceEnv]),
    })),
    passes: Object.entries(PASSES).map(([id, pass]) => ({
      id,
      days: pass.days,
      currency: pass.currency,
      amountMinor: pass.amountMinor,
      available: Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_PASSES_ENABLED === 'true'),
    })),
  };
}

module.exports = { PASSES, PLANS, TRIAL_DAYS, publicCatalog };
