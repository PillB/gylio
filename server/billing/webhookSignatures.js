/**
 * webhookSignatures.js — verify that a webhook really came from the provider.
 *
 * Both schemes are HMAC-SHA256 over a provider-defined string, compared in
 * constant time. The raw request body must be used byte for byte: re-serialising
 * parsed JSON changes whitespace and key order and breaks the signature.
 *
 * Paddle:       https://developer.paddle.com/webhooks/signature-verification
 * Mercado Pago: https://www.mercadopago.com.pe/developers/es/docs/your-integrations/notifications/webhooks
 */

'use strict';

const crypto = require('node:crypto');

/** Replay window. Duplicate deliveries inside it are caught by event-id idempotency. */
const MAX_SKEW_SECONDS = 300;

const hmacHex = (secret, message) =>
  crypto.createHmac('sha256', secret).update(message).digest('hex');

function safeEqualHex(expectedHex, candidate) {
  if (typeof candidate !== 'string' || !/^[0-9a-f]+$/i.test(candidate)) return false;
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(candidate.toLowerCase(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Parse "k=v;k=v" (Paddle) or "k=v,k=v" (Mercado Pago); repeated keys become arrays. */
function parseSignatureHeader(header, separator) {
  const parts = {};
  for (const piece of String(header || '').split(separator)) {
    const index = piece.indexOf('=');
    if (index <= 0) continue;
    const key = piece.slice(0, index).trim();
    const value = piece.slice(index + 1).trim();
    (parts[key] ||= []).push(value);
  }
  return parts;
}

function isFreshTimestamp(tsSeconds, nowMs) {
  const ts = Number(tsSeconds);
  return Number.isFinite(ts) && Math.abs(nowMs / 1000 - ts) <= MAX_SKEW_SECONDS;
}

/**
 * Paddle-Signature: ts=<unix seconds>;h1=<hex>[;h1=<hex> during secret rotation]
 * Signed string: `${ts}:${rawBody}`.
 */
function verifyPaddleSignature({ rawBody, header, secret, nowMs = Date.now() }) {
  if (!secret || !Buffer.isBuffer(rawBody)) return false;
  const parts = parseSignatureHeader(header, ';');
  const ts = parts.ts?.[0];
  if (!ts || !isFreshTimestamp(ts, nowMs)) return false;
  const expected = hmacHex(secret, `${ts}:${rawBody.toString('utf8')}`);
  return (parts.h1 || []).some((candidate) => safeEqualHex(expected, candidate));
}

/**
 * x-signature: ts=<unix seconds or ms>,v1=<hex>
 * Signed string: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, where data.id
 * comes from the notification URL's query string and is lower-cased when it is
 * alphanumeric. Parts whose value is missing are left out of the template.
 */
function mercadoPagoManifest({ dataId, requestId, ts }) {
  let manifest = '';
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

function verifyMercadoPagoSignature({ header, requestId, dataId, secret, nowMs = Date.now() }) {
  if (!secret) return false;
  const parts = parseSignatureHeader(header, ',');
  const ts = parts.ts?.[0];
  if (!ts) return false;
  // Mercado Pago has sent both seconds and milliseconds here; accept either.
  const seconds = ts.length > 11 ? Math.floor(Number(ts) / 1000) : Number(ts);
  if (!isFreshTimestamp(seconds, nowMs)) return false;
  const expected = hmacHex(secret, mercadoPagoManifest({ dataId, requestId, ts }));
  return (parts.v1 || []).some((candidate) => safeEqualHex(expected, candidate));
}

module.exports = {
  MAX_SKEW_SECONDS,
  mercadoPagoManifest,
  parseSignatureHeader,
  verifyMercadoPagoSignature,
  verifyPaddleSignature,
};
