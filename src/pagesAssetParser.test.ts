import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const base = 'https://pillb.github.io/gylio/';

/** Execute the same CLI as the Pages runner, with realistic built HTML fixtures. */
function runParser(html: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gylio-pages-'));
  const file = path.join(dir, 'index.html');
  try {
    fs.writeFileSync(file, html);
    return spawnSync(process.execPath, ['scripts/pages-live-asset.mjs', file, base], { encoding: 'utf8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('Pages live JS asset discovery', () => {
  it('resolves the actual hashed module entry under the project base path', () => {
    const result = runParser('<div id="root"></div><script type="module" crossorigin src="/gylio/assets/main-abc123.js"></script>');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('https://pillb.github.io/gylio/assets/main-abc123.js');
  });

  it('handles relative paths, single quotes and reordered attributes', () => {
    const result = runParser("<script src='assets/main-abc123.js' crossorigin type='module'></script>");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('https://pillb.github.io/gylio/assets/main-abc123.js');
  });

  it('fails closed when the site serves HTML without a built module', () => {
    const result = runParser('<html><body>Not found</body></html>');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('no compiled module');
  });

  it('rejects scripts outside the deployed project, including external domains', () => {
    const outside = runParser('<script type="module" src="/other/assets/main.js"></script>');
    const external = runParser('<script type="module" src="https://example.org/assets/main.js"></script>');
    expect(outside.status).not.toBe(0);
    expect(external.status).not.toBe(0);
    expect(external.stderr).toContain('outside the deployed assets');
  });
});
