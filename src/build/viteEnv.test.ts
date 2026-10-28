// @vitest-environment node
/**
 * The deploy's build (worker/scripts/setup.sh) must not read stray .env files. It lives with the site's tests, which
 * have Vite installed; the Worker's CI job installs only the Worker's packages.
 *
 * The real Vite configuration, resolved (not built): with GYLIO_ENV_DIR set, as the deploy sets it, a value planted in
 * a .env file is not read; without it, the same value is, which shows the check can fail.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// A mode of its own, so the planted file is read by nothing but this test.
const MODE = 'gylioenvcheck';
const planted = path.join(repo, `.env.${MODE}.local`);
const emptyDir = mkdtempSync(path.join(os.tmpdir(), 'gylio-env-'));
writeFileSync(planted, 'VITE_ADS_PROVIDER=adsense\n');

afterAll(() => {
  rmSync(planted, { force: true });
  rmSync(emptyDir, { recursive: true, force: true });
});

const resolvedEnv = async (envDir?: string) => {
  const before = process.env.GYLIO_ENV_DIR;
  if (envDir) process.env.GYLIO_ENV_DIR = envDir;
  else delete process.env.GYLIO_ENV_DIR;
  try {
    const config = await resolveConfig({ root: repo, configFile: path.join(repo, 'vite.config.ts'), mode: MODE, logLevel: 'silent' }, 'build');
    return config.env as Record<string, string | undefined>;
  } finally {
    if (before === undefined) delete process.env.GYLIO_ENV_DIR;
    else process.env.GYLIO_ENV_DIR = before;
  }
};

describe('the build reads no .env file during a deploy', () => {
  it('reads a planted value normally', async () => {
    expect((await resolvedEnv()).VITE_ADS_PROVIDER).toBe('adsense');
  });

  it('ignores it when the deploy points Vite at an empty folder', async () => {
    expect((await resolvedEnv(emptyDir)).VITE_ADS_PROVIDER).toBeUndefined();
  });
});
