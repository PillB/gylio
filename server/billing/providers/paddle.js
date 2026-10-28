/**
 * paddle.js — Paddle Billing (merchant of record) for recurring Pro.
 *
 * Paddle is the seller of record: it charges cards/PayPal/Apple Pay/Google Pay
 * in USD or PEN, collects and remits sales tax/IGV, and pays out to the founder.
 *
 * Flow: the server creates a transaction carrying our user id in custom_data
 * (so the browser cannot attach a purchase to someone else's account), the
 * browser opens Paddle.js checkout with that transaction id, and webhooks keep
 * our subscription record in step with Paddle's.
 */

'use strict';

const { fetchJson } = require('../http');
const { PLANS } = require('../plans');

const API = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
};

// Paddle status -> our status. Paddle's "canceled" means access has ended;
// a cancellation that is only scheduled arrives as "active" + scheduled_change.
const STATUS = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  paused: 'paused',
  canceled: 'expired',
};

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
]);

function createPaddleProvider({ env = process.env, fetchImpl } = {}) {
  const base = env.PADDLE_ENV === 'production' ? API.production : API.sandbox;
  const headers = () => ({ Authorization: `Bearer ${env.PADDLE_API_KEY}` });

  return {
    name: 'paddle',
    configured: Boolean(env.PADDLE_API_KEY && env.PADDLE_WEBHOOK_SECRET),
    webhookSecret: env.PADDLE_WEBHOOK_SECRET,

    async createCheckout({ userId, planId }) {
      const plan = PLANS[planId];
      const priceId = plan && env[plan.paddlePriceEnv];
      if (!priceId) return null;
      const payload = await fetchJson('paddle', `${base}/transactions`, {
        method: 'POST',
        headers: headers(),
        fetchImpl,
        body: { items: [{ price_id: priceId, quantity: 1 }], custom_data: { userId } },
      });
      return { provider: 'paddle', transactionId: payload?.data?.id };
    },

    /** A one-time Paddle customer-portal link where the user can update the card or cancel. */
    async createPortalUrl({ customerRef, providerRef }) {
      if (!customerRef) return null;
      const payload = await fetchJson('paddle', `${base}/customers/${encodeURIComponent(customerRef)}/portal-sessions`, {
        method: 'POST',
        headers: headers(),
        fetchImpl,
        body: providerRef ? { subscription_ids: [providerRef] } : {},
      });
      return payload?.data?.urls?.general?.overview || null;
    },
  };
}

function intervalOf(data) {
  const interval = data.billing_cycle && data.billing_cycle.interval;
  return interval === 'month' || interval === 'year' ? interval : null;
}

function firstPrice(data) {
  const price = ((data.items || [])[0] || {}).price || {};
  const unit = price.unit_price || {};
  const amount = Number(unit.amount);
  // The subscription bills in its own currency (soles for Peru); the price's
  // base amount is only that amount when the currencies match.
  const currency = data.currency_code || unit.currency_code || null;
  const sameCurrency = !data.currency_code || data.currency_code === unit.currency_code;
  return {
    currency,
    amountMinor: sameCurrency && Number.isFinite(amount) ? amount : null,
  };
}

/**
 * Paddle may already have advanced the billing period to the cycle whose charge
 * failed. The paid access ended where that cycle started, so the grace period
 * counts from there; counting from the new period's end would hand out a free month.
 */
function pastDueAnchor(data, period, eventAt) {
  const endsMs = Date.parse(period.ends_at);
  const startsMs = Date.parse(period.starts_at);
  const eventMs = Date.parse(eventAt);
  const advanced = Number.isFinite(endsMs) && Number.isFinite(startsMs) && Number.isFinite(eventMs) && endsMs > eventMs;
  return advanced ? period.starts_at : period.ends_at || data.next_billed_at || null;
}

function periodEnd(data, eventAt) {
  const period = data.current_billing_period || {};
  if (data.status === 'canceled') return data.canceled_at || period.ends_at || null;
  if (data.status === 'past_due') return pastDueAnchor(data, period, data.updated_at || eventAt);
  return period.ends_at || data.next_billed_at || null;
}

/** Why an event cannot become a subscription record, or null when it can. */
function rejectReason(event, data) {
  if (!SUBSCRIPTION_EVENTS.has(event.event_type)) return `unhandled ${event.event_type}`;
  if (!(data.custom_data && data.custom_data.userId)) return 'subscription has no app user id';
  if (!STATUS[data.status]) return `unknown status ${data.status}`;
  return null;
}

function toRecord(event, data) {
  return {
    provider: 'paddle',
    providerRef: data.id,
    userId: String(data.custom_data.userId),
    status: STATUS[data.status],
    interval: intervalOf(data),
    ...firstPrice(data),
    currentPeriodEnd: periodEnd(data, event.occurred_at),
    cancelAtPeriodEnd: (data.scheduled_change || {}).action === 'cancel',
    customerRef: data.customer_id || null,
    manageUrl: (data.management_urls || {}).cancel || null,
    providerUpdatedAt: data.updated_at || event.occurred_at || null,
  };
}

/**
 * Turn a verified Paddle webhook into our subscription record.
 * Returns { eventId, record } or { eventId, ignored: reason }.
 */
function normalizePaddleEvent(event) {
  const eventId = event && event.event_id;
  if (!eventId) return { eventId: null, ignored: 'missing event id' };
  const data = event.data || {};
  const ignored = rejectReason(event, data);
  return ignored ? { eventId, ignored } : { eventId, record: toRecord(event, data) };
}

module.exports = { createPaddleProvider, normalizePaddleEvent };
