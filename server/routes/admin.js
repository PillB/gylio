/**
 * admin.js — Pro gifts and the QA inbox. Mounted behind requireAuth + requireAdmin.
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiError } = require('../lib/errors');
const { getBillingService, getBillingStore } = require('../billing');
const { validateTriage, KINDS, STATUSES } = require('../feedback/validateFeedback');

const GIFT_REASONS = ['friend', 'family', 'tester', 'support', 'promo', 'other'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseGiftRequest(body = {}) {
  const errors = [];
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null;
  if (!userId && !email) errors.push({ field: 'target', message: 'Provide a user id or an email' });
  if (email && !EMAIL.test(email)) errors.push({ field: 'email', message: 'Not an email address' });

  const days = body.days === null || body.days === 'indefinite' ? null : Number(body.days);
  if (days !== null && !Number.isInteger(days)) errors.push({ field: 'days', message: 'Whole days, or null for indefinite' });

  const reason = GIFT_REASONS.includes(body.reason) ? body.reason : null;
  if (!reason) errors.push({ field: 'reason', message: `One of ${GIFT_REASONS.join(', ')}` });

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null;
  if (errors.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid gift', errors);
  return { userId, email, days, reason, note };
}

function createAdminRouter({ service = getBillingService, store = getBillingStore, clock = () => new Date() } = {}) {
  const router = express.Router();

  router.get('/pro-access', asyncHandler(async (_req, res) => {
    res.json(await service().listProAccess());
  }));

  router.post('/gifts', asyncHandler(async (req, res) => {
    const gift = await service().grantGift({ adminId: req.user.id, ...parseGiftRequest(req.body) });
    res.status(201).json(gift);
  }));

  router.post('/gifts/:id/revoke', asyncHandler(async (req, res) => {
    res.json(await service().revokeGift(req.params.id, req.user.id));
  }));

  router.get('/feedback', asyncHandler(async (req, res) => {
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const kind = KINDS.includes(req.query.kind) ? req.query.kind : undefined;
    res.json({ reports: await store().listFeedback({ status, kind, limit: 500 }) });
  }));

  router.patch('/feedback/:id', asyncHandler(async (req, res) => {
    const { value, errors } = validateTriage(req.body);
    if (errors) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid update', errors);
    const updated = await store().updateFeedback(req.params.id, value, { now: clock().toISOString() });
    if (!updated) throw new ApiError(404, 'NOT_FOUND', 'Report not found');
    res.json(updated);
  }));

  return router;
}

module.exports = { GIFT_REASONS, createAdminRouter, parseGiftRequest };
