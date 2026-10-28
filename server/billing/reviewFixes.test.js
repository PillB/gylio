import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const { allowedOrigins } = require('../lib/origins');
const { buildRateLimit } = require('../middleware/rateLimit');
const { normalizePaddleEvent } = require('./providers/paddle');

describe('allowed origins (CORS and checkout return links)', () => {
  it('allows the local dev server when nothing is configured, and nothing in production', () => {
    expect([...allowedOrigins({ NODE_ENV: 'development' })]).toContain('http://localhost:5173');
    expect([...allowedOrigins({ NODE_ENV: 'production' })]).toEqual([]);
    expect([...allowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.gylio.app' })]).toEqual(['https://app.gylio.app']);
  });
});

describe('rate limits', () => {
  it('counts signed-in people separately even when they share one IP', async () => {
    const app = express();
    app.use((req, _res, next) => { req.user = { id: req.get('x-user') }; next(); });
    app.use(buildRateLimit({ windowMs: 60_000, max: 2, code: 'RATE_LIMITED', message: 'slow down' }));
    app.get('/', (_req, res) => res.send('ok'));
    const hit = (user) => request(app).get('/').set('x-user', user);
    await hit('alice'); await hit('alice');
    expect((await hit('alice')).status).toBe(429);
    // Same IP (supertest), different person: own budget.
    expect((await hit('bob')).status).toBe(200);
  });
});

describe('Paddle subscription currency', () => {
  it('stores the currency the subscription bills in, not the base price currency', () => {
    const { record } = normalizePaddleEvent({
      event_id: 'evt_pen', event_type: 'subscription.created', occurred_at: '2026-10-01T00:00:00Z',
      data: {
        id: 'sub_pen', status: 'active', currency_code: 'PEN', custom_data: { userId: 'u' },
        billing_cycle: { interval: 'year' },
        current_billing_period: { starts_at: '2026-10-01T00:00:00Z', ends_at: '2027-10-01T00:00:00Z' },
        items: [{ price: { unit_price: { amount: '4999', currency_code: 'USD' } } }],
      },
    });
    expect(record).toMatchObject({ currency: 'PEN', amountMinor: null });
  });
});
