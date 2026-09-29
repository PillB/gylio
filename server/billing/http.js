/**
 * http.js — outbound JSON calls with a hard timeout.
 *
 * Without a timeout a slow provider becomes a hung request and the UI shows
 * nothing at all; six seconds is well above normal provider latency.
 */

'use strict';

const TIMEOUT_MS = 6000;

class UpstreamError extends Error {
  constructor(service, status, message) {
    super(message || `${service} responded ${status}`);
    this.service = service;
    this.upstreamStatus = status;
    // Read by errorHandler: a provider failure is a 502, never a generic 500.
    this.status = 502;
    this.code = 'UPSTREAM_ERROR';
  }
}

async function fetchJson(service, url, { method = 'GET', headers = {}, body, fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(service, 0, `${service} unreachable: ${error.name}`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new UpstreamError(service, response.status);
  return payload;
}

module.exports = { TIMEOUT_MS, UpstreamError, fetchJson };
