/**
 * mercadopago.js — one-time prepaid Pro passes in soles (cards and Yape).
 *
 * Yape cannot auto-renew through Mercado Pago (every Yape payment needs a fresh
 * code), so Peru-local payment is sold as a pass that simply expires. Pro
 * reminds the user before it ends instead of charging them.
 *
 * Mercado Pago notifications carry only an id. They are never trusted for the
 * amount or status: the payment is always re-read from the API.
 */

'use strict';

const { fetchJson } = require('../http');
const { PASSES } = require('../plans');

const API = 'https://api.mercadopago.com';
const REF_PATTERN = /^gylio:([A-Za-z0-9_-]{1,128}):(pass_[a-z0-9]+)$/;

function createMercadoPagoProvider({ env = process.env, fetchImpl } = {}) {
  const headers = () => ({ Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}` });

  return {
    name: 'mercadopago',
    configured: Boolean(
      env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_WEBHOOK_SECRET && env.MERCADOPAGO_PASSES_ENABLED === 'true'
    ),
    webhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET,

    async createPassCheckout({ userId, passId, returnUrl }) {
      const pass = PASSES[passId];
      if (!pass) return null;
      const preference = await fetchJson('mercadopago', `${API}/checkout/preferences`, {
        method: 'POST',
        headers: headers(),
        fetchImpl,
        body: {
          items: [{
            id: passId,
            title: `Gylio Pro · ${pass.days} días`,
            quantity: 1,
            currency_id: pass.currency,
            unit_price: pass.amountMinor / 100,
          }],
          external_reference: `gylio:${userId}:${passId}`,
          notification_url: `${env.API_PUBLIC_URL}/api/webhooks/mercadopago`,
          back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
          auto_return: 'approved',
          statement_descriptor: 'GYLIO PRO',
        },
      });
      const sandbox = env.MERCADOPAGO_ENV !== 'production';
      return { provider: 'mercadopago', url: sandbox ? preference.sandbox_init_point : preference.init_point };
    },

    fetchPayment: (paymentId) =>
      fetchJson('mercadopago', `${API}/v1/payments/${encodeURIComponent(paymentId)}`, { headers: headers(), fetchImpl }),
  };
}

const PAYMENT_STATUS = {
  approved: 'active',
  refunded: 'refunded',
  charged_back: 'refunded',
  cancelled: 'expired',
  rejected: 'expired',
};

/**
 * Validate a re-read payment against the pass it claims to buy.
 * Returns { ok: true, userId, passId, pass, status } or { ok: false, reason }.
 */
function interpretPassPayment(payment) {
  const match = REF_PATTERN.exec(String(payment?.external_reference || ''));
  if (!match) return { ok: false, reason: 'not a Gylio pass payment' };
  const [, userId, passId] = match;
  const pass = PASSES[passId];
  if (!pass) return { ok: false, reason: `unknown pass ${passId}` };

  const status = PAYMENT_STATUS[payment.status];
  if (!status) return { ok: false, reason: `payment still ${payment.status}` };

  const paidMinor = Math.round(Number(payment.transaction_amount) * 100);
  if (payment.currency_id !== pass.currency || paidMinor !== pass.amountMinor) {
    return { ok: false, reason: 'amount or currency does not match the pass' };
  }
  return { ok: true, userId, passId, pass, status };
}

module.exports = { createMercadoPagoProvider, interpretPassPayment };
