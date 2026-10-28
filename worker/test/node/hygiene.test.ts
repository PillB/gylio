import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = path.join(import.meta.dirname, '..', '..', '..');
const read = (...parts: string[]) => readFileSync(path.join(repo, ...parts), 'utf8');
const workflows = readdirSync(path.join(repo, '.github', 'workflows')).filter((name) => /\.ya?ml$/.test(name));

describe('workflows run only reviewed code', () => {
  it('has workflows to check', () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it('pins every action to a full commit SHA with a version comment', () => {
    const offenders = workflows.flatMap((name) =>
      read('.github', 'workflows', name)
        .split('\n')
        .map((text, i) => ({ name, line: i + 1, text }))
        .filter(({ text }) => /^\s*-?\s*uses:/.test(text) && !/uses:\s+\S+@[0-9a-f]{40}\s+#\s*v\d/.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it('lets a deploy that has started finish', () => {
    const pages = read('.github', 'workflows', 'pages.yml');
    expect(pages).toMatch(/concurrency:\s*\n\s+group: pages\s*\n\s+cancel-in-progress: false/);
  });

  it('runs CI on pull requests and on pushes to main', () => {
    const ci = read('.github', 'workflows', 'ci.yml');
    expect(ci).toMatch(/pull_request/);
    expect(ci).toMatch(/push:\s*\n\s+branches:\s*\[?\s*main/);
  });
});

describe('deploy paths have an owner', () => {
  const codeowners = read('.github', 'CODEOWNERS');
  const rules = codeowners
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.trim().split(/\s+/));

  it.each(['/.github/', '/worker/', '/server/', '/docs/CLOUDFLARE_*.md'])('assigns an owner to %s', (pattern) => {
    const rule = rules.find(([glob]) => glob === pattern);
    expect(rule?.slice(1).length ?? 0).toBeGreaterThan(0);
    expect(rule?.slice(1).every((owner) => /^@[\w-]+$/.test(owner))).toBe(true);
  });

  it('only names paths that exist', () => {
    const missing = rules
      .map(([glob]) => glob)
      .filter((glob) => !glob.includes('*'))
      .filter((glob) => !existsSync(path.join(repo, glob.replace(/^\//, ''))));
    expect(missing).toEqual([]);
  });
});

describe('dependency updates cover what is deployed', () => {
  const dependabot = read('.github', 'dependabot.yml');
  const entries = dependabot.split(/\n\s+- package-ecosystem: /).slice(1);

  it.each([
    ['npm', '/'],
    ['npm', '/worker'],
    ['npm', '/server'],
    ['github-actions', '/'],
  ])('watches %s in %s', (ecosystem, directory) => {
    expect(entries.some((entry) => entry.startsWith(ecosystem) && new RegExp(`directory: ${directory}\\s*\\n`).test(entry))).toBe(true);
  });

  it('keeps major upgrades of the deploy tool out of automatic PRs', () => {
    const worker = entries.find((entry) => /directory: \/worker\s*\n/.test(entry)) ?? '';
    expect(worker).toMatch(/version-update:semver-major/);
  });
});

describe('one story about the Node version', () => {
  const nvmrc = read('.nvmrc').trim();
  const lib = read('worker', 'scripts', 'lib.sh');
  const major = /^NODE_MIN_MAJOR=(\d+)/m.exec(lib)?.[1];
  const minor = /^NODE_MIN_MINOR=(\d+)/m.exec(lib)?.[1];
  const minimum = `${major}.${minor}`;

  it('has a pinned major and a stated minimum', () => {
    expect(nvmrc).toMatch(/^\d+$/);
    expect(minimum).toMatch(/^\d+\.\d+$/);
  });

  it('says the same numbers in the manual and the scripts', () => {
    const manual = read('docs', 'CLOUDFLARE_GO_LIVE_MANUAL.md');
    expect(manual).toContain(`Node ${minimum}`);
    expect(manual).toContain(`Node ${nvmrc}`);
    expect(lib).toContain(`Install Node ${nvmrc}`);
  });
});
