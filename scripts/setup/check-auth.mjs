#!/usr/bin/env node
/**
 * check-auth.mjs — which sign-in methods does the Clerk instance behind this
 * app actually offer? Reads the publishable key (public) from .env.local or
 * VITE_CLERK_PUBLISHABLE_KEY and asks Clerk's public environment endpoint.
 *
 *   node scripts/setup/check-auth.mjs            # report
 *   node scripts/setup/check-auth.mjs --require google,microsoft   # exit 1 if missing
 *
 * Prints no secrets; safe to paste the output anywhere.
 */
import fs from 'node:fs';

export function frontendApiFromKey(publishableKey) {
  const match = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(String(publishableKey || '').trim());
  if (!match) throw new Error('Not a Clerk publishable key (expected pk_test_… or pk_live_…)');
  const host = Buffer.from(match[2], 'base64').toString('utf8').replace(/\$$/, '');
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error('Publishable key does not decode to a host name');
  return { host, mode: match[1] === 'live' ? 'production' : 'development' };
}

export function enabledProviders(environment) {
  const social = environment?.user_settings?.social || {};
  return Object.entries(social)
    .filter(([, value]) => value?.enabled)
    .map(([key]) => key.replace(/^oauth_/, ''))
    .sort();
}

function readKey() {
  if (process.env.VITE_CLERK_PUBLISHABLE_KEY) return process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const file = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  return (/^VITE_CLERK_PUBLISHABLE_KEY=(\S+)/m.exec(file) || [])[1];
}

async function main() {
  const required = (process.argv.find((a, i) => process.argv[i - 1] === '--require') || '').split(',').filter(Boolean);
  const { host, mode } = frontendApiFromKey(readKey());
  const response = await fetch(`https://${host}/v1/environment`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Clerk answered ${response.status} for ${host}`);
  const providers = enabledProviders(await response.json());
  console.log(`Clerk ${mode} instance ${host}`);
  console.log(`Social sign-in enabled: ${providers.join(', ') || 'none'}`);
  const missing = required.filter((p) => !providers.includes(p));
  if (missing.length) {
    console.error(`Missing: ${missing.join(', ')}. Enable them in the Clerk dashboard → Configure → SSO connections.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
