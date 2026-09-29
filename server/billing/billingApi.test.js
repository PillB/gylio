/**
 * End-to-end tests of the real server.js app: real routing order, real Clerk
 * JWT verification (against a local JWKS), real SQLite store, real signature
 * checks. Only the outside world is faked: Paddle, Mercado Pago and Clerk's
 * user API, plus the clock.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import http from 'node:http';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const request = require('supertest');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-key';
let jwksServer;
let app;
let billing;
let clock;
let payments;
let clerkEmails;

const PADDLE_SECRET = 'pdl_test_secret';
const MP_SECRET = 'mp_test_secret';
const DAY = 24 * 60 * 60 * 1000;

const token = (sub) => jwt.sign({ sub }, privateKey, {
  algorithm: 'RS256', keyid: KID, issuer: process.env.CLERK_ISSUER, expiresIn: '5m',
});
const as = (sub) => ({ Authorization: `Bearer ${token(sub)}` });

function signPaddle(body) {
  const ts = Math.floor(Date.now() / 1000); // the webhook router checks freshness against the real clock
  const h1 = crypto.createHmac('sha256', PADDLE_SECRET).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function signMercadoPago(dataId, requestId) {
  const ts = Math.floor(Date.now() / 1000); // the webhook router checks freshness against the real clock
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${crypto.createHmac('sha256', MP_SECRET).update(manifest).digest('hex')}`;
}

beforeAll(async () => {
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'RS256' };
  jwksServer = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
  const { port } = jwksServer.address();

  Object.assign(process.env, {
    CLERK_ISSUER: 'https://clerk.test.example',
    CLERK_JWKS_URL: `http://127.0.0.1:${port}/jwks`,
    CLERK_AUTHORIZED_PARTIES: '',
    ADMIN_USER_IDS: 'user_admin',
    PADDLE_WEBHOOK_SECRET: PADDLE_SECRET,
    MERCADOPAGO_WEBHOOK_SECRET: MP_SECRET,
    CORS_ORIGINS: 'https://app.gylio.test',
  });

  ({ app } = require('../server.js'));
  billing = require('./index.js');
});

afterAll(() => new Promise((resolve) => jwksServer.close(resolve)));

beforeEach(async () => {
  const { createSqliteStore } = require('./sqliteStore');
  const { createBillingService } = require('./service');
  const store = createSqliteStore(new sqlite3.Database(':memory:'));
  await store.init();

  clock = { now: Date.parse('2026-10-01T12:00:00.000Z') };
  payments = {};
  clerkEmails = {};
  const service = createBillingService({
    store,
    clock: () => new Date(clock.now),
    logger: { warn() {} },
    clerk: {
      configured: true,
      getVerifiedEmails: async (userId) => clerkEmails[userId] || [],
      findUserIdByEmail: async (email) =>
        Object.keys(clerkEmails).find((id) => clerkEmails[id].includes(email)) || null,
      getPrimaryEmails: async (ids) => Object.fromEntries(ids.map((id) => [id, clerkEmails[id]?.[0] || null])),
    },
    paddle: {
      configured: true,
      createCheckout: async ({ planId }) => (planId === 'pro_yearly' ? { provider: 'paddle', transactionId: 'txn_1' } : null),
      createPortalUrl: async () => 'https://portal.paddle.test/session',
    },
    mercadopago: {
      configured: true,
      fetchPayment: async (id) => payments[id],
    },
  });
  billing.setBillingContext({ store, service });
});

describe('trial', () => {
  it('starts a 7-day trial once and reports Pro until it ends', async () => {
    const before = await request(app).get('/api/billing/entitlement').set(as('user_a'));
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ plan: 'free', isAdmin: false, trial: { eligible: true } });

    const started = await request(app).post('/api/billing/trial').set(as('user_a'));
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ plan: 'pro', source: 'trial', expiresAt: '2026-10-08T12:00:00.000Z' });

    const again = await request(app).post('/api/billing/trial').set(as('user_a'));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TRIAL_NOT_AVAILABLE');

    clock.now += 7 * DAY;
    const after = await request(app).get('/api/billing/entitlement').set(as('user_a'));
    expect(after.body.plan).toBe('free');
  });

  it('rejects requests without a valid token', async () => {
    expect((await request(app).post('/api/billing/trial')).status).toBe(401);
    const forged = jwt.sign({ sub: 'user_a' }, 'not-the-key', { issuer: process.env.CLERK_ISSUER, keyid: KID });
    expect((await request(app).get('/api/billing/entitlement').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });
});

describe('Pro gate on AI', () => {
  it('refuses a free account with PRO_REQUIRED, whatever its token metadata says', async () => {
    const claimsPro = jwt.sign({ sub: 'user_free', public_metadata: { plan: 'user_subscription' } }, privateKey, {
      algorithm: 'RS256', keyid: KID, issuer: process.env.CLERK_ISSUER,
    });
    const res = await request(app).post('/api/ai/social-suggestions')
      .set('Authorization', `Bearer ${claimsPro}`).send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PRO_REQUIRED');
  });
});

describe('Paddle webhooks', () => {
  const event = (overrides = {}) => JSON.stringify({
    event_id: 'evt_1',
    event_type: 'subscription.created',
    occurred_at: '2026-10-01T12:00:00.000Z',
    data: {
      id: 'sub_1', status: 'active', customer_id: 'ctm_1', custom_data: { userId: 'user_paid' },
      billing_cycle: { interval: 'year', frequency: 1 },
      current_billing_period: { starts_at: '2026-10-01T12:00:00.000Z', ends_at: '2027-10-01T12:00:00.000Z' },
      items: [{ price: { unit_price: { amount: '4999', currency_code: 'USD' } } }],
      updated_at: '2026-10-01T12:00:00.000Z',
      ...overrides,
    },
  });

  const post = (body, signature = signPaddle(body)) =>
    request(app).post('/api/webhooks/paddle').set('Content-Type', 'application/json')
      .set('Paddle-Signature', signature).send(body);

  it('applies a signed subscription and makes the user Pro', async () => {
    const res = await post(event());
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('applied');

    const ent = await request(app).get('/api/billing/entitlement').set(as('user_paid'));
    expect(ent.body).toMatchObject({
      plan: 'pro', source: 'subscription', renews: true,
      subscription: { provider: 'paddle', interval: 'year', currentPeriodEnd: '2027-10-01T12:00:00.000Z' },
      trial: { eligible: false },
    });
  });

  it('rejects an unsigned or tampered event and ignores a duplicate delivery', async () => {
    const body = event();
    expect((await post(body, 'ts=1;h1=00')).status).toBe(401);
    expect((await post(body.replace('user_paid', 'user_evil'), signPaddle(body))).status).toBe(401);
    await post(body);
    expect((await post(body)).body.outcome).toBe('duplicate');
  });

  it('ends access when Paddle reports the subscription canceled, and ignores a late older update', async () => {
    await post(event());
    await post(JSON.stringify({
      ...JSON.parse(event({ status: 'canceled', canceled_at: '2026-10-05T00:00:00.000Z', updated_at: '2026-10-05T00:00:00.000Z' })),
      event_id: 'evt_2', event_type: 'subscription.canceled',
    }));
    clock.now = Date.parse('2026-10-06T00:00:00.000Z');
    const late = JSON.stringify({ ...JSON.parse(event({ updated_at: '2026-10-02T00:00:00.000Z' })), event_id: 'evt_3' });
    await post(late);

    const ent = await request(app).get('/api/billing/entitlement').set(as('user_paid'));
    expect(ent.body.plan).toBe('free');
  });

  it('opens the Paddle portal for a paying user', async () => {
    await post(event());
    const res = await request(app).post('/api/billing/portal').set(as('user_paid'));
    expect(res.body.url).toBe('https://portal.paddle.test/session');
  });
});

describe('Mercado Pago passes', () => {
  const notify = (paymentId, requestId = `req-${paymentId}`) =>
    request(app).post(`/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`)
      .set('x-signature', signMercadoPago(paymentId, requestId)).set('x-request-id', requestId)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'payment', data: { id: paymentId } }));

  const payment = (id, extra = {}) => ({
    id, status: 'approved', currency_id: 'PEN', transaction_amount: 14.9,
    external_reference: 'gylio:user_yape:pass_30', ...extra,
  });

  it('grants 30 days per approved pass and stacks a second pass after the first', async () => {
    payments['111'] = payment(111);
    payments['222'] = payment(222);
    expect((await notify('111')).body.outcome).toBe('applied');
    expect((await notify('111')).body.outcome).toBe('duplicate');
    await notify('222');

    const ent = await request(app).get('/api/billing/entitlement').set(as('user_yape'));
    // 1 Oct 12:00 + 30 days = 31 Oct; + 30 more = 30 Nov.
    expect(ent.body).toMatchObject({ plan: 'pro', renews: false, expiresAt: '2026-11-30T12:00:00.000Z' });
  });

  it('refuses a payment whose amount does not match the pass', async () => {
    payments['333'] = payment(333, { transaction_amount: 1.49 });
    expect((await notify('333')).body.outcome).toBe('ignored');
    expect((await request(app).get('/api/billing/entitlement').set(as('user_yape'))).body.plan).toBe('free');
  });

  it('removes access when the payment is refunded', async () => {
    payments['444'] = payment(444);
    await notify('444');
    payments['444'] = payment(444, { status: 'refunded' });
    await notify('444', 'req-refund');
    expect((await request(app).get('/api/billing/entitlement').set(as('user_yape'))).body.plan).toBe('free');
  });

  it('rejects a notification signed for a different payment', async () => {
    const res = await request(app).post('/api/webhooks/mercadopago?data.id=555&type=payment')
      .set('x-signature', signMercadoPago('999', 'r')).set('x-request-id', 'r').send('{}');
    expect(res.status).toBe(401);
  });
});

describe('admin gifts', () => {
  const grant = (body) => request(app).post('/api/admin/gifts').set(as('user_admin')).send(body);

  it('is closed to non-admins', async () => {
    expect((await request(app).get('/api/admin/pro-access').set(as('user_a'))).status).toBe(403);
    expect((await request(app).post('/api/admin/gifts').set(as('user_a')).send({ userId: 'user_a', days: 30, reason: 'friend' })).status).toBe(403);
  });

  it('gifts a month to someone who has not signed up yet, and they get it on first sign-in', async () => {
    const res = await grant({ email: 'Mama@Example.com', days: 30, reason: 'family' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: null, email: 'mama@example.com' });

    clerkEmails.user_mama = ['mama@example.com'];
    const ent = await request(app).get('/api/billing/entitlement').set(as('user_mama'));
    expect(ent.body).toMatchObject({ plan: 'pro', source: 'gift', expiresAt: '2026-10-31T12:00:00.000Z' });
  });

  it('gives indefinite Pro to a tester, lists them, and takes it back', async () => {
    clerkEmails.user_tester = ['tester@example.com'];
    const gift = (await grant({ email: 'tester@example.com', days: null, reason: 'tester', note: 'beta' })).body;
    expect(gift.userId).toBe('user_tester');

    const access = await request(app).get('/api/admin/pro-access').set(as('user_admin'));
    expect(access.body.users).toEqual([
      expect.objectContaining({ userId: 'user_tester', email: 'tester@example.com', source: 'gift', expiresAt: null }),
    ]);
    expect(access.body.gifts[0]).toMatchObject({ state: 'active', reason: 'tester', grantedBy: 'user_admin' });

    expect((await request(app).post(`/api/admin/gifts/${gift.id}/revoke`).set(as('user_admin'))).status).toBe(200);
    expect((await request(app).post(`/api/admin/gifts/${gift.id}/revoke`).set(as('user_admin'))).status).toBe(404);
    expect((await request(app).get('/api/billing/entitlement').set(as('user_tester'))).body.plan).toBe('free');
  });

  it('validates gift requests', async () => {
    const res = await grant({ email: 'not-an-email', days: 1.5, reason: 'bribe' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['days', 'email', 'reason']);
  });
});

describe('feedback and QA inbox', () => {
  const report = { kind: 'bug', title: 'Timer resets', description: 'The focus timer resets on tab switch.', severity: 'high', route: '/tasks', context: { viewport: '390x844', password: 'x' } };

  it('stores a signed-in report without unknown context fields and shows it to its author', async () => {
    const created = await request(app).post('/api/feedback').set(as('user_t')).send(report);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ kind: 'bug', status: 'new' });

    const mine = await request(app).get('/api/feedback/mine').set(as('user_t'));
    expect(mine.body.reports.map((r) => r.title)).toEqual(['Timer resets']);

    const inbox = await request(app).get('/api/admin/feedback?kind=bug').set(as('user_admin'));
    expect(inbox.body.reports[0].context).toEqual({ viewport: '390x844' });
  });

  it('refuses anonymous reports unless explicitly allowed, and rejects invalid ones', async () => {
    delete process.env.FEEDBACK_ALLOW_ANONYMOUS;
    expect((await request(app).post('/api/feedback').send(report)).status).toBe(401);
    process.env.FEEDBACK_ALLOW_ANONYMOUS = 'true';
    expect((await request(app).post('/api/feedback').send(report)).status).toBe(201);
    const bad = await request(app).post('/api/feedback').send({ kind: 'rant', title: 'x', description: 'short' });
    expect(bad.status).toBe(400);
    delete process.env.FEEDBACK_ALLOW_ANONYMOUS;
  });

  it('lets an admin triage a report and the author sees the new status', async () => {
    const { id } = (await request(app).post('/api/feedback').set(as('user_t')).send(report)).body;
    const triaged = await request(app).patch(`/api/admin/feedback/${id}`).set(as('user_admin')).send({ status: 'fixed', adminNote: 'Fixed in 0.2' });
    expect(triaged.body).toMatchObject({ status: 'fixed', adminNote: 'Fixed in 0.2' });
    expect((await request(app).patch(`/api/admin/feedback/${id}`).set(as('user_t')).send({ status: 'fixed' })).status).toBe(403);
    expect((await request(app).get('/api/feedback/mine').set(as('user_t'))).body.reports[0].status).toBe('fixed');
  });
});

describe('public plans', () => {
  it('serves the catalogue without sign-in', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
    expect(res.body.trialDays).toBe(7);
    expect(res.body.plans.map((p) => p.id)).toEqual(['pro_monthly', 'pro_yearly']);
  });
});

describe('saved app state', () => {
  it('saves per user, returns it on another device, and refuses a stale overwrite', async () => {
    const put = (user, body) => request(app).put('/api/state').set(as(user)).send(body);
    expect((await request(app).get('/api/state').set(as('user_s'))).body.state).toBeNull();

    const first = await put('user_s', { baseVersion: 0, data: { gylio_sqlite: '{"tasks":[1]}' } });
    expect(first.status).toBe(200);
    expect(first.body.state).toMatchObject({ version: 1, data: { gylio_sqlite: '{"tasks":[1]}' } });

    // "Another device" reads it back.
    expect((await request(app).get('/api/state').set(as('user_s'))).body.state.version).toBe(1);
    // Someone else sees nothing of it.
    expect((await request(app).get('/api/state').set(as('user_other'))).body.state).toBeNull();

    await put('user_s', { baseVersion: 1, data: { gylio_sqlite: '{"tasks":[1,2]}' } });
    const stale = await put('user_s', { baseVersion: 1, data: { gylio_sqlite: '{"tasks":[]}' } });
    expect(stale.status).toBe(409);
    expect(stale.body.state).toMatchObject({ version: 2, data: { gylio_sqlite: '{"tasks":[1,2]}' } });
  });

  it('accepts a snapshot larger than the global 256 kB limit but refuses one over 2 MB', async () => {
    const big = 'x'.repeat(600 * 1024);
    expect((await request(app).put('/api/state').set(as('user_big')).send({ baseVersion: 0, data: { k: big } })).status).toBe(200);
    const huge = 'x'.repeat(2.2 * 1024 * 1024);
    expect((await request(app).put('/api/state').set(as('user_big')).send({ baseVersion: 1, data: { k: huge } })).status).toBe(413);
  });

  it('requires sign-in and a well-formed body', async () => {
    expect((await request(app).get('/api/state')).status).toBe(401);
    expect((await request(app).put('/api/state').set(as('u')).send({ baseVersion: -1, data: {} })).status).toBe(400);
    expect((await request(app).put('/api/state').set(as('u')).send({ baseVersion: 0, data: [] })).status).toBe(400);
  });
});
