/**
 * The CRUD router with the real repository on in-memory SQLite: optimistic
 * locking (If-Match / ETag / 412) and idempotent creates (Idempotency-Key).
 * sqlite3 is an optional local-only backend, so the suite skips without it.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let sqlite3;
try { sqlite3 = require('sqlite3'); } catch { sqlite3 = null; }
const describeSqlite = sqlite3 ? describe : describe.skip;

describeSqlite('CRUD router concurrency contract', () => {
  let app;
  let db;
  const request = require('supertest');

  beforeAll(async () => {
    const express = require('express');
    const { ensureSqliteSchema, run } = require('../lib/sqlite');
    const { errorHandler } = require('../middleware/errorHandler');
    const { createEntityRepository } = require('../repositories/entityRepository');
    const { createEntityService } = require('../services/entityService');
    const { ENTITY_CONFIG } = require('../lib/entityConfig');
    const { schemas } = require('../validation/schemas');
    const createCrudRouter = require('./createCrudRouter');

    db = new sqlite3.Database(':memory:');
    await ensureSqliteSchema(db);
    db.runDelete = () => run(db, 'DELETE FROM tasks');
    const service = createEntityService(createEntityRepository({}, db, ENTITY_CONFIG.tasks));
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: req.get('x-test-user') || 'u1' }; next(); });
    app.use('/tasks', createCrudRouter({ service, schema: schemas.task }));
    app.use(errorHandler);
  });
  beforeEach(() => db.runDelete());
  afterAll(() => db.close());

  const create = (title, headers = {}) => request(app).post('/tasks').set(headers).send({ title });

  it('starts at version 1, exposes it as an ETag, and bumps it on every write', async () => {
    const made = await create('a');
    expect(made.body.version).toBe(1);
    expect(made.headers.etag).toBe('"1"');
    const patched = await request(app).patch(`/tasks/${made.body.id}`).send({ status: 'done' });
    expect(patched.body.version).toBe(2);
    expect(patched.headers.etag).toBe('"2"');
    const replaced = await request(app).put(`/tasks/${made.body.id}`).send({ title: 'b' });
    expect(replaced.body.version).toBe(3);
    expect((await request(app).get(`/tasks/${made.body.id}`)).headers.etag).toBe('"3"');
  });

  it('refuses a write based on an old version with 412 and the current copy, and changes nothing', async () => {
    const { body } = await create('original');
    await request(app).patch(`/tasks/${body.id}`).set('If-Match', '"1"').send({ title: 'device A' });

    const lost = await request(app).patch(`/tasks/${body.id}`).set('If-Match', '"1"').send({ title: 'device B' });
    expect(lost.status).toBe(412);
    expect(lost.body.error.code).toBe('VERSION_CONFLICT');
    expect(lost.body.error.details.current).toMatchObject({ title: 'device A', version: 2 });
    expect((await request(app).get(`/tasks/${body.id}`)).body.title).toBe('device A');

    const lostPut = await request(app).put(`/tasks/${body.id}`).set('If-Match', '"1"').send({ title: 'device B' });
    expect(lostPut.status).toBe(412);
  });

  it('lets exactly one of two simultaneous writers at the same version win', async () => {
    const { body } = await create('race');
    const results = await Promise.all(
      ['x', 'y', 'z'].map((title) => request(app).patch(`/tasks/${body.id}`).set('If-Match', '"1"').send({ title }))
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 412)).toHaveLength(2);
    expect((await request(app).get(`/tasks/${body.id}`)).body.version).toBe(2);
  });

  it('accepts weak tags, bare numbers and * and rejects garbage with 400', async () => {
    const { body } = await create('tags');
    expect((await request(app).patch(`/tasks/${body.id}`).set('If-Match', 'W/"1"').send({ title: '1' })).status).toBe(200);
    expect((await request(app).patch(`/tasks/${body.id}`).set('If-Match', '2').send({ title: '2' })).status).toBe(200);
    expect((await request(app).patch(`/tasks/${body.id}`).set('If-Match', '*').send({ title: '3' })).status).toBe(200);
    const bad = await request(app).patch(`/tasks/${body.id}`).set('If-Match', 'abc').send({ title: '4' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_IF_MATCH');
  });

  it('answers 404 (not 412) for a missing record, and never reveals another user\'s version', async () => {
    expect((await request(app).patch('/tasks/9999').set('If-Match', '"1"').send({ title: 'x' })).status).toBe(404);
    const { body } = await create('mine');
    const other = await request(app).patch(`/tasks/${body.id}`).set('x-test-user', 'u2').set('If-Match', '"1"').send({ title: 'x' });
    expect(other.status).toBe(404);
  });

  it('writes without If-Match still work (older clients) and still bump the version', async () => {
    const { body } = await create('legacy');
    const res = await request(app).patch(`/tasks/${body.id}`).send({ title: 'new' });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
  });

  it('a retried create with the same Idempotency-Key returns the first record and adds no row', async () => {
    const first = await create('once', { 'Idempotency-Key': 'key-1' });
    const retry = await create('once', { 'Idempotency-Key': 'key-1' });
    expect(retry.body.id).toBe(first.body.id);
    expect(first.body).not.toHaveProperty('idempotencyKey');
    expect((await request(app).get('/tasks')).body).toHaveLength(1);
  });

  it('concurrent retries with one key still make a single record', async () => {
    const results = await Promise.all([1, 2, 3, 4].map(() => create('burst', { 'Idempotency-Key': 'burst-key' })));
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect((await request(app).get('/tasks')).body).toHaveLength(1);
  });

  it('keys are per user and different keys make different records', async () => {
    const a = await create('same', { 'Idempotency-Key': 'shared-key' });
    const b = await create('same', { 'Idempotency-Key': 'shared-key', 'x-test-user': 'u2' });
    const c = await create('same', { 'Idempotency-Key': 'other-key' });
    expect(new Set([a.body.id, b.body.id, c.body.id]).size).toBe(3);
  });

  it('rejects a malformed Idempotency-Key', async () => {
    const res = await create('x', { 'Idempotency-Key': 'has space' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });
});
