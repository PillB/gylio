import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// The operator scripts run against a fake wrangler and a fake token-check API, with and without a real
// pseudo-terminal (`script`), so the hidden prompt and the [Y/n] flows are exercised for real.
// Minimum count: a test file that silently loses tests must fail, not shrink.
const MIN_TESTS = 40;
let ran = 0;
afterEach(() => {
  ran += 1;
});
afterAll(() => {
  expect(ran).toBeGreaterThanOrEqual(MIN_TESTS);
});

const workerDir = path.join(import.meta.dirname, '..', '..');
const SECRET = 'cfut_SUPER_SECRET_TOKEN_0123456789';
const ACCOUNT = 'abcd1234abcd1234abcd1234abcd1234';
const DB_ID = '11111111-2222-3333-4444-555555555555';
// A Clerk publishable key is "pk_live_" plus base64 of the sign-in host and a "$".
const clerkKey = (host: string, kind = 'live') => `pk_${kind}_${Buffer.from(`${host}$`).toString('base64')}`;
const LIVE_KEY = clerkKey('clerk.gylio.app');

type ApiAnswer = { status: number; body: string };
const ACTIVE: ApiAnswer = { status: 200, body: JSON.stringify({ success: true, errors: [], messages: [], result: { id: 'x', status: 'active' } }) };
const REFUSED: ApiAnswer = { status: 403, body: JSON.stringify({ success: false, errors: [{ code: 1000, message: 'Invalid API Token' }], messages: [], result: null }) };

let api: http.Server;
let apiBase = '';
let answers: ApiAnswer[] = [];
let seenAuth: string[] = [];
let seenPaths: string[] = [];

beforeAll(async () => {
  api = http.createServer((req, res) => {
    seenAuth.push(String(req.headers.authorization));
    seenPaths.push(String(req.url));
    const answer = answers.length > 1 ? answers.shift()! : answers[0] ?? ACTIVE;
    res.writeHead(answer.status, { 'content-type': 'application/json' });
    res.end(answer.body);
  });
  await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', resolve));
  apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
});
afterAll(() => api.close());

let root = '';
const paths = () => ({
  log: path.join(root, 'fake.log'),
  d1: path.join(root, 'fake-d1.json'),
  wrangler: path.join(root, 'fake-wrangler.sh'),
  build: path.join(root, 'fake-build.sh'),
  install: path.join(root, 'fake-install.sh'),
});

const FAKE_WRANGLER = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$1 $2" in
  "d1 list") cat "$FAKE_D1" ;;
  "d1 create") echo '[{"name":"gylio","uuid":"${DB_ID}"}]' > "$FAKE_D1"; echo "created" ;;
  "d1 export") for a in "$@"; do case "$a" in --output=*) echo "-- dump" > "\${a#--output=}" ;; esac; done ;;
  *) echo "ok $1" ;;
esac
if [ "\${FAKE_FAIL:-}" = "$1" ]; then exit 1; fi
`;
const FAKE_BUILD = `#!/usr/bin/env bash
echo "build base=$VITE_BASE_PATH" >> "$FAKE_LOG"
echo "api=[$VITE_API_BASE_URL] billing=[$VITE_BILLING_ENABLED] clerk=[$VITE_CLERK_PUBLISHABLE_KEY]" > "$FAKE_LOG.env"
if [ "\${FAKE_BUILD_FAIL:-}" = "1" ]; then exit 1; fi
mkdir -p dist/assets
if [ "\${FAKE_BUILD_BASE:-}" = "old" ]; then
  echo '<script src="/gylio/assets/app.js"></script>' > dist/index.html
else
  echo '<script src="/assets/app.js"></script>' > dist/index.html
fi
case "\${FAKE_PRIVACY:-}" in
  with) echo '<p>Responsable: Titular de prueba</p>' > dist/privacy.html ;;
  without) echo '<p>Responsable: otra persona</p>' > dist/privacy.html ;;
esac
`;
const FAKE_INSTALL = `#!/usr/bin/env bash
echo "install in $(basename "$PWD")" >> "$FAKE_LOG"
`;

const makeRepo = () => {
  root = mkdtempSync(path.join(os.tmpdir(), 'gylio-deploy-'));
  mkdirSync(path.join(root, 'worker', 'scripts'), { recursive: true });
  mkdirSync(path.join(root, 'worker', 'src'), { recursive: true });
  cpSync(path.join(workerDir, 'scripts'), path.join(root, 'worker', 'scripts'), { recursive: true });
  for (const f of ['staticFiles.ts', 'securityHeaders.ts']) cpSync(path.join(workerDir, 'src', f), path.join(root, 'worker', 'src', f));
  cpSync(path.join(workerDir, 'wrangler.jsonc'), path.join(root, 'worker', 'wrangler.jsonc'));
  writeFileSync(path.join(root, 'package.json'), '{"name":"fake-root"}\n');
  const p = paths();
  writeFileSync(p.wrangler, FAKE_WRANGLER);
  writeFileSync(p.build, FAKE_BUILD);
  writeFileSync(p.install, FAKE_INSTALL);
  for (const f of [p.wrangler, p.build, p.install]) chmodSync(f, 0o755);
  writeFileSync(p.d1, '[]');
  writeFileSync(p.log, '');
};

type RunResult = { code: number; output: string };
type RunOptions = { env?: Record<string, string>; tty?: boolean; input?: string; args?: string[] };

const run = (script: string, { env = {}, tty = false, input = '', args = [] }: RunOptions = {}): Promise<RunResult> =>
  new Promise((resolve) => {
    const p = paths();
    const fullEnv: Record<string, string> = {
      PATH: process.env.PATH ?? '',
      HOME: root,
      FAKE_LOG: p.log,
      FAKE_D1: p.d1,
      GYLIO_WRANGLER: `bash ${p.wrangler}`,
      GYLIO_BUILD_CMD: `bash ${p.build}`,
      GYLIO_INSTALL_CMD: `bash ${p.install}`,
      GYLIO_CF_API_BASE: apiBase,
      GYLIO_NODE_VERSION: 'v24.1.0',
      VITE_CLERK_PUBLISHABLE_KEY: LIVE_KEY,
      ...env,
    };
    const scriptPath = path.join(root, 'worker', 'scripts', script);
    const [cmd, cmdArgs] = tty
      ? ['script', ['-qec', ['bash', scriptPath, ...args].map((a) => `'${a}'`).join(' '), '/dev/null']]
      : ['bash', [scriptPath, ...args]];
    const child = spawn(cmd as string, cmdArgs as string[], { cwd: root, env: fullEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    if (!tty) {
      child.stdin.end();
    } else {
      // A person types after the prompt appears, when echo is already off. Send one line at a time, each
      // after the output goes quiet, so the pseudo-terminal behaves the same way.
      const lines = input.split('\n').slice(0, -1);
      let last = -1;
      const timer = setInterval(() => {
        const quiet = last !== -1 && output.length === last;
        last = output.length;
        if (!quiet) return;
        const next = lines.shift();
        if (next === undefined) {
          clearInterval(timer);
          child.stdin.end();
          return;
        }
        child.stdin.write(`${next}\n`);
        last = -1;
      }, 120);
      child.on('close', () => clearInterval(timer));
    }
    child.on('close', (code) => resolve({ code: code ?? -1, output }));
  });

const wranglerCalls = () => readFileSync(paths().log, 'utf8').split('\n').filter(Boolean);
const creds = { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: SECRET };

const allFileText = (dir: string): string =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== '.git')
    .map((e) => (e.isDirectory() ? allFileText(path.join(dir, e.name)) : readFileSync(path.join(dir, e.name), 'utf8')))
    .join('\n');

beforeEach(() => {
  makeRepo();
  answers = [ACTIVE];
  seenAuth = [];
  seenPaths = [];
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('setup: a full run', () => {
  it('goes in order: token check, database, migrations, build, deploy', async () => {
    const result = await run('setup.sh', { env: creds });
    expect(result.code).toBe(0);
    expect(wranglerCalls()).toEqual([
      'd1 list --json',
      'd1 create gylio',
      'd1 list --json',
      'd1 migrations apply gylio --remote',
      'build base=/',
      'deploy',
    ]);
    expect(seenPaths).toEqual([`/accounts/${ACCOUNT}/tokens/verify`]);
  });

  it('writes the database id into the local config only, and says not to commit it', async () => {
    const result = await run('setup.sh', { env: creds });
    expect(readFileSync(path.join(root, 'worker', 'wrangler.jsonc'), 'utf8')).toContain(`"database_id": "${DB_ID}"`);
    expect(result.output).toContain('LOCAL change: do not commit');
  });

  it('adds _headers and security.txt to the built site and prints the URLs to check and the token reminder', async () => {
    const result = await run('setup.sh', { env: creds });
    expect(existsSync(path.join(root, 'dist', '_headers'))).toBe(true);
    expect(readFileSync(path.join(root, 'dist', '.well-known', 'security.txt'), 'utf8')).toContain('security@gylio.app');
    expect(result.output).toContain('https://gylio.app/api/v1/health');
    expect(result.output).toMatch(/roll .*token/i);
  });

  it('reuses an existing database and does not create another', async () => {
    writeFileSync(paths().d1, JSON.stringify([{ name: 'gylio', uuid: DB_ID }]));
    await run('setup.sh', { env: creds });
    expect(wranglerCalls()).not.toContain('d1 create gylio');
  });

  it('matches the database by exact name: gylio-old and my-gylio are not gylio', async () => {
    writeFileSync(paths().d1, JSON.stringify([{ name: 'gylio-old', uuid: 'aaaaaaaa-0000-0000-0000-000000000000' }, { name: 'my-gylio', uuid: 'bbbbbbbb-0000-0000-0000-000000000000' }]));
    await run('setup.sh', { env: creds });
    expect(wranglerCalls()).toContain('d1 create gylio');
    const config = readFileSync(path.join(root, 'worker', 'wrangler.jsonc'), 'utf8');
    expect(config).not.toContain('aaaaaaaa');
    expect(config).not.toContain('bbbbbbbb');
  });

  it('never puts the token in the output, the log, the config or any file it wrote', async () => {
    const result = await run('setup.sh', { env: creds });
    expect(result.output).not.toContain(SECRET);
    expect(allFileText(root)).not.toContain(SECRET);
  });

  it('sends the token only as an Authorization header to the token-check API', async () => {
    await run('setup.sh', { env: creds });
    expect(seenAuth).toEqual([`Bearer ${SECRET}`]);
  });
});

describe('setup: credentials', () => {
  it('stops with no terminal and nothing in the environment, before any wrangler call', async () => {
    const result = await run('setup.sh');
    expect(result.code).toBe(1);
    expect(result.output).toContain('No terminal');
    expect(result.output).toContain('Nothing was deployed.');
    expect(wranglerCalls()).toEqual([]);
  });

  it('with no terminal, needs both values', async () => {
    const result = await run('setup.sh', { env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('on a terminal, takes the account id visibly and the token hidden, printing only its length', async () => {
    const result = await run('setup.sh', { tty: true, input: `${ACCOUNT}\n${SECRET}\n` });
    expect(result.code).toBe(0);
    expect(result.output).toContain(`Token received (${SECRET.length} characters).`);
    expect(result.output).not.toContain(SECRET);
    expect(seenAuth).toEqual([`Bearer ${SECRET}`]);
  });

  it('on a terminal, offers values already exported and uses them on Enter', async () => {
    const result = await run('setup.sh', { tty: true, env: creds, input: '\n\n' });
    expect(result.code).toBe(0);
    expect(result.output).toContain(`Use the token already in this window (${SECRET.length} characters)? [Y/n]`);
    expect(result.output).not.toContain(SECRET);
    expect(seenAuth).toEqual([`Bearer ${SECRET}`]);
  });

  it('on a terminal, a "n" to the offered token asks for a new one and uses that', async () => {
    const fresh = 'cfut_a_different_token_9999999999';
    const result = await run('setup.sh', { tty: true, env: creds, input: `\nn\n${fresh}\n` });
    expect(result.code).toBe(0);
    expect(seenAuth).toEqual([`Bearer ${fresh}`]);
    expect(result.output).not.toContain(fresh);
  });
});

describe('setup: the token check', () => {
  it('stops with no terminal when Cloudflare refuses the token, before any wrangler call', async () => {
    answers = [REFUSED];
    const result = await run('setup.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain('refused the token');
    expect(wranglerCalls()).toEqual([]);
  });

  it('on a terminal, asks again after a refusal and accepts a good token on the second try', async () => {
    answers = [REFUSED, ACTIVE];
    const good = 'cfut_second_try_token_0000000000';
    const result = await run('setup.sh', { tty: true, input: `${ACCOUNT}\n${SECRET}\n${ACCOUNT}\n${good}\n` });
    expect(result.code).toBe(0);
    expect(seenAuth).toEqual([`Bearer ${SECRET}`, `Bearer ${good}`]);
  });

  it('gives up after three refusals', async () => {
    answers = [REFUSED];
    const input = [1, 2, 3].map((n) => `${ACCOUNT}\ntoken_number_${n}_xxxxxxxxxxxxxxxxxxxxx\n`).join('');
    const result = await run('setup.sh', { tty: true, input });
    expect(result.code).toBe(1);
    expect(seenAuth).toHaveLength(3);
    expect(wranglerCalls()).toEqual([]);
  });

  it('stops when Cloudflare cannot be reached', async () => {
    const result = await run('setup.sh', { env: { ...creds, GYLIO_CF_API_BASE: 'http://127.0.0.1:9' } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('Could not reach Cloudflare');
    expect(wranglerCalls()).toEqual([]);
  });

  it('stops when the answer does not look like Cloudflare’s, instead of trusting it', async () => {
    answers = [{ status: 200, body: '<html>captive portal</html>' }];
    const result = await run('setup.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain("did not come from Cloudflare");
    answers = [{ status: 200, body: JSON.stringify({ success: true, result: { status: 'active' } }) }];
    expect((await run('setup.sh', { env: creds })).code).toBe(1);
  });
});

describe('setup: guards', () => {
  it('stops on a leftover TODO_ placeholder before applying migrations or deploying', async () => {
    const config = path.join(root, 'worker', 'wrangler.jsonc');
    writeFileSync(config, readFileSync(config, 'utf8').replace('"CLERK_ISSUER": ""', '"CLERK_ISSUER": "TODO_FILL_ME"'));
    const result = await run('setup.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain('TODO_FILL_ME');
    expect(wranglerCalls()).not.toContain('deploy');
    expect(wranglerCalls().some((c) => c.startsWith('d1 migrations'))).toBe(false);
  });

  it('stops when the config already names a different database', async () => {
    const config = path.join(root, 'worker', 'wrangler.jsonc');
    writeFileSync(config, readFileSync(config, 'utf8').replace(/TODO_[A-Z0-9_]+/, '99999999-9999-9999-9999-999999999999'));
    const result = await run('setup.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain('different database id');
    expect(wranglerCalls()).not.toContain('deploy');
  });

  it.each([['v20.11.0'], ['v22.17.9'], ['v18.0.0']])('stops on Node %s, before asking for anything', async (version) => {
    const result = await run('setup.sh', { env: { ...creds, GYLIO_NODE_VERSION: version } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('too old');
    expect(seenPaths).toEqual([]);
  });

  it.each([['v22.18.0'], ['v24.1.0']])('accepts Node %s', async (version) => {
    expect((await run('setup.sh', { env: { ...creds, GYLIO_NODE_VERSION: version } })).code).toBe(0);
  });

  it('stops when the site build fails, without deploying', async () => {
    const result = await run('setup.sh', { env: { ...creds, FAKE_BUILD_FAIL: '1' } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('build failed');
    expect(wranglerCalls()).not.toContain('deploy');
  });

  it('refuses a build that still points at the old /gylio/ address', async () => {
    const result = await run('setup.sh', { env: { ...creds, FAKE_BUILD_BASE: 'old' } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('/gylio/');
    expect(wranglerCalls()).not.toContain('deploy');
  });

  it('ends a failed deploy with "Nothing was deployed."', async () => {
    const result = await run('setup.sh', { env: { ...creds, FAKE_FAIL: 'deploy' } });
    expect(result.code).toBe(1);
    expect(result.output.trim().endsWith('Nothing was deployed.')).toBe(true);
  });
});

describe('setup: what the build is given', () => {
  const buildEnv = () => readFileSync(`${paths().log}.env`, 'utf8').trim();

  it('builds with the live Clerk key, the same-origin API, billing off and nothing from stray .env files', async () => {
    const result = await run('setup.sh', { env: { ...creds, VITE_API_BASE_URL: 'https://stale-api.example.test', VITE_BILLING_ENABLED: 'true' } });
    expect(result.code).toBe(0);
    expect(buildEnv()).toBe(`api=[] billing=[false] clerk=[${LIVE_KEY}]`);
  });

  it('stops before asking for the token when there is no Clerk key and nobody to ask', async () => {
    const result = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: '' } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('No Clerk publishable key');
    expect(result.output).toContain('Nothing was deployed.');
    expect(seenPaths).toEqual([]);
    expect(wranglerCalls()).toEqual([]);
  });

  it('refuses a development key, because it would put the test sign-in on the live site', async () => {
    const result = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: clerkKey('quiet-owl-12.clerk.accounts.dev', 'test') } });
    expect(result.code).toBe(1);
    expect(result.output).toContain('development key');
    expect(wranglerCalls()).toEqual([]);
  });

  it.each([['pk_live_'], ['sk_live_abcdef'], ['pk_live_not base64!'], ['pk_live_bm90IGEgaG9zdA==']])('refuses %s as a key', async (key) => {
    const result = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: key } });
    expect(result.code).toBe(1);
    expect(wranglerCalls()).toEqual([]);
  });

  it('refuses a key from a different Clerk instance than CLERK_ISSUER names', async () => {
    const config = path.join(root, 'worker', 'wrangler.jsonc');
    writeFileSync(config, readFileSync(config, 'utf8').replace('"CLERK_ISSUER": ""', '"CLERK_ISSUER": "https://clerk.gylio.app"'));
    const other = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: clerkKey('clerk.other.example') } });
    expect(other.code).toBe(1);
    expect(other.output).toContain('same Clerk instance');
    expect(wranglerCalls()).toEqual([]);
    expect((await run('setup.sh', { env: creds })).code).toBe(0);
  });

  it('reads the key from the private key file when the environment has none', async () => {
    mkdirSync(path.join(root, '.config', 'gylio'), { recursive: true });
    writeFileSync(path.join(root, '.config', 'gylio', 'clerk_publishable_key'), `${LIVE_KEY}\n`);
    const result = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: '' } });
    expect(result.code).toBe(0);
    expect(buildEnv()).toContain(`clerk=[${LIVE_KEY}]`);
  });

  it('asks for the key at the prompt when it is missing and someone is there to answer', async () => {
    const result = await run('setup.sh', { env: { ...creds, VITE_CLERK_PUBLISHABLE_KEY: '' }, tty: true, input: `${LIVE_KEY}\n\n\n` });
    expect(result.code).toBe(0);
    expect(buildEnv()).toContain(`clerk=[${LIVE_KEY}]`);
  });
});

describe('holder of the personal data (sign-up stays closed until it is named)', () => {
  const HOLDER = 'Titular de prueba';
  const holderFile = () => path.join(root, '.config', 'gylio', 'holder');
  const writeHolder = (content: string, fileMode = 0o600, dirMode = 0o700) => {
    mkdirSync(path.dirname(holderFile()), { recursive: true });
    writeFileSync(holderFile(), content);
    chmodSync(holderFile(), fileMode);
    chmodSync(path.dirname(holderFile()), dirMode);
  };
  const env = (extra: Record<string, string> = {}) => ({ ...creds, GYLIO_HOLDER_FILE: holderFile(), ...extra });

  it('with no holder file: deploys with sign-up closed and says why', async () => {
    const result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(result.code).toBe(0);
    expect(result.output).toContain('Sign-up: CLOSED. No holder file');
    expect(wranglerCalls()).toContain('deploy');
  });

  it('passes the holder to this one deploy with --var when the privacy page names the same holder', async () => {
    writeHolder(`${HOLDER}\n`);
    const result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(result.code).toBe(0);
    expect(result.output).toContain('Sign-up: OPEN');
    expect(wranglerCalls()).toContain(`deploy --var HOLDER_NAME:${HOLDER}`);
  });

  it('keeps sign-up closed when the built site has no privacy page', async () => {
    writeHolder(`${HOLDER}\n`);
    const result = await run('setup.sh', { env: env() });
    expect(result.output).toContain('Sign-up: CLOSED. The built site has no privacy page');
    expect(wranglerCalls()).toContain('deploy');
    expect(wranglerCalls().join('\n')).not.toContain('--var');
  });

  it('keeps sign-up closed when the privacy page names someone else', async () => {
    writeHolder(`${HOLDER}\n`);
    const result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'without' }) });
    expect(result.output).toContain('does not name the holder');
    expect(wranglerCalls().join('\n')).not.toContain('--var');
  });

  it('treats an empty holder file as no holder', async () => {
    writeHolder('\n');
    const result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(result.output).toContain('is empty');
    expect(wranglerCalls().join('\n')).not.toContain('--var');
  });

  it('stops, without deploying, when the holder file or its folder is open to other people', async () => {
    writeHolder(`${HOLDER}\n`, 0o644);
    let result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(result.code).toBe(1);
    expect(result.output).toContain('chmod 600');
    writeHolder(`${HOLDER}\n`, 0o600, 0o755);
    result = await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(result.code).toBe(1);
    expect(result.output).toContain('chmod 700');
    expect(wranglerCalls()).not.toContain('deploy');
  });

  it('on a terminal, asks to confirm the holder; "n" stops the deploy', async () => {
    writeHolder(`${HOLDER}\n`);
    const result = await run('setup.sh', { tty: true, env: env({ FAKE_PRIVACY: 'with' }), input: '\n\nn\n' });
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Holder on file: "${HOLDER}"`);
    expect(wranglerCalls()).not.toContain('deploy');
  });

  it('on a terminal, Enter confirms the holder and sign-up opens', async () => {
    writeHolder(`${HOLDER}\n`);
    const result = await run('setup.sh', { tty: true, env: env({ FAKE_PRIVACY: 'with' }), input: '\n\n\n' });
    expect(result.code).toBe(0);
    expect(wranglerCalls()).toContain(`deploy --var HOLDER_NAME:${HOLDER}`);
  });

  it('never writes the holder into the config or the headers: it exists only in the private file and the privacy page', async () => {
    writeHolder(`${HOLDER}\n`);
    await run('setup.sh', { env: env({ FAKE_PRIVACY: 'with' }) });
    expect(readFileSync(path.join(root, 'worker', 'wrangler.jsonc'), 'utf8')).not.toContain(HOLDER);
    expect(readFileSync(path.join(root, 'dist', '_headers'), 'utf8')).not.toContain(HOLDER);
  });
});

describe('export and secret', () => {
  it('exports to a file outside the repository with owner-only access, and prints no data', async () => {
    const out = path.join(os.tmpdir(), `gylio-export-${process.pid}.sql`);
    const result = await run('export.sh', { env: creds, args: [out] });
    expect(result.code).toBe(0);
    expect(wranglerCalls()).toContain(`d1 export gylio --remote --output=${out}`);
    expect(statSync(out).mode & 0o777).toBe(0o600);
    expect(result.output).not.toContain('-- dump');
    rmSync(out, { force: true });
  });

  it('refuses to export into the repository', async () => {
    const result = await run('export.sh', { env: creds, args: [path.join(root, 'backup.sql')] });
    expect(result.code).toBe(1);
    expect(result.output).toContain('outside the repository');
    expect(wranglerCalls()).toEqual([]);
  });

  it('sets a named secret through wrangler’s own prompt, never passing a value', async () => {
    const config = path.join(root, 'worker', 'wrangler.jsonc');
    writeFileSync(config, readFileSync(config, 'utf8').replace(/TODO_[A-Z0-9_]+/, DB_ID));
    const result = await run('secret.sh', { env: creds, args: ['CLERK_SECRET_KEY'] });
    expect(result.code).toBe(0);
    expect(wranglerCalls()).toEqual(['secret put CLERK_SECRET_KEY']);
  });

  it('stops before any secret is set while a TODO_ placeholder is left in the config', async () => {
    const result = await run('secret.sh', { env: creds, args: ['CLERK_SECRET_KEY'] });
    expect(result.code).toBe(1);
    expect(wranglerCalls()).toEqual([]);
  });

  it('refuses a missing or malformed secret name', async () => {
    for (const args of [[], ['lower'], ['BAD-NAME'], ['X;rm']]) {
      const result = await run('secret.sh', { env: creds, args });
      expect(result.code).toBe(1);
    }
    expect(wranglerCalls()).toEqual([]);
  });
});

describe('redeploy', () => {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  let origin = '';

  beforeEach(() => {
    origin = mkdtempSync(path.join(os.tmpdir(), 'gylio-origin-'));
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    git('init', '-q', '-b', 'main');
    writeFileSync(path.join(root, '.gitignore'), 'fake*\nnode_modules\ndist\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'first');
    git('remote', 'add', 'origin', origin);
    git('push', '-q', '-u', 'origin', 'main');
  });
  afterEach(() => rmSync(origin, { recursive: true, force: true }));

  it('stops when the checkout is not on main', async () => {
    git('checkout', '-q', '-b', 'feature');
    const result = await run('redeploy.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain('not on main');
    expect(wranglerCalls()).toEqual([]);
  });

  it('stops on an uncommitted change and shows what it is', async () => {
    writeFileSync(path.join(root, 'package.json'), '{"name":"changed"}\n');
    const result = await run('redeploy.sh', { env: creds });
    expect(result.code).toBe(1);
    expect(result.output).toContain('package.json');
    expect(result.output).toContain('Uncommitted changes');
    expect(wranglerCalls()).toEqual([]);
  });

  it('allows the local database id in wrangler.jsonc, restores the file first, then deploys the commit on main', async () => {
    // A stale id from an earlier database: if redeploy did not restore the file, setup would stop on it.
    writeFileSync(paths().d1, JSON.stringify([{ name: 'gylio', uuid: DB_ID }]));
    const config = path.join(root, 'worker', 'wrangler.jsonc');
    writeFileSync(config, readFileSync(config, 'utf8').replace(/TODO_[A-Z0-9_]+/, '99999999-9999-9999-9999-999999999999'));
    const result = await run('redeploy.sh', { env: creds });
    expect(result.code).toBe(0);
    expect(result.output).toMatch(/Deploying commit [0-9a-f]{7,}: first/);
    expect(wranglerCalls().slice(0, 2).every((c) => c.startsWith('install in'))).toBe(true);
    expect(wranglerCalls()).toContain('deploy');
    expect(readFileSync(config, 'utf8')).toContain(DB_ID);
  });

  it('installs from the lockfile in both packages before setup', async () => {
    await run('redeploy.sh', { env: creds });
    const calls = wranglerCalls();
    expect(calls.filter((c) => c.startsWith('install in')).length).toBe(2);
    expect(calls.indexOf('deploy')).toBeGreaterThan(calls.lastIndexOf(calls.filter((c) => c.startsWith('install in')).at(-1)!));
  });

  it('pulls new commits from origin before deploying them', async () => {
    const other = mkdtempSync(path.join(os.tmpdir(), 'gylio-other-'));
    execFileSync('git', ['clone', '-q', origin, other]);
    writeFileSync(path.join(other, 'NEWS.md'), 'new\n');
    const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
    execFileSync('git', ['add', '-A'], { cwd: other, env });
    execFileSync('git', ['commit', '-q', '-m', 'second'], { cwd: other, env });
    execFileSync('git', ['push', '-q'], { cwd: other, env });
    const result = await run('redeploy.sh', { env: creds });
    rmSync(other, { recursive: true, force: true });
    expect(result.code).toBe(0);
    expect(result.output).toContain(': second');
    expect(existsSync(path.join(root, 'NEWS.md'))).toBe(true);
  });
});
