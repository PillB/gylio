// @vitest-environment node
/**
 * The e2e suite runs in Chromium, Firefox and WebKit (Safari's engine), locally and in CI. Before 2026-10-28 it ran
 * in Chromium only, so nothing showed a Firefox- or Safari-only break. These checks fail if an engine drops out.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(path.join(repo, ...parts), 'utf8');

describe('the browser matrix', () => {
  it('has a Playwright project for each engine', () => {
    const names = [...read('playwright.config.ts').matchAll(/name: '([a-z]+)'/g)].map((match) => match[1]);
    expect(names).toEqual(['chromium', 'firefox', 'webkit']);
  });

  it('runs every engine in CI', () => {
    const ci = read('.github', 'workflows', 'ci.yml');
    expect(ci).toContain('npx playwright test --project=chromium');
    expect(ci).toMatch(/browser: \[firefox, webkit\]/);
    expect(ci).toContain('npx playwright install --with-deps ${{ matrix.browser }}');
    expect(ci).toContain('npx playwright test --project=${{ matrix.browser }}');
  });
});
