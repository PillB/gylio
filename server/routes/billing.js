/**
 * billing.js — plans, entitlement, trial and checkout for the signed-in user.
 *
 * Mounted behind requireAuth in server.js, except GET /plans, which the public
 * pricing page reads before sign-in (see publicBillingRouter).
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { isAdminUser } = require('../middleware/auth');
const { ApiError } = require('../lib/errors');
const { PLANS, PASSES, publicCatalog } = require('../billing/plans');
const { getBillingService } = require('../billing');

const allowedReturnOrigins = () =>
  new Set(String(process.env.CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean));

/** Only send people back to an origin we serve; never to one the request names freely. */
function safeReturnUrl(candidate) {
  try {
    const url = new URL(String(candidate || ''));
    return allowedReturnOrigins().has(url.origin) ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function createBillingRouter({ service = getBillingService } = {}) {
  const router = express.Router();

  router.get('/entitlement', asyncHandler(async (req, res) => {
    const entitlement = await service().getEntitlement(req.user.id);
    res.json({ ...entitlement, isAdmin: isAdminUser(req.user.id) });
  }));

  router.post('/trial', asyncHandler(async (req, res) => {
    res.status(201).json(await service().startTrial(req.user.id));
  }));

  router.post('/checkout', asyncHandler(async (req, res) => {
    const planId = req.body?.planId;
    if (!Object.hasOwn(PLANS, planId)) throw new ApiError(400, 'UNKNOWN_PLAN', 'Unknown plan');
    res.json(await service().createCheckout(req.user.id, planId));
  }));

  router.post('/pass-checkout', asyncHandler(async (req, res) => {
    const passId = req.body?.passId;
    if (!Object.hasOwn(PASSES, passId)) throw new ApiError(400, 'UNKNOWN_PASS', 'Unknown pass');
    const returnUrl = safeReturnUrl(req.body?.returnUrl);
    if (!returnUrl) throw new ApiError(400, 'VALIDATION_ERROR', 'returnUrl must be on an allowed origin');
    res.json(await service().createPassCheckout(req.user.id, passId, returnUrl));
  }));

  router.post('/portal', asyncHandler(async (req, res) => {
    res.json({ url: await service().getPortalUrl(req.user.id) });
  }));

  return router;
}

const publicBillingRouter = express.Router();
publicBillingRouter.get('/plans', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(publicCatalog());
});

module.exports = { createBillingRouter, publicBillingRouter, safeReturnUrl };
