/**
 * analytics.js — product-analytics events from the app (no personal data;
 * see server/analytics/validateEvents.js). Mounted behind optionalAuth so the
 * dashboard can tell signed-in sessions from visitors without storing who.
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiError } = require('../lib/errors');
const { getBillingStore } = require('../billing');
const { validateEvents } = require('../analytics/validateEvents');

const passThrough = (_req, _res, next) => next();

function createAnalyticsRouter({ store = getBillingStore, clock = () => new Date(), rateLimit = passThrough } = {}) {
  const router = express.Router();
  router.post('/events', rateLimit, asyncHandler(async (req, res) => {
    const { events, error } = validateEvents(req.body, { now: clock(), signedIn: Boolean(req.user?.id) });
    if (error) throw new ApiError(400, 'VALIDATION_ERROR', error);
    await store().insertAnalyticsEvents(events);
    res.status(202).json({ accepted: events.length });
  }));
  return router;
}

module.exports = { createAnalyticsRouter };
