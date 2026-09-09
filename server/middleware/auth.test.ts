import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modulePath = require.resolve('./auth.js');

const ORIGINAL_ENV = { ...process.env };

const loadAuth = () => {
  delete require.cache[modulePath];
  return require('./auth.js') as {
    parseAuthHeader: (value?: string) => string | null;
    getAuthConfig: () => {
      issuer: string;
      jwksUri: string;
      authorizedParties: string[];
    };
  };
};

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete require.cache[modulePath];
});

describe('Clerk auth middleware configuration', () => {
  it('does not crash the server merely by importing the middleware when Clerk is absent', () => {
    delete process.env.CLERK_ISSUER;
    delete process.env.CLERK_JWKS_URL;

    expect(() => loadAuth()).not.toThrow();
    const auth = loadAuth();
    expect(() => auth.getAuthConfig()).toThrowError(/not configured/i);
  });

  it('derives the standard JWKS endpoint from the configured issuer', () => {
    process.env.CLERK_ISSUER = 'https://example.clerk.accounts.dev/';
    delete process.env.CLERK_JWKS_URL;

    const auth = loadAuth();
    expect(auth.getAuthConfig()).toEqual({
      issuer: 'https://example.clerk.accounts.dev',
      jwksUri: 'https://example.clerk.accounts.dev/.well-known/jwks.json',
      authorizedParties: [],
    });
  });

  it('parses exactly one Bearer token and rejects malformed authorization headers', () => {
    const auth = loadAuth();

    expect(auth.parseAuthHeader('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(auth.parseAuthHeader('bearer token')).toBe('token');
    expect(auth.parseAuthHeader('Basic token')).toBeNull();
    expect(auth.parseAuthHeader('Bearer')).toBeNull();
    expect(auth.parseAuthHeader('Bearer one two')).toBeNull();
  });
});
