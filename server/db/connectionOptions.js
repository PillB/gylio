'use strict';

/**
 * MongoDB connection-pool settings, in one place and overridable by env.
 *
 * Why these numbers (reasoned defaults, not load-tested):
 * - maxPoolSize 20: the driver default of 100 lets one busy instance exhaust a
 *   small cluster's connection cap (Atlas M0 allows 500 across all instances).
 *   Requests here are short single-document operations, so 20 concurrent
 *   operations per instance is generous.
 * - minPoolSize 2: keeps a couple of warm sockets so the first request after a
 *   quiet period does not pay connection setup.
 * - waitQueueTimeoutMS 10s: when the pool is exhausted a request fails fast
 *   with a 503 instead of hanging until the client gives up.
 * - socketTimeoutMS 45s, connect/serverSelection 10s: a half-dead socket is
 *   dropped rather than holding a pool slot forever.
 * - maxIdleTimeMS 60s: idle sockets above minPoolSize are closed, which also
 *   avoids reusing one a load balancer already cut.
 * - retryWrites: a write interrupted by a failover is retried once by the
 *   driver; combined with Idempotency-Key at the API this is safe end to end.
 * - bufferCommands false: with Mongoose's default, a query issued while the
 *   connection is down queues silently for 10 s. The repository already
 *   answers 503 DATABASE_UNAVAILABLE; buffering would hide that.
 */
const DEFAULTS = {
  maxPoolSize: 20,
  minPoolSize: 2,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
};

const ENV_NAMES = {
  maxPoolSize: 'MONGODB_MAX_POOL_SIZE',
  minPoolSize: 'MONGODB_MIN_POOL_SIZE',
  maxIdleTimeMS: 'MONGODB_MAX_IDLE_MS',
  waitQueueTimeoutMS: 'MONGODB_WAIT_QUEUE_TIMEOUT_MS',
  serverSelectionTimeoutMS: 'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
  connectTimeoutMS: 'MONGODB_CONNECT_TIMEOUT_MS',
  socketTimeoutMS: 'MONGODB_SOCKET_TIMEOUT_MS',
};

const readPositiveInt = (raw, fallback) => {
  if (raw === undefined || String(raw).trim() === '') return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

function mongoConnectionOptions(env = process.env) {
  const options = {};
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    options[key] = readPositiveInt(env[ENV_NAMES[key]], fallback);
  }
  // A minimum above the maximum is a configuration slip; the maximum wins.
  options.minPoolSize = Math.min(options.minPoolSize, options.maxPoolSize);
  return { ...options, retryWrites: true, writeConcern: { w: 'majority' }, bufferCommands: false };
}

module.exports = { mongoConnectionOptions, DEFAULTS };
