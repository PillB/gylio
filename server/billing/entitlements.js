/**
 * entitlements.js
 *
 * Pure rules that decide whether an account has Pro right now, and why.
 *
 * Pro can come from three independent sources, each stored as its own record so
 * one never overwrites another:
 *   - subscription: a paid, provider-managed subscription (webhook-maintained)
 *   - gift:         an admin grant for friends, family and testers (repeatable,
 *                   revocable, fixed-length or indefinite)
 *   - trial:        the one-time, no-card, app-managed trial
 *
 * Nothing here reads a clock or a database; callers pass `now` and the records.
 * That keeps the rules deterministic and testable against fixed calendar anchors.
 */

'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days a past-due subscription keeps Pro while the provider retries the card. */
const PAST_DUE_GRACE_DAYS = 3;

const SOURCE_PRIORITY = ['subscription', 'gift', 'trial'];

const toMs = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const toIso = (ms) => (ms === null ? null : new Date(ms).toISOString());

/**
 * When a subscription stops granting Pro, or null if it grants nothing.
 * `Infinity` is never returned: every paid period has an end the provider told us.
 */
function subscriptionAccessEnd(subscription) {
  const periodEnd = toMs(subscription?.currentPeriodEnd);
  if (periodEnd === null) return null;

  switch (subscription.status) {
    case 'active':
    case 'trialing':
    // A cancelled subscription stays paid through the period already charged.
    case 'cancelled':
      return periodEnd;
    case 'past_due':
      return periodEnd + PAST_DUE_GRACE_DAYS * DAY_MS;
    default:
      // expired, refunded, paused, pending, unknown: no access.
      return null;
  }
}

function isSubscriptionActive(subscription, nowMs) {
  const end = subscriptionAccessEnd(subscription);
  return end !== null && end > nowMs;
}

function isGiftActive(gift, nowMs) {
  if (!gift || gift.revokedAt) return false;
  const start = toMs(gift.startsAt) ?? 0;
  if (start > nowMs) return false;
  const end = toMs(gift.endsAt);
  return end === null || end > nowMs;
}

function isTrialActive(account, nowMs) {
  const end = toMs(account?.trialEndsAt);
  return end !== null && end > nowMs;
}

/** Latest end among active gifts; null means at least one is indefinite. */
function giftAccessEnd(activeGifts) {
  let latest = -Infinity;
  for (const gift of activeGifts) {
    const end = toMs(gift.endsAt);
    if (end === null) return null;
    latest = Math.max(latest, end);
  }
  return latest;
}

function pickSubscription(subscriptions, nowMs) {
  const active = subscriptions.filter((s) => isSubscriptionActive(s, nowMs));
  active.sort((a, b) => subscriptionAccessEnd(b) - subscriptionAccessEnd(a));
  return active[0] || null;
}

function describeSubscription(subscription) {
  if (!subscription) return null;
  return {
    provider: subscription.provider,
    status: subscription.status,
    interval: subscription.interval || null,
    currentPeriodEnd: toIso(toMs(subscription.currentPeriodEnd)),
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd) || subscription.status === 'cancelled',
    manageUrl: subscription.manageUrl || null,
  };
}

function collectSources({ subscription, activeGifts, trialActive, account }) {
  const sources = {};
  if (subscription) sources.subscription = toIso(subscriptionAccessEnd(subscription));
  if (activeGifts.length) sources.gift = toIso(giftAccessEnd(activeGifts));
  if (trialActive) sources.trial = toIso(toMs(account.trialEndsAt));
  return sources;
}

/**
 * The single answer the API, the AI gate and the UI all rely on.
 *
 * `expiresAt` is when Pro ends if nothing renews: the latest end across every
 * active source, or null when an indefinite gift is active. `source` is the
 * highest-priority active source, so a paying customer who also holds a tester
 * gift still sees their subscription (and its manage link) first.
 */
function computeEntitlement({ account = null, subscriptions = [], gifts = [], now }) {
  const nowMs = toMs(now);
  if (nowMs === null) throw new TypeError('computeEntitlement requires a valid `now`');

  const subscription = pickSubscription(subscriptions, nowMs);
  const activeGifts = gifts.filter((gift) => isGiftActive(gift, nowMs));
  const trialActive = isTrialActive(account, nowMs);
  const sources = collectSources({ subscription, activeGifts, trialActive, account });

  const activeKeys = SOURCE_PRIORITY.filter((key) => key in sources);

  return {
    plan: activeKeys.length ? 'pro' : 'free',
    source: activeKeys[0] || null,
    sources,
    expiresAt: latestEnd(activeKeys.map((key) => sources[key])),
    renews: isRenewing(subscription),
    trial: {
      eligible: isTrialEligible(account, subscriptions),
      endsAt: toIso(toMs(account?.trialEndsAt)),
    },
    subscription: describeSubscription(subscription),
  };
}

/** Latest ISO end; null when any end is null (indefinite) or there are none. */
function latestEnd(ends) {
  if (ends.includes(null)) return null;
  return ends.reduce((a, b) => (a > b ? a : b), null);
}

const isRenewing = (subscription) =>
  Boolean(subscription) && subscription.status === 'active' && !subscription.cancelAtPeriodEnd;

/** One trial per account, and never after the account has ever paid. */
function isTrialEligible(account, subscriptions = []) {
  if (account?.trialStartedAt) return false;
  return subscriptions.length === 0;
}

/**
 * Window for a new gift. Fixed-length gifts start where the account's latest
 * active fixed gift ends, so "one more month" given twice adds two months
 * instead of overlapping. `days` null means indefinite.
 */
function planGiftWindow({ existingGifts = [], days, now }) {
  const nowMs = toMs(now);
  if (nowMs === null) throw new TypeError('planGiftWindow requires a valid `now`');
  if (days === null || days === undefined) {
    return { startsAt: toIso(nowMs), endsAt: null };
  }
  if (!Number.isInteger(days) || days < 1 || days > 3660) {
    throw new RangeError('Gift length must be a whole number of days between 1 and 3660');
  }

  const activeFixedEnds = existingGifts
    .filter((gift) => isGiftActive(gift, nowMs) && toMs(gift.endsAt) !== null)
    .map((gift) => toMs(gift.endsAt));
  const startMs = Math.max(nowMs, ...activeFixedEnds);
  return { startsAt: toIso(startMs), endsAt: toIso(startMs + days * DAY_MS) };
}

module.exports = {
  DAY_MS,
  PAST_DUE_GRACE_DAYS,
  computeEntitlement,
  isGiftActive,
  isSubscriptionActive,
  isTrialEligible,
  planGiftWindow,
  subscriptionAccessEnd,
};
