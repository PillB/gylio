import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createSqliteStore } = require('./sqliteStore');
const { createMongoStore } = require('./mongoStore');

const T0 = '2026-10-01T00:00:00.000Z';
const T1 = '2026-10-02T00:00:00.000Z';
const T2 = '2026-10-03T00:00:00.000Z';

let mongod;
let connection;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  connection = await mongoose.createConnection(mongod.getUri(), { dbName: 'contract' }).asPromise();
}, 120_000);

afterAll(async () => {
  await connection?.close();
  await mongod?.stop();
});

const backends = [
  ['sqlite', async () => createSqliteStore(new sqlite3.Database(':memory:'))],
  ['mongodb', async () => {
    await connection.dropDatabase();
    return createMongoStore(connection);
  }],
];

describe.each(backends)('billing store contract: %s', (_name, make) => {
  let store;

  beforeAll(async () => {
    store = await make();
    await store.init();
  });

  it('starts a trial exactly once, even when asked twice', async () => {
    const first = await store.startTrial('user_trial', { startedAt: T0, endsAt: T2 });
    expect(first).toMatchObject({ userId: 'user_trial', trialStartedAt: T0, trialEndsAt: T2 });
    const second = await store.startTrial('user_trial', { startedAt: T1, endsAt: T2 });
    expect(second).toBeNull();
    expect((await store.getAccount('user_trial')).trialStartedAt).toBe(T0);
  });

  it('lists only trials that have not ended', async () => {
    const active = await store.listActiveTrialAccounts(T1);
    expect(active.map((a) => a.userId)).toContain('user_trial');
    expect(await store.listActiveTrialAccounts(T2)).toEqual([]);
  });

  it('upserts a subscription by provider reference and ignores an older event', async () => {
    const base = {
      provider: 'paddle', providerRef: 'sub_1', userId: 'user_paid', status: 'active',
      interval: 'year', currentPeriodEnd: '2027-10-01T00:00:00.000Z', providerUpdatedAt: T1,
    };
    await store.upsertSubscription(base, { now: T1 });
    await store.upsertSubscription({ ...base, status: 'cancelled', cancelAtPeriodEnd: true, providerUpdatedAt: T2 }, { now: T2 });
    const late = await store.upsertSubscription({ ...base, status: 'active', providerUpdatedAt: T0 }, { now: T2 });

    expect(late.applied).toBe(false);
    const subs = await store.listSubscriptions('user_paid');
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: true, interval: 'year' });
  });

  it('creates, lists and revokes a gift, and refuses a second revoke', async () => {
    const gift = await store.createGift({
      userId: 'user_friend', startsAt: T0, endsAt: null, reason: 'tester', grantedBy: 'admin_1', grantedAt: T0,
    });
    expect(gift.id).toEqual(expect.any(String));
    expect(await store.listGifts({ userId: 'user_friend' })).toHaveLength(1);

    const revoked = await store.revokeGift(gift.id, { revokedAt: T1, revokedBy: 'admin_1' });
    expect(revoked).toMatchObject({ revokedAt: T1, revokedBy: 'admin_1' });
    expect(await store.revokeGift(gift.id, { revokedAt: T2, revokedBy: 'admin_2' })).toBeNull();
    expect(await store.revokeGift('not-an-id', { revokedAt: T2, revokedBy: 'x' })).toBeNull();
  });

  it('lets a signed-in owner claim gifts sent to their email, case-insensitively, once', async () => {
    await store.createGift({
      email: 'friend@example.com', startsAt: T0, endsAt: T2, reason: 'family', grantedBy: 'admin_1', grantedAt: T0,
    });
    expect(await store.hasUnclaimedGifts()).toBe(true);
    expect(await store.claimGiftsByEmail(['Friend@Example.com'], 'user_new', { now: T1 })).toBe(1);
    expect(await store.claimGiftsByEmail(['friend@example.com'], 'user_other', { now: T1 })).toBe(0);
    expect((await store.listGifts({ userId: 'user_new' }))[0]).toMatchObject({ claimedAt: T1, reason: 'family' });
    expect(await store.hasUnclaimedGifts()).toBe(false);
  });

  it('records each webhook event once', async () => {
    expect(await store.recordWebhookEvent('paddle', 'evt_1', { now: T0 })).toBe(true);
    expect(await store.recordWebhookEvent('paddle', 'evt_1', { now: T1 })).toBe(false);
    expect(await store.recordWebhookEvent('mercadopago', 'evt_1', { now: T1 })).toBe(true);
    expect(await store.hasWebhookEvent('paddle', 'evt_1')).toBe(true);
  });

  it('stores feedback with context and filters it for triage', async () => {
    const bug = await store.createFeedback({
      userId: 'user_tester', kind: 'bug', title: 'Timer resets', description: 'It reset.',
      severity: 'high', route: '/tasks', context: { viewport: '390x844', locale: 'es-PE' }, createdAt: T0,
    });
    await store.createFeedback({ kind: 'idea', title: 'Dark mode', description: 'Please.', createdAt: T1 });

    expect(bug).toMatchObject({ status: 'new', context: { viewport: '390x844' } });
    expect((await store.listFeedback({ kind: 'bug' })).map((r) => r.title)).toEqual(['Timer resets']);
    expect((await store.listFeedback()).map((r) => r.title)).toEqual(['Dark mode', 'Timer resets']);

    const triaged = await store.updateFeedback(bug.id, { status: 'triaged', adminNote: 'Repro on iOS', title: 'ignored' }, { now: T2 });
    expect(triaged).toMatchObject({ status: 'triaged', adminNote: 'Repro on iOS', title: 'Timer resets', updatedAt: T2 });
    expect(await store.listFeedback({ userId: 'user_tester', status: 'new' })).toEqual([]);
  });
});
