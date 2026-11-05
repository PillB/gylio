import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '..', '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
// wrangler.jsonc allows full-line comments; none of the values contain "//" at the start of a line.
const config = JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, '')) as Record<string, any>;

describe('wrangler.jsonc', () => {
  it('keeps no public copy of the Worker: workers.dev and preview URLs are off', () => {
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
  });

  it('serves one origin: only the apex is routed, as a custom domain', () => {
    expect(config.routes).toEqual([{ pattern: 'gylio.app', custom_domain: true }]);
    expect(config.vars.CORS_ORIGINS).toBe('https://gylio.app');
    expect(config.vars.CLERK_AUTHORIZED_PARTIES).toBe('https://gylio.app');
  });

  it('runs the Worker first only for /api/*, and everything else comes from the built site', () => {
    expect(config.assets.run_worker_first).toEqual(['/api/*']);
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.assets.directory).toBe('../dist');
    // Browser-history routing needs index.html for deep links.
    expect(config.assets.not_found_handling).toBe('single-page-application');
  });

  it('turns logs on and schedules no cron the code does not run', () => {
    expect(config.observability.enabled).toBe(true);
    expect(config.triggers).toBeUndefined();
    expect(read('src/index.ts')).not.toMatch(/scheduled\s*[:(]/);
  });

  it('holds public values only, and trusts tokens from the live Clerk instance on our own domain only', () => {
    expect(Object.keys(config.vars).sort()).toEqual(['CLERK_AUTHORIZED_PARTIES', 'CLERK_ISSUER', 'CORS_ORIGINS', 'MAX_RECORDS_PER_USER']);
    expect(config.vars.CLERK_ISSUER).toBe('https://clerk.gylio.app');
    const text = read('wrangler.jsonc');
    expect(text).not.toMatch(/sk_(live|test)_|pk_(live|test)_|-----BEGIN|@gmail\.|@outlook\./i);
  });

  it('binds the database named gylio and keeps a placeholder id that a script can refuse to deploy', () => {
    expect(config.d1_databases).toHaveLength(1);
    expect(config.d1_databases[0]).toMatchObject({ binding: 'DB', database_name: 'gylio' });
    expect(config.d1_databases[0].database_id).toMatch(/^TODO_/);
  });
});

describe('ignored files', () => {
  it('keeps local variables and wrangler state out of git', () => {
    const ignore = read('.gitignore').split('\n');
    expect(ignore).toEqual(expect.arrayContaining(['.dev.vars*', '.env*', '.wrangler']));
  });
});
