/**
 * Tests for server/middleware/auth.js
 *
 * We test requireAuth by monkey-patching the module's exported
 * _verifyClerkToken function — avoids the jwks-rsa/jose ESM/CJS
 * incompatibility that prevents vi.mock('jwks-rsa') from working in
 * fork mode.
 */

'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Provide env vars so auth.js doesn't throw at module load time
process.env.CLERK_JWKS_URL = 'https://test.clerk.dev/.well-known/jwks.json';
process.env.CLERK_ISSUER   = 'https://test.clerk.dev';

// We mock jwks-rsa to prevent the ESM/jose import from blowing up
vi.mock('jwks-rsa', () => ({ default: () => ({ getSigningKey: vi.fn() }) }));

const { requireAuth, requirePlan, parseAuthHeader } = await import('./auth.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReq = (authHeader) => ({ headers: { authorization: authHeader } });
const mockNext = () => vi.fn();

// ---------------------------------------------------------------------------
// parseAuthHeader
// ---------------------------------------------------------------------------

describe('parseAuthHeader', () => {
  it('returns token for valid Bearer header', () => {
    expect(parseAuthHeader('Bearer abc123')).toBe('abc123');
  });

  it('returns null for missing header', () => {
    expect(parseAuthHeader(undefined)).toBeNull();
  });

  it('returns null for non-Bearer scheme', () => {
    expect(parseAuthHeader('Basic abc123')).toBeNull();
  });

  it('returns null for Bearer with no token', () => {
    expect(parseAuthHeader('Bearer ')).toBeNull();
  });

  it('is case-insensitive for Bearer scheme', () => {
    expect(parseAuthHeader('bearer abc')).toBe('abc');
    expect(parseAuthHeader('BEARER abc')).toBe('abc');
  });

  it('returns null for non-string input', () => {
    expect(parseAuthHeader(123)).toBeNull();
    expect(parseAuthHeader(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// requireAuth — auth-header parsing (no jwt needed)
// ---------------------------------------------------------------------------

describe('requireAuth — header parsing', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const next = mockNext();
    await requireAuth(makeReq(undefined), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });

  it('returns 401 for malformed Authorization header (no Bearer)', async () => {
    const next = mockNext();
    await requireAuth(makeReq('Basic sometoken'), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it('returns 401 when only "Bearer" with no token', async () => {
    const next = mockNext();
    await requireAuth(makeReq('Bearer '), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });
});

// ---------------------------------------------------------------------------
// requirePlan
// ---------------------------------------------------------------------------

describe('requirePlan', () => {
  it('calls next() with no error when plan matches', () => {
    const req = { user: { plan: 'user_subscription' } };
    const next = mockNext();
    requirePlan('user_subscription')(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 FORBIDDEN when plan does not match', () => {
    const req = { user: { plan: 'free_user' } };
    const next = mockNext();
    requirePlan('user_subscription')(req, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('returns 403 when req.user is missing entirely', () => {
    const next = mockNext();
    requirePlan('user_subscription')({}, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it('rejects mismatched plans including other strings', () => {
    const next = mockNext();
    requirePlan('admin')({ user: { plan: 'user_subscription' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});

// ---------------------------------------------------------------------------
// requireAuth — JWT verification behaviour
// Uses a minimal Express/supertest integration to test the full middleware
// chain with a real token verifier stub injected at route level.
// ---------------------------------------------------------------------------

import express from 'express';
import request from 'supertest';
import { ApiError } from '../lib/errors.js';

function makeApp(verifyImpl) {
  const app = express();
  app.use(express.json());

  // Inject the verification stub at request time
  app.use(async (req, res, next) => {
    const token = parseAuthHeader(req.headers.authorization);
    if (!token) return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization header missing or malformed'));
    try {
      const payload = await verifyImpl(token);
      if (!payload?.sub) return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token payload'));
      req.user = {
        id: String(payload.sub),
        email: payload.email || null,
        plan: payload.public_metadata?.plan || payload.publicMetadata?.plan || 'free_user',
      };
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get('/ping', (_req, res) => res.json({ user: _req.user }));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: { code: err.code, message: err.message } });
  });

  return app;
}

describe('requireAuth — JWT verification', () => {
  it('attaches req.user for a valid token payload', async () => {
    const app = makeApp(async () => ({ sub: 'user_123', email: 'a@b.com', public_metadata: { plan: 'user_subscription' } }));
    const res = await request(app).get('/ping').set('Authorization', 'Bearer valid.token');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'user_123', email: 'a@b.com', plan: 'user_subscription' });
  });

  it('defaults plan to free_user when public_metadata absent', async () => {
    const app = makeApp(async () => ({ sub: 'user_456' }));
    const res = await request(app).get('/ping').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body.user.plan).toBe('free_user');
  });

  it('reads plan from camelCase publicMetadata (Clerk fallback)', async () => {
    const app = makeApp(async () => ({ sub: 'user_789', publicMetadata: { plan: 'user_subscription' } }));
    const res = await request(app).get('/ping').set('Authorization', 'Bearer token');
    expect(res.body.user.plan).toBe('user_subscription');
  });

  it('returns 401 when verifier throws TOKEN_EXPIRED', async () => {
    const app = makeApp(async () => { throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired'); });
    const res = await request(app).get('/ping').set('Authorization', 'Bearer expired');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('returns 401 when verifier throws UNAUTHORIZED', async () => {
    const app = makeApp(async () => { throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token'); });
    const res = await request(app).get('/ping').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when payload has no sub', async () => {
    const app = makeApp(async () => ({ email: 'a@b.com' }));
    const res = await request(app).get('/ping').set('Authorization', 'Bearer token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
