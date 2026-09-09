/**
 * Tests for server/routes/billing.js
 * Uses in-process fetch mocking (no actual Clerk API calls)
 */

'use strict';

const { describe, it, expect, vi, beforeEach, afterEach } = await import('vitest');

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Minimal Express app wired with billing router
// ---------------------------------------------------------------------------

process.env.CLERK_SECRET_KEY = 'sk_test_MOCK_KEY_FOR_TESTS';
process.env.CLERK_JWKS_URL   = 'https://test.clerk.dev/.well-known/jwks.json';
process.env.CLERK_ISSUER     = 'https://test.clerk.dev';

const express = (await import('express')).default;
const billingRouter = await import('./billing.js');

function makeApp(userId = 'user_abc') {
  const app = express();
  app.use(express.json());
  // Inject authenticated user (bypass real auth middleware)
  app.use((req, _res, next) => { req.user = { id: userId }; next(); });
  app.use('/api/billing', billingRouter.default || billingRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Supertest
// ---------------------------------------------------------------------------

const { default: request } = await import('supertest');

// ---------------------------------------------------------------------------
// activate-trial
// ---------------------------------------------------------------------------

describe('POST /api/billing/activate-trial', () => {
  const app = makeApp('user_abc');

  beforeEach(() => { vi.clearAllMocks(); });

  it('activates trial for a new user', async () => {
    // getClerkUser returns user with no trial metadata
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ public_metadata: {} }) })   // GET /users/:id
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'user_abc' }) });        // PATCH /users/:id

    const res = await request(app).post('/api/billing/activate-trial');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plan).toBe('user_subscription');
    expect(res.body.trialStartedAt).toBeDefined();
    expect(res.body.trialEndsAt).toBeDefined();
  });

  it('returns 409 when trial was already activated (trialStartedAt present)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_metadata: { trialStartedAt: '2025-01-01T00:00:00Z' } })
    });

    const res = await request(app).post('/api/billing/activate-trial');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TRIAL_ALREADY_USED');
  });

  it('returns 409 when hadTrial flag is set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_metadata: { hadTrial: true } })
    });

    const res = await request(app).post('/api/billing/activate-trial');
    expect(res.status).toBe(409);
  });

  it('returns 502 when Clerk PATCH fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ public_metadata: {} }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Internal' }) });

    const res = await request(app).post('/api/billing/activate-trial');
    expect(res.status).toBe(502);
  });

  it('returns 500 when CLERK_SECRET_KEY is missing', async () => {
    const savedKey = process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_SECRET_KEY;

    const res = await request(makeApp('u')).post('/api/billing/activate-trial');
    expect(res.status).toBe(500);

    process.env.CLERK_SECRET_KEY = savedKey;
  });
});

// ---------------------------------------------------------------------------
// cancel
// ---------------------------------------------------------------------------

describe('POST /api/billing/cancel', () => {
  const app = makeApp('user_abc');

  beforeEach(() => { vi.clearAllMocks(); });

  it('cancels subscription and sets free_user', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'user_abc' }) });

    const res = await request(app).post('/api/billing/cancel');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plan).toBe('free_user');
  });

  it('returns 502 when Clerk PATCH fails on cancel', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 503, json: async () => ({ error: 'Unavailable' })
    });

    const res = await request(app).post('/api/billing/cancel');
    expect(res.status).toBe(502);
  });
});
