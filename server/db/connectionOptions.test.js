import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const { mongoConnectionOptions, DEFAULTS } = createRequire(import.meta.url)('./connectionOptions');

describe('mongoConnectionOptions', () => {
  it('bounds the pool and fails fast by default', () => {
    const o = mongoConnectionOptions({});
    expect(o).toMatchObject({ maxPoolSize: 20, minPoolSize: 2, waitQueueTimeoutMS: 10_000, retryWrites: true, bufferCommands: false });
    expect(o.writeConcern).toEqual({ w: 'majority' });
  });

  it('reads overrides from the environment', () => {
    expect(mongoConnectionOptions({ MONGODB_MAX_POOL_SIZE: '50', MONGODB_SOCKET_TIMEOUT_MS: '5000' })).toMatchObject({ maxPoolSize: 50, socketTimeoutMS: 5000 });
  });

  it.each(['abc', '0', '-3', '1.5', ''])('ignores the unusable value %j and keeps the default', (bad) => {
    expect(mongoConnectionOptions({ MONGODB_MAX_POOL_SIZE: bad }).maxPoolSize).toBe(DEFAULTS.maxPoolSize);
  });

  it('never lets the minimum exceed the maximum', () => {
    expect(mongoConnectionOptions({ MONGODB_MAX_POOL_SIZE: '1', MONGODB_MIN_POOL_SIZE: '5' }).minPoolSize).toBe(1);
  });
});
