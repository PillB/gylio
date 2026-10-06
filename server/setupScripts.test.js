/**
 * The operator scripts can't reach Google, Atlas or Azure from CI, so these
 * tests run them in DRY_RUN mode and check the exact commands they would run.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const runScript = (name, env) => spawnSync('bash', [path.join(root, 'scripts/setup', name)], {
  cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH, DRY_RUN: '1', ...env },
});

const cloudRunEnv = {
  GCP_PROJECT: 'gylio-prod', BILLING_ACCOUNT: '0000-1111', APP_ORIGIN: 'https://app.gylio.app', API_ORIGIN: 'https://api.gylio.app',
};

describe('cloudrun.sh', () => {
  it('deploys with every required secret mapped and the app origin as the only CORS origin', () => {
    const { status, stdout } = runScript('cloudrun.sh', cloudRunEnv);
    expect(status).toBe(0);
    const deploy = stdout.split('\n').find((line) => line.startsWith('DRY: gcloud run deploy'));
    expect(deploy).toContain('southamerica-west1');
    for (const name of ['MONGODB_URI', 'CLERK_SECRET_KEY', 'ADMIN_USER_IDS', 'PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET']) {
      expect(deploy).toContain(`${name}=${name}:latest`);
    }
    expect(deploy).toContain('CORS_ORIGINS=https://app.gylio.app');
    expect(deploy).toContain('PADDLE_ENV=sandbox');
  });

  it('adds a budget alert at 50, 90 and 100 percent', () => {
    const { stdout } = runScript('cloudrun.sh', cloudRunEnv);
    const budget = stdout.split('\n').find((line) => line.includes('billing budgets create'));
    expect(budget).toMatch(/20USD/);
    expect(budget).toMatch(/percent=0.5.*percent=0.9.*percent=1.0/);
  });

  it('stops with a clear message when a required setting is missing', () => {
    const { status, stderr } = runScript('cloudrun.sh', { ...cloudRunEnv, GCP_PROJECT: '' });
    expect(status).toBe(2);
    expect(stderr).toMatch(/Set GCP_PROJECT first/);
  });
});

describe('atlas.sh and entra-app.sh', () => {
  it('creates a free M0 cluster in São Paulo and a readWrite user for the gylio database', () => {
    const { status, stdout } = runScript('atlas.sh', { ATLAS_PROJECT_ID: 'p1', GCP_PROJECT: 'g1' });
    expect(status).toBe(0);
    expect(stdout).toMatch(/clusters create gylio --provider AWS --region SA_EAST_1 --tier M0/);
    expect(stdout).toMatch(/dbusers create --username gylio_api .* --role readWrite@gylio/);
    expect(stdout).not.toMatch(/mongodb\+srv:\/\/gylio_api:/); // the connection string is never printed
  });

  it('registers a Microsoft app for personal and work accounts with the Clerk redirect', () => {
    const redirect = 'https://clerk.gylio.app/v1/oauth_callback';
    const { status, stdout } = runScript('entra-app.sh', { CLERK_MICROSOFT_REDIRECT_URI: redirect });
    expect(status).toBe(0);
    expect(stdout).toContain('--sign-in-audience AzureADandPersonalMicrosoftAccount');
    expect(stdout).toContain(redirect);
  });
});

describe('check-auth.mjs', () => {
  it('decodes the Clerk host from a publishable key and lists enabled providers', async () => {
    const { frontendApiFromKey, enabledProviders } = await import('../scripts/setup/check-auth.mjs');
    const key = `pk_test_${Buffer.from('happy-cat-12.clerk.accounts.dev$').toString('base64')}`;
    expect(frontendApiFromKey(key)).toEqual({ host: 'happy-cat-12.clerk.accounts.dev', mode: 'development' });
    expect(() => frontendApiFromKey('not-a-clerk-key')).toThrow(/publishable key/);
    expect(enabledProviders({ user_settings: { social: {
      oauth_google: { enabled: true }, oauth_microsoft: { enabled: true }, oauth_github: { enabled: false },
    } } })).toEqual(['google', 'microsoft']);
  });
});

describe('re-running the scripts is safe', () => {
  it('atlas.sh keeps the database password unless rotation is asked for', () => {
    const plain = runScript('atlas.sh', { ATLAS_PROJECT_ID: 'p1', GCP_PROJECT: 'g1' });
    expect(plain.stdout).not.toMatch(/dbusers delete/);
    const rotate = runScript('atlas.sh', { ATLAS_PROJECT_ID: 'p1', GCP_PROJECT: 'g1', ROTATE_DB_PASSWORD: '1' });
    expect(rotate.stdout).toMatch(/dbusers update gylio_api/);
    expect(rotate.stdout).toMatch(/run scripts\/setup\/cloudrun.sh again/);
  });

  it('entra-app.sh adds a secret with --append instead of replacing the one Clerk uses', () => {
    const { stdout } = runScript('entra-app.sh', { CLERK_MICROSOFT_REDIRECT_URI: 'https://clerk.gylio.app/v1/oauth_callback' });
    expect(stdout).toMatch(/credential reset .*--append/);
  });

  it('keeps server/.env and the local database out of the Cloud Run source upload', () => {
    const ignore = require('node:fs').readFileSync(path.join(root, 'server/.gcloudignore'), 'utf8').split('\n');
    for (const pattern of ['.env', '*.db', 'node_modules/']) expect(ignore).toContain(pattern);
  });
});

