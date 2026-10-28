import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

// The two-account check, automated: person A stores a record, then person B tries every route that
// can name an object, with A's real ids. Nothing of A's may be read, changed, deleted or counted.
const key = (env as unknown as { TEST_PRIVATE_JWK: string }).TEST_PRIVATE_JWK;
const token = async (sub: string) =>
  new SignJWT({ azp: 'https://app.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(sub)
    .setIssuer('https://clerk.test')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(await importJWK(JSON.parse(key), 'RS256'));

const call = async (as: string, path: string, init: { method?: string; body?: unknown } = {}) =>
  SELF.fetch(`https://api.test${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${await token(as)}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const json = async (res: Response) => (await res.json()) as Record<string, any>;
const A = 'sep_person_a';
const B = 'sep_person_b';

describe('two accounts never see or change each other', () => {
  it('keeps A intact through every route B can reach with A ids', async () => {
    const created = await call(A, '/api/tasks/sep-task', { method: 'PUT', body: { title: 'A private plan' } });
    expect(created.status).toBe(201);
    await call(A, '/api/debts/sep-debt', { method: 'PUT', body: { name: 'A card', balance: 10, annualRate: 1, minPayment: 1, dueDay: 3 } });
    const before = await json(await call(A, '/api/me/export'));

    // Read: B asks for A's ids, one record, the change feed and the export.
    expect((await call(B, '/api/tasks/sep-task')).status).toBe(404);
    expect((await call(B, '/api/debts/sep-debt')).status).toBe(404);
    expect((await json(await call(B, '/api/sync/pull?since=0'))).records).toEqual([]);
    expect((await json(await call(B, '/api/me/export'))).records).toEqual([]);

    // Change: B writes with A's ids. It creates B's own record and never touches A's (same id, different owner).
    const overwrite = await call(B, '/api/tasks/sep-task', { method: 'PUT', body: { title: 'B text' } });
    expect(overwrite.status).toBe(201);
    expect((await json(overwrite)).version).toBe(1);
    // B's own copy can be edited by B (version 1 is B's); A's copy is not involved.
    expect((await call(B, '/api/tasks/sep-task', { method: 'PUT', body: { title: 'x', baseVersion: 1 } })).status).toBe(200);

    // Delete: B deletes A's ids and erases "their" account.
    expect((await call(B, '/api/debts/sep-debt', { method: 'DELETE' })).status).toBe(204);
    expect((await call(B, '/api/me', { method: 'DELETE' })).status).toBe(204);

    const after = await json(await call(A, '/api/me/export'));
    const strip = (x: any) => x.records.map((r: any) => [r.entity, r.id, r.version, r.data]);
    expect(strip(after)).toEqual(strip(before));
    expect((await json(await call(A, '/api/tasks/sep-task'))).data.title).toBe('A private plan');
    expect((await call(A, '/api/debts/sep-debt')).status).toBe(200);
  });

  it('stores A and B under different internal owners even when the sign-in subject only differs in case', async () => {
    await call('Case_Person', '/api/tasks/case-1', { method: 'PUT', body: { title: 'upper' } });
    expect((await call('case_person', '/api/tasks/case-1')).status).toBe(404);
  });

  it('never accepts an owner from the request: a userId in the body or query is ignored', async () => {
    await call(A, '/api/tasks/own-1', { method: 'PUT', body: { title: 'A only' } });
    const hijack = await call(B, '/api/tasks/own-2?userId=sep_person_a', { method: 'PUT', body: { title: 'B text', userId: 'sep_person_a' } });
    expect(hijack.status).toBe(201);
    expect((await call(A, '/api/tasks/own-2')).status).toBe(404);
    expect((await call(B, '/api/sync/pull?since=0&userId=sep_person_a')).status).toBe(200);
    const feed = await json(await call(B, '/api/sync/pull?since=0&userId=sep_person_a'));
    expect(feed.records.map((r: any) => r.id)).not.toContain('own-1');
  });
});
