import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  mercadoPagoManifest,
  verifyMercadoPagoSignature,
  verifyPaddleSignature,
} = require('./webhookSignatures');

// Expected digests were computed independently with `openssl dgst -sha256 -hmac`,
// not with the module under test.
const TS = 1790640000;
const NOW_MS = TS * 1000;

describe('verifyPaddleSignature', () => {
  const rawBody = Buffer.from('{"event_id":"evt_01","event_type":"subscription.created"}');
  const h1 = 'd3b7f1ba060224d4f754abe2e9ed8758497e67f234a7b0ce58bad160559cb668';
  const secret = 'pdl_ntfset_secret';

  it('accepts the genuine signature', () => {
    expect(verifyPaddleSignature({ rawBody, header: `ts=${TS};h1=${h1}`, secret, nowMs: NOW_MS })).toBe(true);
  });

  it('accepts when one of two rotation signatures matches', () => {
    const header = `ts=${TS};h1=${'0'.repeat(64)};h1=${h1}`;
    expect(verifyPaddleSignature({ rawBody, header, secret, nowMs: NOW_MS })).toBe(true);
  });

  it('rejects a body changed by a single byte', () => {
    const tampered = Buffer.from(rawBody.toString().replace('created', 'Created'));
    expect(verifyPaddleSignature({ rawBody: tampered, header: `ts=${TS};h1=${h1}`, secret, nowMs: NOW_MS })).toBe(false);
  });

  it('rejects the wrong secret, a stale timestamp, and a missing header', () => {
    expect(verifyPaddleSignature({ rawBody, header: `ts=${TS};h1=${h1}`, secret: 'other', nowMs: NOW_MS })).toBe(false);
    expect(verifyPaddleSignature({ rawBody, header: `ts=${TS};h1=${h1}`, secret, nowMs: NOW_MS + 301_000 })).toBe(false);
    expect(verifyPaddleSignature({ rawBody, header: undefined, secret, nowMs: NOW_MS })).toBe(false);
  });

  it('rejects when the body was parsed instead of kept raw', () => {
    const parsed = JSON.parse(rawBody.toString());
    expect(verifyPaddleSignature({ rawBody: parsed, header: `ts=${TS};h1=${h1}`, secret, nowMs: NOW_MS })).toBe(false);
  });
});

describe('Mercado Pago signatures', () => {
  const v1 = '2a74e8c30b5de4728bc7c55a4ecc86b26b6527f388ffb31cbe5ae3e236c7f3ba';

  it('builds the documented manifest and lower-cases alphanumeric ids', () => {
    expect(mercadoPagoManifest({ dataId: 'ABC123', requestId: 'r', ts: '1' })).toBe('id:abc123;request-id:r;ts:1;');
    expect(mercadoPagoManifest({ dataId: null, requestId: null, ts: '1' })).toBe('ts:1;');
  });

  it('accepts the genuine signature and rejects a different payment id', () => {
    const base = { header: `ts=${TS},v1=${v1}`, requestId: 'req-abc', secret: 'mp_secret', nowMs: NOW_MS };
    expect(verifyMercadoPagoSignature({ ...base, dataId: '123456789' })).toBe(true);
    expect(verifyMercadoPagoSignature({ ...base, dataId: '123456780' })).toBe(false);
  });

  it('rejects a replay outside the five-minute window', () => {
    const args = { header: `ts=${TS},v1=${v1}`, requestId: 'req-abc', dataId: '123456789', secret: 'mp_secret' };
    expect(verifyMercadoPagoSignature({ ...args, nowMs: NOW_MS + 10 * 60_000 })).toBe(false);
  });
});
