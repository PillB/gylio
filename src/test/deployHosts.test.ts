import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Gylio is deployed to Cloudflare (production) and GitHub Pages (preview) only. Configuration and guides for other
 * hosts described a cross-origin setup nobody ran, and a reader could not tell which one was real.
 */
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const OTHER_HOSTS = /firebase|vercel|netlify|hostinger|railway\.app|render\.com/i;

describe('where the app is deployed', () => {
  it('keeps no hosting configuration for services it is not deployed to', () => {
    const configs = ['firebase.json', '.firebaserc', 'vercel.json', 'netlify.toml', 'render.yaml'];
    expect(configs.filter((file) => fs.existsSync(path.join(root, file)))).toEqual([]);
  });

  it('names only Cloudflare and GitHub Pages in the deploy guides', () => {
    for (const file of ['README.md', 'docs/PRODUCTION_DEPLOYMENT.md', '.env.local.example']) {
      const others = read(file)
        .split('\n')
        .filter((line) => OTHER_HOSTS.test(line) && !/were removed/.test(line));
      expect(others, file).toEqual([]);
    }
    expect(read('docs/PRODUCTION_DEPLOYMENT.md')).toMatch(/gylio\.app/);
    expect(read('README.md')).toMatch(/CLOUDFLARE_GO_LIVE_MANUAL\.md/);
  });
});
