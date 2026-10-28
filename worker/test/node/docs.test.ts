import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = path.join(import.meta.dirname, '..', '..', '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.git', 'dist', '.wrangler'].includes(name)) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(md|sh|ya?ml|jsonc?|toml)$/.test(name) ? [full] : [];
  });

describe('credentials stay out of instructions', () => {
  it('never tells anyone to run wrangler login, which leaves a lasting credential on the Mac', () => {
    const files = [...walk(path.join(repo, 'docs')), ...walk(path.join(repo, 'worker')), path.join(repo, 'README.md'), ...walk(path.join(repo, '.github'))];
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((text, i) => ({ file: path.relative(repo, file), line: i + 1, text }))
        .filter(({ text }) => /wrangler\s+login/i.test(text) && !/\b(never|do not|don't)\b/i.test(text)),
    );
    expect(offenders).toEqual([]);
  });
});

describe('the manual and the scripts tell the same story about sign-up', () => {
  const manual = readFileSync(path.join(repo, 'docs', 'CLOUDFLARE_GO_LIVE_MANUAL.md'), 'utf8');
  const lib = readFileSync(path.join(repo, 'worker', 'scripts', 'lib.sh'), 'utf8');

  it('names the holder file the scripts read and its permissions', () => {
    const defaultFile = /GYLIO_HOLDER_FILE:-\$HOME\/(\S+?)\}/.exec(lib)?.[1];
    expect(defaultFile).toBeTruthy();
    expect(manual).toContain(`~/${defaultFile}`);
    expect(manual).toContain('chmod 700');
    expect(manual).toContain('chmod 600');
  });

  it('explains the closed answer and the privacy page that opens sign-up', () => {
    expect(manual).toContain('SIGNUP_CLOSED');
    expect(manual).toContain('privacy.html');
    expect(manual).toContain('signupOpen');
  });

  it('tells the owner where the Clerk publishable key goes, and that the secret key is never needed', () => {
    const keyFile = /clerk_publishable_key/.exec(lib);
    expect(keyFile).toBeTruthy();
    expect(manual).toContain('~/.config/gylio/clerk_publishable_key');
    expect(manual).toContain('VITE_CLERK_PUBLISHABLE_KEY');
    expect(manual).toContain('pk_live_');
    expect(manual).toMatch(/Secret key.*sk_live_/);
  });

  it('lists the GitHub ruleset that code cannot create', () => {
    expect(manual).toMatch(/Rulesets/);
    expect(manual).toMatch(/force pushes/i);
    expect(manual).toMatch(/Code Owners/);
  });
});

describe('the manual lists every address the app can call on the Worker', () => {
  const manual = readFileSync(path.join(repo, 'docs', 'CLOUDFLARE_GO_LIVE_MANUAL.md'), 'utf8');
  const section6 = manual.slice(manual.indexOf('## 6.'), manual.indexOf('## If something goes wrong'));
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
    });
  // The first part of every /api/ address the app names, e.g. /api/sync, /api/billing.
  const named = [...new Set(
    sources(path.join(repo, 'src')).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/['"`]\/api\/([a-z][\w-]*)/g)].map((match) => `/api/${match[1]}`),
    ),
  )].sort();

  it('finds the addresses in the app', () => {
    expect(named).toEqual(expect.arrayContaining(['/api/sync', '/api/billing', '/api/feedback']));
  });

  it('names each of them in section 6, as called or as switched off', () => {
    expect(section6.length).toBeGreaterThan(0);
    expect(named.filter((prefix) => !section6.includes(prefix))).toEqual([]);
  });

  it('no longer claims the app never calls the Worker', () => {
    expect(section6).not.toMatch(/never call the Worker/);
    expect(section6).toMatch(/Clerk's own host/);
  });
});
