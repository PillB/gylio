import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { importJWK, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';

const e = env as unknown as { TEST_PRIVATE_JWK: string; DB: D1Database };
const token = async (sub: string) =>
  new SignJWT({ azp: 'https://app.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(sub)
    .setIssuer('https://clerk.test')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(await importJWK(JSON.parse(e.TEST_PRIVATE_JWK), 'RS256'));

const call = async (path: string, as: string | null, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  if (as) headers.set('Authorization', `Bearer ${await token(as)}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  return SELF.fetch(`https://api.test${path}`, { ...init, headers });
};
const report = (as: string, extra: object = {}) =>
  call('/api/feedback', as, { method: 'POST', body: JSON.stringify({ kind: 'bug', title: 'Timer stops', description: 'The focus timer stops when I switch tabs.', severity: 'high', ...extra }) });
type Report = { id: string; kind: string; title: string; status: string; severity: string | null; description?: string; context?: Record<string, unknown>; adminNote?: string | null; userId?: string };

afterEach(async () => {
  await e.DB.exec('DELETE FROM feedback_reports');
  await e.DB.exec('DELETE FROM analytics_events');
});

describe('bug reports', () => {
  it('need someone signed in', async () => {
    expect((await call('/api/feedback', null, { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await call('/api/feedback/mine', null)).status).toBe(401);
  });

  it('are stored cleaned, and answered with what the reporter may see', async () => {
    const res = await report('reporter_a', {
      title: '  Timer\u0007 stops  ',
      route: '/tasks',
      context: { userAgent: 'Firefox', viewport: '390x844', online: false, consoleErrors: ['boom'], secret: 'dropped', locale: { not: 'text' } },
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as Report;
    expect(created).toMatchObject({ kind: 'bug', title: 'Timer stops', status: 'new', severity: 'high', route: '/tasks' });
    expect(created).not.toHaveProperty('description');
    expect(created).not.toHaveProperty('userId');
    const stored = await e.DB.prepare('SELECT context FROM feedback_reports WHERE id = ?').bind(created.id).first<{ context: string }>();
    expect(JSON.parse(stored!.context)).toEqual({ userAgent: 'Firefox', viewport: '390x844', online: false, consoleErrors: ['boom'] });
  });

  it('keep a severity for bugs only, and refuse what is not a report', async () => {
    const idea = (await (await report('reporter_a', { kind: 'idea' })).json()) as Report;
    expect(idea.severity).toBeNull();
    const bad = await report('reporter_a', { kind: 'rant', title: 'x', description: 'short', severity: 'urgent' });
    expect(bad.status).toBe(400);
    const fields = ((await bad.json()) as { error: { details: { field: string }[] } }).error.details.map((d) => d.field);
    expect(fields).toEqual(['kind', 'title', 'description', 'severity']);
  });

  it('are listed back to their own reporter only', async () => {
    await report('reporter_a');
    await report('reporter_b', { title: 'Someone else' });
    const mine = (await (await call('/api/feedback/mine', 'reporter_a')).json()) as { reports: Report[] };
    expect(mine.reports.map((r) => r.title)).toEqual(['Timer stops']);
  });

  it('stop at 20 a day per person', async () => {
    for (let n = 0; n < 20; n++) expect((await report('busy_reporter')).status).toBe(201);
    expect((await report('busy_reporter')).status).toBe(429);
    expect((await report('reporter_a')).status).toBe(201);
  });

  it("are in the reporter's export, without the admin's note, and erased with the account", async () => {
    const { id } = (await (await report('leaving_reporter')).json()) as Report;
    await e.DB.prepare("UPDATE feedback_reports SET adminNote = 'internal' WHERE id = ?").bind(id).run();
    const exported = (await (await call('/api/me/export', 'leaving_reporter')).json()) as { reports: Report[] };
    expect(exported.reports).toHaveLength(1);
    expect(exported.reports[0]).toMatchObject({ id, description: 'The focus timer stops when I switch tabs.' });
    expect(exported.reports[0]).not.toHaveProperty('adminNote');
    expect(exported.reports[0]).not.toHaveProperty('userId');
    await report('staying_reporter');
    expect((await call('/api/me', 'leaving_reporter', { method: 'DELETE' })).status).toBe(204);
    const left = await e.DB.prepare('SELECT title FROM feedback_reports').all<{ title: string }>();
    expect(left.results).toHaveLength(1);
  });
});

describe('the admin console', () => {
  it('answers admins only', async () => {
    for (const path of ['/api/admin/feedback', '/api/admin/analytics']) {
      expect((await call(path, 'reporter_a')).status).toBe(403);
      expect((await call(path, null)).status).toBe(401);
      expect((await call(path, 'admin_two')).status).toBe(200);
    }
    expect((await call('/api/admin/feedback/x', 'reporter_a', { method: 'PATCH', body: '{"status":"fixed"}' })).status).toBe(403);
  });

  it('tells the app whether to offer the console, to the person signed in only', async () => {
    const admin = async (as: string | null) => {
      const res = await call('/api/me/admin', as);
      return res.status === 200 ? ((await res.json()) as { admin: boolean }).admin : res.status;
    };
    expect(await admin('admin_one')).toBe(true);
    expect(await admin('admin_two')).toBe(true);
    expect(await admin('reporter_a')).toBe(false);
    expect(await admin(null)).toBe(401);
  });

  it('lists every report with whose it is, and filters by status and kind', async () => {
    const { id } = (await (await report('reporter_a')).json()) as Report;
    await report('reporter_b', { kind: 'idea', title: 'Dark mode' });
    const all = (await (await call('/api/admin/feedback', 'admin_one')).json()) as { reports: Report[] };
    expect(all.reports.map((r) => r.title).sort()).toEqual(['Dark mode', 'Timer stops']);
    expect(all.reports.every((r) => typeof r.userId === 'string' && r.userId.length > 0)).toBe(true);
    const ideas = (await (await call('/api/admin/feedback?kind=idea', 'admin_one')).json()) as { reports: Report[] };
    expect(ideas.reports.map((r) => r.title)).toEqual(['Dark mode']);
    await call(`/api/admin/feedback/${id}`, 'admin_one', { method: 'PATCH', body: JSON.stringify({ status: 'fixed' }) });
    const fixed = (await (await call('/api/admin/feedback?status=fixed', 'admin_one')).json()) as { reports: Report[] };
    expect(fixed.reports.map((r) => r.id)).toEqual([id]);
  });

  it('triages a report: status, severity and note, each checked', async () => {
    const { id } = (await (await report('reporter_a')).json()) as Report;
    const res = await call(`/api/admin/feedback/${id}`, 'admin_one', { method: 'PATCH', body: JSON.stringify({ status: 'triaged', severity: 'low', adminNote: ' seen ' }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id, status: 'triaged', severity: 'low', adminNote: 'seen' });
    const mine = (await (await call('/api/feedback/mine', 'reporter_a')).json()) as { reports: Report[] };
    expect(mine.reports[0]).toMatchObject({ status: 'triaged' });
    expect(mine.reports[0]).not.toHaveProperty('adminNote');
    expect((await call(`/api/admin/feedback/${id}`, 'admin_one', { method: 'PATCH', body: JSON.stringify({ status: 'gone' }) })).status).toBe(400);
    expect((await call(`/api/admin/feedback/${id}`, 'admin_one', { method: 'PATCH', body: '{}' })).status).toBe(400);
    expect((await call('/api/admin/feedback/missing', 'admin_one', { method: 'PATCH', body: JSON.stringify({ status: 'fixed' }) })).status).toBe(404);
  });

  it('summarises the analytics of the window asked for', async () => {
    const now = Date.now();
    const insert = (id: string, name: string, session: string, ageDays: number, props: object = {}) =>
      e.DB.prepare('INSERT INTO analytics_events (eventId, name, sessionId, signedIn, props, receivedAt) VALUES (?, ?, ?, 0, ?, ?)')
        .bind(id, name, session, JSON.stringify(props), now - ageDays * 86_400_000)
        .run();
    await insert('ev-recent-1', 'paywall_viewed', 's1', 0.5);
    await insert('ev-recent-2', 'trial_started', 's1', 0.5);
    await insert('ev-recent-3', 'paywall_viewed', 's2', 3);
    await insert('ev-old-0001', 'paywall_viewed', 's3', 20);
    const week = (await (await call('/api/admin/analytics?days=7', 'admin_one')).json()) as { days: number; events: number; sessions: number; funnel: { step: string; sessions: number }[] };
    expect(week).toMatchObject({ days: 7, events: 3, sessions: 2 });
    expect(week.funnel.slice(0, 2)).toEqual([{ step: 'paywall_viewed', sessions: 2 }, { step: 'trial_started', sessions: 1 }]);
    const day = (await (await call('/api/admin/analytics?days=1', 'admin_one')).json()) as { events: number };
    expect(day.events).toBe(2);
    const fallback = (await (await call('/api/admin/analytics?days=5', 'admin_one')).json()) as { days: number; events: number };
    expect(fallback).toMatchObject({ days: 30, events: 4 });
  });
});
