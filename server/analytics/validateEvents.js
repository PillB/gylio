/**
 * validateEvents.js — accept product-analytics events from the app, safely.
 *
 * Events describe what happened ("paywall_viewed"), never who: there is no
 * user id, email or free text. Names and property keys must be identifiers;
 * property values are short strings, finite numbers or booleans. Anything
 * else is dropped rather than stored.
 */

'use strict';

const MAX_EVENTS = 50;
const MAX_PROPS = 20;
const MAX_STRING = 100;
const NAME = /^[a-z][a-z0-9_]{1,63}$/;
const PROP_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const SESSION = /^[A-Za-z0-9_-]{1,64}$/;

function cleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.slice(0, MAX_STRING);
  return undefined;
}

function cleanProps(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const props = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(props).length >= MAX_PROPS) break;
    const cleaned = PROP_KEY.test(key) ? cleanValue(value) : undefined;
    if (cleaned !== undefined) props[key] = cleaned;
  }
  return props;
}

/** Returns { events } ready to store (invalid entries skipped) or { error }. */
function validateEvents(body, { now, signedIn }) {
  const raw = body && Array.isArray(body.events) ? body.events : null;
  if (!raw) return { error: 'events must be an array' };
  if (raw.length > MAX_EVENTS) return { error: `at most ${MAX_EVENTS} events per request` };
  const receivedAt = now.toISOString();
  const events = raw
    .filter((e) => e && NAME.test(e.name) && SESSION.test(String(e.sessionId || '')))
    .map((e) => ({
      name: e.name,
      sessionId: String(e.sessionId),
      signedIn: Boolean(signedIn),
      props: cleanProps(e.props),
      // The server's clock decides the day an event counts for; a client clock can be wrong.
      receivedAt,
    }));
  return { events };
}

module.exports = { MAX_EVENTS, validateEvents };
