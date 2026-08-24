/**
 * billing.js
 *
 * Development-only manual subscription helpers.
 *
 * IMPORTANT: these routes are not a payment processor. They only update Clerk
 * metadata so developers can exercise premium UI locally. Production must use
 * a real billing lifecycle (for example Clerk Billing/Stripe/Paddle) whose
 * server-side entitlement state is derived from the payment provider.
 *
 * All routes require `requireAuth` in server.js.
 */

'use strict';

const express = require('express');

const router = express.Router();
const CLERK_API = 'https://api.clerk.com/v1';
const TRIAL_DAYS = 10;

const manualBillingEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_MANUAL_TRIALS === 'true';

function rejectIfManualBillingDisabled(res) {
  if (manualBillingEnabled()) return false;

  res.status(503).json({
    error: 'Billing is not configured',
    code: 'BILLING_NOT_CONFIGURED',
  });
  return true;
}

async function patchClerkUser(userId, publicMetadata) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error('CLERK_SECRET_KEY not configured');

  const response = await fetch(`${CLERK_API}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });

  if (!response.ok) {
    const error = new Error(`Clerk metadata update failed with status ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  return response.json();
}

/**
 * POST /api/billing/activate-trial
 *
 * Local/dev test helper only. It is deliberately unavailable in production so
 * a public pricing CTA cannot create a permanent premium entitlement without a
 * real checkout, renewal, expiry, refund, cancellation, and webhook lifecycle.
 */
router.post('/activate-trial', async (req, res, next) => {
  if (rejectIfManualBillingDisabled(res)) return;

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
      developmentOnly: true,
    });
  } catch (error) {
    if (error.statusCode === 502) {
      return res.status(502).json({
        error: 'Failed to update development billing entitlement',
        code: 'BILLING_UPSTREAM_ERROR',
      });
    }
    next(error);
  }
});

/**
 * POST /api/billing/cancel
 * Local/dev test helper paired with activate-trial.
 */
router.post('/cancel', async (req, res, next) => {
  if (rejectIfManualBillingDisabled(res)) return;

  try {
    const clerkUserId = req.user.id;

    await patchClerkUser(clerkUserId, {
      plan: 'free_user',
      trialStartedAt: null,
      trialEndsAt: null,
      cancelledAt: new Date().toISOString(),
    });

    return res.json({ success: true, plan: 'free_user', developmentOnly: true });
  } catch (error) {
    if (error.statusCode === 502) {
      return res.status(502).json({
        error: 'Failed to update development billing entitlement',
        code: 'BILLING_UPSTREAM_ERROR',
      });
    }
    next(error);
  }
});

module.exports = router;
