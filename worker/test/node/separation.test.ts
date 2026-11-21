import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = path.join(import.meta.dirname, '..', '..', '..');
const source = readFileSync(path.join(repo, 'worker', 'src', 'index.ts'), 'utf8');
const lines = source.split('\n');
const doc = readFileSync(path.join(repo, 'docs', 'DATA_SEPARATION.md'), 'utf8');

const registered = [...source.matchAll(/^app\.(get|put|delete|post|patch)\((HEALTH_PATH|'[^']+')/gm)].map((m) => ({
  method: m[1].toUpperCase(),
  path: m[2] === 'HEALTH_PATH' ? '/api/v1/health' : m[2].slice(1, -1),
  line: source.slice(0, m.index).split('\n').length,
}));

// Table rows look like: | `GET /api/sync/pull` | 115 | 120 | ... |   (a continuation row has an empty first cell)
const rows = doc
  .split('\n')
  .filter((l) => l.startsWith('|'))
  .map((l) => l.split('|').slice(1, -1).map((cell) => cell.trim()));
const routeRows = rows.filter((r) => /^`(GET|PUT|DELETE|POST|PATCH) /.test(r[0]));

describe('the data separation list matches the code', () => {
  it('lists every route the Worker registers, at the line where it is registered', () => {
    const documented = routeRows.map((r) => ({ key: r[0].replace(/`/g, ''), line: Number(r[1]) }));
    const actual = registered.map((r) => ({ key: `${r.method} ${r.path}`, line: r.line }));
    expect(documented).toEqual(actual);
  });

  it('cites lines that really carry the owner filter or the owner binding', () => {
    const cited = rows
      .flatMap((r) => (r[2] && r[2] !== 'none, on purpose' && /^\d+$/.test(r[2]) ? [Number(r[2])] : []))
      .concat(rows.filter((r) => r[0] === '' && /^\d+$/.test(r[2] ?? '')).map((r) => Number(r[2])));
    expect(cited.length).toBeGreaterThanOrEqual(8);
    for (const line of cited) expect(lines[line - 1], `line ${line}`).toMatch(/userId/);
    const bound = [...doc.matchAll(/owner bound at (\d+)/g)].map((m) => Number(m[1]));
    expect(bound.length).toBeGreaterThanOrEqual(3);
    for (const line of bound) expect(lines[line - 1], `line ${line}`).toMatch(/userId/);
  });

  it('names the middleware that sets the owner, and the admin gate, at their lines', () => {
    const [, middleware, set] = /in the middleware at line (\d+) \(`c\.set\('userId', userId\)`, line (\d+)\)/.exec(doc) ?? [];
    expect(lines[Number(middleware) - 1]).toMatch(/^app\.use\('\/api\/\*'/);
    expect(lines[Number(set) - 1]).toMatch(/c\.set\('userId', userId\)/);
    const gates = [...doc.matchAll(/admins only, gate at (\d+)/g)].map((m) => Number(m[1]));
    expect(gates.length).toBeGreaterThanOrEqual(3);
    for (const line of gates) expect(lines[line - 1], `line ${line}`).toMatch(/^app\.use\('\/api\/admin\/\*'/);
    // Every admin route comes after the gate, so the gate runs first.
    const gateLine = gates[0];
    for (const route of registered.filter((r) => r.path.startsWith('/api/admin/'))) expect(route.line).toBeGreaterThan(gateLine);
  });

  it('sets the owner once, from the verified sign-in, and nowhere else', () => {
    expect([...source.matchAll(/c\.set\('userId'/g)]).toHaveLength(1);
    expect(source).not.toMatch(/c\.req\.(query|param|header)\(\s*['"]userId/i);
    expect(source).not.toMatch(/body\.userId|body\['userId'\]/);
  });

  it("scopes every statement on a person's rows by owner", () => {
    // Every quoted or template string that names one of the owner-keyed tables must carry the owner column.
    // The health probe (SELECT 1 ... LIMIT 1) returns no row to anyone and is the only exemption.
    // The admin console reads every report on purpose; its routes sit behind the admin gate (checked above).
    const adminRanges = registered
      .filter((r) => r.path.startsWith('/api/admin/'))
      .map((r) => [r.line, registered.find((next) => next.line > r.line)?.line ?? lines.length] as const);
    const inAdmin = (line: number) => adminRanges.some(([from, to]) => line >= from && line < to);
    const literals = [...source.matchAll(/`[^`]*`|'[^'\n]*'/g)]
      .map((m) => ({ text: m[0], line: source.slice(0, m.index).split('\n').length }))
      .filter(({ text }) => /\b(FROM|UPDATE|INTO)\s+(records|user_seq|identities|feedback_reports)\b/.test(text))
      .filter(({ text }) => !/^'SELECT 1 FROM \w+ LIMIT 1'$/.test(text))
      .filter(({ line }) => !inAdmin(line));
    expect(literals.length).toBeGreaterThanOrEqual(8);
    for (const { text, line } of literals) expect(text, `line ${line}`).toMatch(/\buserId\b/);
  });
});
