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
  const interval = data?.billing_cycle?.interval;
  return interval === 'month' || interval === 'year' ? interval : null;
}

function firstPrice(data) {
  const unit = data?.items?.[0]?.price?.unit_price;
  const amount = Number(unit?.amount);
  return {
    currency: unit?.currency_code || data?.currency_code || null,
    amountMinor: Number.isFinite(amount) ? amount : null,
  };
}

function periodEnd(data) {
  if (data?.status === 'canceled') return data.canceled_at || data?.current_billing_period?.ends_at || null;
  return data?.current_billing_period?.ends_at || data?.next_billed_at || null;
}

/**
 * Turn a verified Paddle webhook into our subscription record.
 * Returns { eventId, record } or { eventId, ignored: reason }.
 */
function normalizePaddleEvent(event) {
  const eventId = event?.event_id;
  if (!eventId) return { eventId: null, ignored: 'missing event id' };
  if (!SUBSCRIPTION_EVENTS.has(event.event_type)) return { eventId, ignored: `unhandled ${event.event_type}` };

  const data = event.data || {};
  const userId = data.custom_data?.userId;
  if (!userId) return { eventId, ignored: 'subscription has no app user id' };
  const status = STATUS[data.status];
  if (!status) return { eventId, ignored: `unknown status ${data.status}` };

  return {
    eventId,
    record: {
      provider: 'paddle',
      providerRef: data.id,
      userId: String(userId),
      status,
      interval: intervalOf(data),
      ...firstPrice(data),
      currentPeriodEnd: periodEnd(data),
      cancelAtPeriodEnd: data.scheduled_change?.action === 'cancel',
      customerRef: data.customer_id || null,
      manageUrl: data.management_urls?.cancel || null,
      providerUpdatedAt: data.updated_at || event.occurred_at || null,
    },
  };
}

module.exports = { createPaddleProvider, normalizePaddleEvent };
