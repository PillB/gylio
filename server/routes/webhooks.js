/**
 * webhooks.js — payment provider notifications. No user auth: each request is
 * authenticated by the provider's HMAC signature over the raw body instead.
 *
 * Must be mounted before express.json() so the body arrives as an unparsed
 * Buffer; see server.js.
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiError } = require('../lib/errors');
const { verifyPaddleSignature, verifyMercadoPagoSignature } = require('../billing/webhookSignatures');
const { getBillingService } = require('../billing');

const parseJson = (buffer) => {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (_error) {
    throw new ApiError(400, 'INVALID_JSON', 'Webhook body is not JSON');
  }
};

/** Mercado Pago puts the payment id and topic in the query string, the body, or both. */
function readMercadoPagoNotification(req) {
  const body = Buffer.isBuffer(req.body) && req.body.length ? parseJson(req.body) : {};
  const data = body.data || {};
  return {
    dataId: String(req.query['data.id'] || data.id || ''),
    topic: req.query.type || req.query.topic || body.type,
  };
}

function createWebhookRouter({ service = getBillingService, env = process.env, clock = () => Date.now() } = {}) {
  const router = express.Router();
  router.use(express.raw({ type: '*/*', limit: '512kb' }));

  router.post('/paddle', asyncHandler(async (req, res) => {
    const verified = verifyPaddleSignature({
      rawBody: req.body,
      header: req.get('Paddle-Signature'),
      secret: env.PADDLE_WEBHOOK_SECRET,
      nowMs: clock(),
    });
    if (!verified) throw new ApiError(401, 'INVALID_SIGNATURE', 'Signature verification failed');
    const result = await service().handlePaddleEvent(parseJson(req.body));
    res.json({ received: true, ...result });
  }));

  router.post('/mercadopago', asyncHandler(async (req, res) => {
    const notification = readMercadoPagoNotification(req);
    const verified = verifyMercadoPagoSignature({
      header: req.get('x-signature'),
      requestId: req.get('x-request-id'),
      dataId: notification.dataId,
      secret: env.MERCADOPAGO_WEBHOOK_SECRET,
      nowMs: clock(),
    });
    if (!verified) throw new ApiError(401, 'INVALID_SIGNATURE', 'Signature verification failed');

    if (notification.topic !== 'payment' || !notification.dataId) {
      res.json({ received: true, outcome: 'ignored', reason: `topic ${notification.topic || 'none'}` });
      return;
    }
    res.json({ received: true, ...(await service().handleMercadoPagoPayment(notification.dataId)) });
  }));

  return router;
}

module.exports = { createWebhookRouter };
