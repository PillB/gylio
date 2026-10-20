/**
 * Tests for the /api/health route in server/server.js.
 *
 * Importing the server does not open sockets or connect to persistence, so the
 * route can be exercised in-process. Persistence is never initialised here,
 * which is the "still starting" state a health probe sees first.
 */

'use strict';

const { describe, it, expect, afterEach } = await import('vitest');

const { default: request } = await import('supertest');
const serverModule = await import('./server.js');
const { app } = serverModule.default || serverModule;

describe('GET /api/health', () => {
  const savedKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedKey;
  });

  it('answers 503 with a JSON body, not a 500, while persistence is not ready', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.databaseReady).toBe(false);
  });

  it('reports aiConfigured from OPENAI_API_KEY at request time', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-mock';
    expect((await request(app).get('/api/health')).body.aiConfigured).toBe(true);

    delete process.env.OPENAI_API_KEY;
    expect((await request(app).get('/api/health')).body.aiConfigured).toBe(false);
  });
});
