/**
 * billing.js
 *
 * Handles subscription lifecycle via Clerk's REST API.
 * All routes require the `requireAuth` middleware (applied in server.js).
 *
 * POST /api/billing/activate-trial
 *   Sets publicMetadata.plan = 'user_subscription' with 10-day trial timestamps.
 *   The frontend must call user.reload() after success so Clerk's React SDK
 *   picks up the new metadata and unlocks premium gates immediately.
 *
 * POST /api/billing/cancel
 *   Reverts publicMetadata.plan to 'free_user' and clears trial timestamps.
 */

'use strict';

const express = require('express');

const router = express.Router();
const CLERK_API = 'https://api.clerk.com/v1';
const TRIAL_DAYS = 10;

async function patchClerkUser(userId, publicMetadata) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error('CLERK_SECRET_KEY not configured');

  const res = await fetch(`${CLERK_API}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(`Clerk API ${res.status}: ${JSON.stringify(body)}`);
    err.statusCode = 502;
    err.clerkBody = body;
    throw err;
  }

  return res.json();
}

/**
 * POST /api/billing/activate-trial
 * Activates the 10-day free trial for the authenticated user.
 */
router.post('/activate-trial', async (req, res, next) => {
  try {
    const clerkUserId = req.user.id;

    const trialStartedAt = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await patchClerkUser(clerkUserId, {
      plan: 'user_subscription',
      trialStartedAt,
      trialEndsAt,
    });

    return res.json({
      success: true,
      plan: 'user_subscription',
      trialStartedAt,
      trialEndsAt,
    });
  } catch (err) {
    if (err.statusCode === 502) {
      return res.status(502).json({
        error: 'Failed to activate trial via Clerk',
        details: err.clerkBody,
      });
    }
    next(err);
  }
});

/**
 * POST /api/billing/cancel
 * Downgrades the authenticated user back to free_user.
 */
router.post('/cancel', async (req, res, next) => {
  try {
    const clerkUserId = req.user.id;

    await patchClerkUser(clerkUserId, {
      plan: 'free_user',
      trialStartedAt: null,
      trialEndsAt: null,
      cancelledAt: new Date().toISOString(),
    });

    return res.json({ success: true, plan: 'free_user' });
  } catch (err) {
    if (err.statusCode === 502) {
      return res.status(502).json({
        error: 'Failed to cancel subscription via Clerk',
        details: err.clerkBody,
      });
    }
    next(err);
  }
});

module.exports = router;
