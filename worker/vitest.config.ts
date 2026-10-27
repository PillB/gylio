import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { exportJWK, generateKeyPair } from 'jose';
import { defineConfig } from 'vitest/config';

// A throwaway RSA key per test run: the Worker verifies tokens against the public half through
// CLERK_JWKS_JSON, so no network or real Clerk account is needed.
const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const publicJwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
const privateJwk = { ...(await exportJWK(privateKey)), kid: 'test-key', alg: 'RS256' };
const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          TEST_PRIVATE_JWK: JSON.stringify(privateJwk),
          CLERK_JWKS_JSON: JSON.stringify({ keys: [publicJwk] }),
          CLERK_ISSUER: 'https://clerk.test',
          CLERK_AUTHORIZED_PARTIES: 'https://app.test',
          CORS_ORIGINS: 'https://app.test',
          HOLDER_NAME: 'Titular de prueba',
          MAX_RECORDS_PER_USER: '5',
          // Flush the usage meter after every request and never cache it, so tests can read exact costs.
          USAGE_FLUSH_EVERY: '1',
          USAGE_CACHE_MS: '0',
        },
      },
    }),
  ],
  test: { setupFiles: ['./test/setup.ts'], include: ['test/**/*.test.ts'], exclude: ['test/node/**'] },
});
