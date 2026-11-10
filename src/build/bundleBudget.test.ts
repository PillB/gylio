import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const made: string[] = [];

/** A build folder whose scripts are random bytes, which gzip cannot shrink, so sizes are known. */
function build(files: Record<string, number>, html: string): string {
  const dist = mkdtempSync(path.join(tmpdir(), 'gylio-bundle-'));
  made.push(dist);
  mkdirSync(path.join(dist, 'assets'));
  for (const [name, kb] of Object.entries(files)) writeFileSync(path.join(dist, 'assets', name), randomBytes(kb * 1024));
  writeFileSync(path.join(dist, 'index.html'), html);
  return dist;
}

const check = (dist: string, budget: string) =>
  spawnSync(process.execPath, ['scripts/check-bundle-size.mjs', dist, budget], { cwd: root, encoding: 'utf8' });

const PAGE = `<!doctype html><html><head>
  <script type="module" crossorigin src="/gylio/assets/main-a1.js"></script>
  <link rel="modulepreload" crossorigin href="/gylio/assets/vendor-b2.js">
  <link rel="stylesheet" crossorigin href="/gylio/assets/main-c3.css">
  <link rel="icon" href="/favicon.svg">
</head><body></body></html>`;

/** The two language files; the Spanish one is the larger, as in the real build. */
const LANGUAGES = { 'catalog.en-e5.js': 8, 'catalog.es-PE-f6.js': 10 };

afterEach(() => made.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('the first-load script budget', () => {
  it('adds up the entry module and what is preloaded with it, and leaves out chunks loaded on demand', () => {
    const dist = build({ 'main-a1.js': 30, 'vendor-b2.js': 20, 'LegalPage-d4.js': 400, ...LANGUAGES }, PAGE);
    const result = check(dist, '70');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('main-a1.js');
    expect(result.stdout).toContain('vendor-b2.js');
    expect(result.stdout).not.toContain('LegalPage');
    expect(result.stdout).toMatch(/60\.\d kB {2}first-load JavaScript, gzipped \(budget 70 kB\)/);
  });

  it('counts the text for one language, the larger, since the app fetches one as it starts', () => {
    const dist = build({ 'main-a1.js': 30, 'vendor-b2.js': 20, ...LANGUAGES }, PAGE);
    const result = check(dist, '70');
    expect(result.stdout).toMatch(/10\.\d kB {2}catalog\.es-PE-f6\.js \(one language, the larger\)/);
    expect(result.stdout).not.toContain('catalog.en-e5.js');
    // A language file the page itself names is counted once.
    const named = PAGE.replace('</head>', '<link rel="modulepreload" href="/gylio/assets/catalog.es-PE-f6.js"></head>');
    expect(check(build({ 'main-a1.js': 30, 'vendor-b2.js': 20, ...LANGUAGES }, named), '70').stdout).toMatch(/60\.\d kB {2}first-load/);
  });

  it('fails, and says by how much, when the first load is over budget', () => {
    const dist = build({ 'main-a1.js': 30, 'vendor-b2.js': 20, ...LANGUAGES }, PAGE);
    const result = check(dist, '55');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Over budget by 5\.\d kB/);
  });

  it('fails closed when it cannot measure: no module script, a script missing from the build, no language file, a bad budget', () => {
    expect(check(build({ ...LANGUAGES }, '<html><head></head></html>'), '60').status).toBe(2);
    const missing = check(build({ 'vendor-b2.js': 1, ...LANGUAGES }, PAGE), '60');
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('not in the build');
    const noLanguage = check(build({ 'main-a1.js': 1, 'vendor-b2.js': 1 }, PAGE), '60');
    expect(noLanguage.status).toBe(2);
    expect(noLanguage.stderr).toContain('no language file');
    expect(check(build({ 'main-a1.js': 1, 'vendor-b2.js': 1, ...LANGUAGES }, PAGE), 'lots').status).toBe(2);
  });

  it('measures the real build layout: each language is a file of its own, named as the check expects', () => {
    const loaders = readFileSync(path.join(root, 'src/i18n/catalogs.js'), 'utf8');
    expect([...loaders.matchAll(/import\('\.\/(catalog\.[A-Za-z-]+)\.js'\)/g)].map((m) => m[1])).toEqual(['catalog.en', 'catalog.es-PE']);
    // The module that starts with the app must not import the text itself, or both languages ride in the entry file.
    expect(readFileSync(path.join(root, 'src/i18n/i18n.js'), 'utf8')).not.toMatch(/\.json'|catalog\.(en|es-PE)\.js/);
  });

  it('runs on every build: in CI right after the build, and in npm run verify', () => {
    const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toMatch(/run: npm run build && npm run check:bundle/);
    const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
    expect(scripts['check:bundle']).toBe('node scripts/check-bundle-size.mjs dist');
    expect(scripts.verify).toMatch(/npm run -s build && npm run -s check:bundle$/);
  });
});
