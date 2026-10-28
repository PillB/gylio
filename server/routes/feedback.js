/**
 * feedback.js — bug reports, ideas and questions from people testing Gylio.
 *
 * POST accepts anonymous reports only when FEEDBACK_ALLOW_ANONYMOUS=true, so a
 * public QA page can collect reports from testers who have not signed up yet.
 * Mounted behind optionalAuth and a dedicated rate limit in server.js.
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiError } = require('../lib/errors');
const { getBillingStore } = require('../billing');
const { validateFeedback } = require('../feedback/validateFeedback');

const publicFields = ({ id, kind, title, status, severity, route, createdAt, updatedAt }) =>
  ({ id, kind, title, status, severity, route, createdAt, updatedAt });

const passThrough = (_req, _res, next) => next();

function createFeedbackRouter({
  store = getBillingStore, env = process.env, clock = () => new Date(), rateLimit = passThrough,
} = {}) {
  const router = express.Router();

  router.post('/', rateLimit, asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    if (!userId && env.FEEDBACK_ALLOW_ANONYMOUS !== 'true') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to send a report');
    }
    const { value, errors } = validateFeedback(req.body);
    if (errors) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid report', errors);
    const created = await store().createFeedback({ ...value, userId, createdAt: clock().toISOString() });
    res.status(201).json(publicFields(created));
  }));

  /** The reporter's own reports with their triage status, so testers see progress. */
  router.get('/mine', asyncHandler(async (req, res) => {
    if (!req.user?.id) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to see your reports');
    const reports = await store().listFeedback({ userId: req.user.id, limit: 100 });
    res.json({ reports: reports.map(publicFields) });
  }));

  return router;
}

module.exports = { createFeedbackRouter };
