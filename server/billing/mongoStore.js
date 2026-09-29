/**
 * mongoStore.js — billing, gift and feedback persistence on MongoDB (production).
 *
 * Same contract as sqliteStore.js, verified by storeContract.test.js against an
 * in-memory mongod. Timestamps are stored as ISO strings, matching SQLite, so
 * lexical comparison of `trialEndsAt > now` means the same thing in both.
 */

'use strict';

const mongoose = require('mongoose');
const { isStale } = require('./sqliteStore');

const { Schema } = mongoose;
const opts = { versionKey: false };

const AccountSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, default: null },
  trialStartedAt: { type: String, default: null },
  trialEndsAt: { type: String, default: null, index: true },
  createdAt: String,
  updatedAt: String,
}, opts);

const SubscriptionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  provider: { type: String, required: true },
  providerRef: { type: String, required: true },
  status: { type: String, required: true },
  interval: { type: String, default: null },
  currency: { type: String, default: null },
  amountMinor: { type: Number, default: null },
  currentPeriodEnd: { type: String, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  customerRef: { type: String, default: null },
  manageUrl: { type: String, default: null },
  providerUpdatedAt: { type: String, default: null },
  createdAt: String,
  updatedAt: String,
}, opts);
SubscriptionSchema.index({ provider: 1, providerRef: 1 }, { unique: true });

const GiftSchema = new Schema({
  userId: { type: String, default: null, index: true },
  email: { type: String, default: null, index: true },
  startsAt: { type: String, required: true },
  endsAt: { type: String, default: null },
  reason: { type: String, required: true },
  note: { type: String, default: null },
  grantedBy: { type: String, required: true },
  grantedAt: { type: String, required: true },
  revokedAt: { type: String, default: null },
  revokedBy: { type: String, default: null },
  claimedAt: { type: String, default: null },
}, opts);

const WebhookEventSchema = new Schema({
  provider: { type: String, required: true },
  eventId: { type: String, required: true },
  receivedAt: String,
}, opts);
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const FeedbackSchema = new Schema({
  userId: { type: String, default: null, index: true },
  kind: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  stepsToReproduce: { type: String, default: null },
  expected: { type: String, default: null },
  actual: { type: String, default: null },
  severity: { type: String, default: null },
  route: { type: String, default: null },
  context: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'new' },
  adminNote: { type: String, default: null },
  createdAt: String,
  updatedAt: String,
}, opts);
FeedbackSchema.index({ status: 1, createdAt: -1 });

const model = (connection, name, schema, collection) =>
  connection.models[name] || connection.model(name, schema, collection);

const clean = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
};

const cleanAccount = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
};

const isObjectId = (id) => mongoose.isValidObjectId(id) && String(id).length === 24;
const DUPLICATE_KEY = 11000;

function createMongoStore(connection = mongoose.connection) {
  const Account = model(connection, 'BillingAccount', AccountSchema, 'billing_accounts');
  const Subscription = model(connection, 'BillingSubscription', SubscriptionSchema, 'billing_subscriptions');
  const Gift = model(connection, 'BillingGift', GiftSchema, 'billing_gifts');
  const WebhookEvent = model(connection, 'BillingWebhookEvent', WebhookEventSchema, 'billing_webhook_events');
  const Feedback = model(connection, 'FeedbackReport', FeedbackSchema, 'feedback_reports');

  const store = {
    kind: 'mongodb',

    async init() {
      await Promise.all([Account, Subscription, Gift, WebhookEvent, Feedback].map((m) => m.init()));
    },

    getAccount: async (userId) => cleanAccount(await Account.findOne({ userId }).lean()),

    async ensureAccount(userId, { email = null, now }) {
      const update = { $setOnInsert: { userId, createdAt: now, updatedAt: now } };
      if (email) update.$set = { email };
      await Account.updateOne({ userId }, update, { upsert: true });
      return store.getAccount(userId);
    },

    async startTrial(userId, { startedAt, endsAt }) {
      await store.ensureAccount(userId, { now: startedAt });
      const doc = await Account.findOneAndUpdate(
        { userId, trialStartedAt: null },
        { $set: { trialStartedAt: startedAt, trialEndsAt: endsAt, updatedAt: startedAt } },
        { new: true }
      ).lean();
      return cleanAccount(doc);
    },

    listActiveTrialAccounts: async (now) =>
      (await Account.find({ trialEndsAt: { $gt: now } }).sort({ trialEndsAt: 1 }).lean()).map(cleanAccount),

    listSubscriptions: async (userId) =>
      (await Subscription.find({ userId }).sort({ createdAt: 1 }).lean()).map(clean),

    listAllSubscriptions: async () =>
      (await Subscription.find({}).sort({ updatedAt: -1 }).lean()).map(clean),

    getSubscriptionByRef: async (provider, providerRef) =>
      clean(await Subscription.findOne({ provider, providerRef }).lean()),

    async upsertSubscription(record, { now }) {
      const existing = await store.getSubscriptionByRef(record.provider, record.providerRef);
      if (existing && isStale(record, existing)) return { applied: false, subscription: existing };

      const fields = {
        userId: record.userId,
        status: record.status,
        interval: record.interval ?? null,
        currency: record.currency ?? null,
        amountMinor: record.amountMinor ?? null,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd),
        customerRef: record.customerRef ?? null,
        manageUrl: record.manageUrl ?? null,
        providerUpdatedAt: record.providerUpdatedAt ?? null,
        updatedAt: now,
      };
      await Subscription.updateOne(
        { provider: record.provider, providerRef: record.providerRef },
        { $set: fields, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
      return { applied: true, subscription: await store.getSubscriptionByRef(record.provider, record.providerRef) };
    },

    listGifts: async ({ userId } = {}) =>
      (userId
        ? await Gift.find({ userId }).sort({ startsAt: 1 }).lean()
        : await Gift.find({}).sort({ grantedAt: -1 }).lean()
      ).map(clean),

    getGift: async (id) => (isObjectId(id) ? clean(await Gift.findById(id).lean()) : null),

    async createGift(gift) {
      const created = await Gift.create({
        userId: gift.userId || null,
        email: gift.email || null,
        startsAt: gift.startsAt,
        endsAt: gift.endsAt ?? null,
        reason: gift.reason,
        note: gift.note || null,
        grantedBy: gift.grantedBy,
        grantedAt: gift.grantedAt,
      });
      return clean(created.toObject());
    },

    async revokeGift(id, { revokedAt, revokedBy }) {
      if (!isObjectId(id)) return null;
      const doc = await Gift.findOneAndUpdate(
        { _id: id, revokedAt: null },
        { $set: { revokedAt, revokedBy } },
        { new: true }
      ).lean();
      return clean(doc);
    },

    hasUnclaimedGifts: async () => Boolean(await Gift.exists({ userId: null, revokedAt: null })),

    async claimGiftsByEmail(emails, userId, { now }) {
      const normalized = [...new Set(emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
      if (!normalized.length) return 0;
      const result = await Gift.updateMany(
        { userId: null, email: { $in: normalized } },
        { $set: { userId, claimedAt: now } }
      );
      return result.modifiedCount;
    },

    async recordWebhookEvent(provider, eventId, { now }) {
      try {
        await WebhookEvent.create({ provider, eventId: String(eventId), receivedAt: now });
        return true;
      } catch (error) {
        if (error?.code === DUPLICATE_KEY) return false;
        throw error;
      }
    },

    hasWebhookEvent: async (provider, eventId) =>
      Boolean(await WebhookEvent.exists({ provider, eventId: String(eventId) })),

    async createFeedback(report) {
      const created = await Feedback.create({
        userId: report.userId || null,
        kind: report.kind,
        title: report.title,
        description: report.description,
        stepsToReproduce: report.stepsToReproduce || null,
        expected: report.expected || null,
        actual: report.actual || null,
        severity: report.severity || null,
        route: report.route || null,
        context: report.context || {},
        status: 'new',
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
      });
      return clean(created.toObject());
    },

    getFeedback: async (id) => (isObjectId(id) ? clean(await Feedback.findById(id).lean()) : null),

    async listFeedback({ status, kind, userId, limit = 200 } = {}) {
      const filter = {};
      if (status) filter.status = status;
      if (kind) filter.kind = kind;
      if (userId) filter.userId = userId;
      const docs = await Feedback.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(Math.min(Math.max(1, limit), 500))
        .lean();
      return docs.map(clean);
    },

    async updateFeedback(id, patch, { now }) {
      if (!isObjectId(id)) return null;
      const set = { updatedAt: now };
      for (const field of ['status', 'adminNote', 'severity']) {
        if (patch[field] !== undefined) set[field] = patch[field];
      }
      return clean(await Feedback.findByIdAndUpdate(id, { $set: set }, { new: true }).lean());
    },
  };
  return store;
}

module.exports = { createMongoStore };
