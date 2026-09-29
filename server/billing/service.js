/**
 * service.js — the billing use-cases, independent of Express.
 *
 * Every dependency (store, clock, Clerk, providers) is injected so tests run the
 * real rules end to end without a network, and so no function reads the wall
 * clock behind the caller's back.
 */

'use strict';

const { ApiError } = require('../lib/errors');
const {
  DAY_MS,
  computeEntitlement,
  isGiftActive,
  isSubscriptionActive,
  isTrialEligible,
  planGiftWindow,
} = require('./entitlements');
const { TRIAL_DAYS } = require('./plans');
const { normalizePaddleEvent } = require('./providers/paddle');
const { interpretPassPayment } = require('./providers/mercadopago');

const iso = (ms) => new Date(ms).toISOString();

function createBillingService({ store, clock = () => new Date(), clerk, paddle, mercadopago, logger = console }) {
  const now = () => clock().toISOString();

  async function loadRecords(userId) {
    const [account, subscriptions, gifts] = await Promise.all([
      store.getAccount(userId),
      store.listSubscriptions(userId),
      store.listGifts({ userId }),
    ]);
    return { account, subscriptions, gifts };
  }

  /** Gifts sent to an email before the person signed up become theirs on first look. */
  async function claimPendingGifts(userId) {
    if (!clerk?.configured || !(await store.hasUnclaimedGifts())) return;
    try {
      const emails = await clerk.getVerifiedEmails(userId);
      await store.claimGiftsByEmail(emails, userId, { now: now() });
    } catch (error) {
      // A Clerk outage must not block the entitlement read; the claim retries next time.
      logger.warn?.(`gift claim skipped: ${error.message}`);
    }
  }

  async function getEntitlement(userId) {
    await claimPendingGifts(userId);
    return computeEntitlement({ ...(await loadRecords(userId)), now: now() });
  }

  async function startTrial(userId) {
    const { account, subscriptions } = await loadRecords(userId);
    if (!isTrialEligible(account, subscriptions)) {
      throw new ApiError(409, 'TRIAL_NOT_AVAILABLE', 'The free trial has already been used on this account');
    }
    const startedMs = clock().getTime();
    const started = await store.startTrial(userId, {
      startedAt: iso(startedMs),
      endsAt: iso(startedMs + TRIAL_DAYS * DAY_MS),
    });
    if (!started) throw new ApiError(409, 'TRIAL_NOT_AVAILABLE', 'The free trial has already been used on this account');
    return getEntitlement(userId);
  }

  function requireProvider(provider) {
    if (!provider?.configured) throw new ApiError(503, 'BILLING_NOT_CONFIGURED', 'Checkout is not configured');
    return provider;
  }

  async function createCheckout(userId, planId) {
    const checkout = await requireProvider(paddle).createCheckout({ userId, planId });
    if (!checkout?.transactionId) throw new ApiError(400, 'UNKNOWN_PLAN', 'Unknown or unavailable plan');
    return checkout;
  }

  async function createPassCheckout(userId, passId, returnUrl) {
    const checkout = await requireProvider(mercadopago).createPassCheckout({ userId, passId, returnUrl });
    if (!checkout?.url) throw new ApiError(400, 'UNKNOWN_PASS', 'Unknown or unavailable pass');
    return checkout;
  }

  async function getPortalUrl(userId) {
    const subscriptions = await store.listSubscriptions(userId);
    const paddleSub = subscriptions.filter((s) => s.provider === 'paddle' && s.customerRef).pop();
    if (!paddleSub) throw new ApiError(404, 'NO_SUBSCRIPTION', 'No Paddle subscription on this account');
    const url = await requireProvider(paddle).createPortalUrl(paddleSub);
    return url || paddleSub.manageUrl;
  }

  async function handlePaddleEvent(event) {
    const { eventId, record, ignored } = normalizePaddleEvent(event);
    if (!eventId) throw new ApiError(400, 'INVALID_EVENT', 'Webhook has no event id');
    if (await store.hasWebhookEvent('paddle', eventId)) return { outcome: 'duplicate' };
    if (record) await store.upsertSubscription(record, { now: now() });
    // Recorded after processing: a crash mid-way lets Paddle's retry run it again,
    // and the upsert is idempotent, so a replay is harmless.
    await store.recordWebhookEvent('paddle', eventId, { now: now() });
    return { outcome: ignored ? 'ignored' : 'applied', reason: ignored };
  }

  function nextPassWindow(subscriptions, days, nowMs) {
    const activeEnds = subscriptions
      .filter((s) => s.provider === 'mercadopago' && isSubscriptionActive(s, nowMs))
      .map((s) => Date.parse(s.currentPeriodEnd));
    const startMs = Math.max(nowMs, ...activeEnds);
    return iso(startMs + days * DAY_MS);
  }

  async function handleMercadoPagoPayment(paymentId) {
    const payment = await requireProvider(mercadopago).fetchPayment(paymentId);
    const verdict = interpretPassPayment(payment);
    if (!verdict.ok) return { outcome: 'ignored', reason: verdict.reason };

    const providerRef = String(payment.id);
    const existing = await store.getSubscriptionByRef('mercadopago', providerRef);
    if (existing?.status === verdict.status) return { outcome: 'duplicate' };

    const nowMs = clock().getTime();
    const currentPeriodEnd = existing?.currentPeriodEnd
      || nextPassWindow(await store.listSubscriptions(verdict.userId), verdict.pass.days, nowMs);
    await store.upsertSubscription({
      provider: 'mercadopago',
      providerRef,
      userId: verdict.userId,
      status: verdict.status,
      interval: 'pass',
      currency: verdict.pass.currency,
      amountMinor: verdict.pass.amountMinor,
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
      providerUpdatedAt: payment.date_last_updated || null,
    }, { now: now() });
    return { outcome: 'applied' };
  }

  async function resolveGiftTarget({ userId, email }) {
    if (userId) return { userId, email: null };
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) throw new ApiError(400, 'VALIDATION_ERROR', 'A user id or an email is required');
    const found = clerk?.configured ? await clerk.findUserIdByEmail(normalized) : null;
    return found ? { userId: found, email: normalized } : { userId: null, email: normalized };
  }

  async function grantGift({ adminId, userId, email, days, reason, note }) {
    const target = await resolveGiftTarget({ userId, email });
    const existing = target.userId
      ? await store.listGifts({ userId: target.userId })
      : (await store.listGifts()).filter((g) => !g.userId && g.email === target.email);
    let window;
    try {
      window = planGiftWindow({ existingGifts: existing, days, now: now() });
    } catch (error) {
      throw new ApiError(400, 'VALIDATION_ERROR', error.message);
    }
    return store.createGift({ ...target, ...window, reason, note, grantedBy: adminId, grantedAt: now() });
  }

  async function revokeGift(id, adminId) {
    const revoked = await store.revokeGift(id, { revokedAt: now(), revokedBy: adminId });
    if (!revoked) throw new ApiError(404, 'NOT_FOUND', 'Gift not found or already revoked');
    return revoked;
  }

  function giftState(gift, nowMs) {
    if (gift.revokedAt) return 'revoked';
    if (isGiftActive(gift, nowMs)) return 'active';
    return Date.parse(gift.startsAt) > nowMs ? 'scheduled' : 'ended';
  }

  async function lookupEmails(userIds) {
    if (!clerk?.configured || !userIds.length) return {};
    try {
      return await clerk.getPrimaryEmails(userIds);
    } catch (error) {
      logger.warn?.(`admin email lookup skipped: ${error.message}`);
      return {};
    }
  }

  /** Everyone who has Pro right now, from any source, plus the full gift ledger. */
  async function listProAccess() {
    const nowIso = now();
    const nowMs = Date.parse(nowIso);
    const [gifts, subscriptions, trials] = await Promise.all([
      store.listGifts(),
      store.listAllSubscriptions(),
      store.listActiveTrialAccounts(nowIso),
    ]);
    const userIds = new Set([
      ...gifts.filter((g) => g.userId && isGiftActive(g, nowMs)).map((g) => g.userId),
      ...subscriptions.filter((s) => isSubscriptionActive(s, nowMs)).map((s) => s.userId),
      ...trials.map((a) => a.userId),
    ]);
    const emails = await lookupEmails([...userIds]);
    const users = await Promise.all([...userIds].map(async (id) => {
      const records = await loadRecords(id);
      const entitlement = computeEntitlement({ ...records, now: nowIso });
      return { userId: id, email: emails[id] || records.account?.email || null, ...entitlement };
    }));
    return {
      users: users.sort((a, b) => a.userId.localeCompare(b.userId)),
      gifts: gifts.map((gift) => ({ ...gift, state: giftState(gift, nowMs) })),
    };
  }

  return {
    createCheckout,
    createPassCheckout,
    getEntitlement,
    getPortalUrl,
    grantGift,
    handleMercadoPagoPayment,
    handlePaddleEvent,
    listProAccess,
    revokeGift,
    startTrial,
  };
}

module.exports = { createBillingService };
