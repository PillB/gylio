// @vitest-environment node
/**
 * The site ships only what a visitor needs. An internal deployment guide (a runbook for an old Hostinger, PM2 and
 * Nginx setup) used to be published at /deployment-guide.html, linked from a footer on every page (red team P1-8).
 * These checks fail if it, another runbook, or a link to it comes back.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OPS = /deployment-guide|Hostinger|\bPM2\b|\bnginx\b|MongoDB Atlas|\bssh\b/i;
const TEXT = /\.(html?|json|txt|svg|xml|webmanifest|js|css)$/i;

const filesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(full) : [full];
  });

const relative = (file: string) => path.relative(repo, file);

describe('the public site', () => {
  it('copies no deployment guide or other runbook from public/', () => {
    const found = filesIn(path.join(repo, 'public'))
      .filter((file) => OPS.test(path.basename(file)) || (TEXT.test(file) && OPS.test(readFileSync(file, 'utf8'))))
      .map(relative);
    expect(found).toEqual([]);
  });

  it('links to no deployment guide from the app or its page', () => {
    const sources = filesIn(path.join(repo, 'src')).filter((file) => /\.(tsx?|jsx?|json)$/.test(file) && !/\.(test|spec)\./.test(file));
    const found = [...sources, path.join(repo, 'index.html')]
      .filter((file) => /deployment-guide|deploymentAcademy/i.test(readFileSync(file, 'utf8')))
      .map(relative);
    expect(found).toEqual([]);
  });
});
