import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES, readJson } from '../src/readJson';

const request = (body: string, headers: Record<string, string> = {}) =>
  new Request('https://api.test/api/tasks/t1', { method: 'PUT', body, headers });

describe('readJson', () => {
  it('returns a JSON object', async () => {
    expect(await readJson(request('{"title":"Call mom","estimateMin":10}'))).toEqual({ title: 'Call mom', estimateMin: 10 });
  });

  it('refuses anything that is not a JSON object', async () => {
    for (const body of ['[1,2]', '"text"', '12', 'null', '{"title":', '']) {
      expect(await readJson(request(body)), body).toBeNull();
    }
  });

  it('allows a body of exactly the limit and refuses one byte more', async () => {
    const wrap = (bytes: number) => `{"note":"${'a'.repeat(bytes - 11)}"}`;
    expect(new TextEncoder().encode(wrap(MAX_BODY_BYTES)).length).toBe(MAX_BODY_BYTES);
    expect(await readJson(request(wrap(MAX_BODY_BYTES)))).not.toBeNull();
    expect(await readJson(request(wrap(MAX_BODY_BYTES + 1)))).toBeNull();
  });

  it('counts bytes, not characters: 30,000 three-byte characters are over a 64 KB limit', async () => {
    const body = JSON.stringify({ note: '語'.repeat(30_000) });
    expect(body.length).toBeLessThan(MAX_BODY_BYTES);
    expect(new TextEncoder().encode(body).length).toBeGreaterThan(MAX_BODY_BYTES);
    expect(await readJson(request(body))).toBeNull();
  });

  it('keeps text in other alphabets intact when it is within the limit', async () => {
    expect(await readJson(request(JSON.stringify({ title: 'Llamar a mamá 語' })))).toEqual({ title: 'Llamar a mamá 語' });
  });

  it('refuses a body that declares itself over the limit without reading it', async () => {
    const req = request('{"title":"small"}', { 'content-length': String(MAX_BODY_BYTES + 1) });
    expect(await readJson(req)).toBeNull();
    expect(req.bodyUsed).toBe(false);
  });

  it('reads a body that declares exactly the limit', async () => {
    expect(await readJson(request('{"title":"small"}', { 'content-length': String(MAX_BODY_BYTES) }))).toEqual({ title: 'small' });
  });

  it('refuses a declared size that is not a number', async () => {
    const req = request('{"title":"small"}', { 'content-length': 'lots' });
    expect(await readJson(req)).toBeNull();
    expect(req.bodyUsed).toBe(false);
  });

  it('reads a body that declares no size', async () => {
    const req = new Request('https://api.test/api/tasks/t1', { method: 'PUT', body: '{"title":"x"}' });
    req.headers.delete('content-length');
    expect(await readJson(req)).toEqual({ title: 'x' });
  });
});
