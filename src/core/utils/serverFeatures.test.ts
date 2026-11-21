import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportsEnabled, serverFeaturesEnabled } from './serverFeatures';

afterEach(() => vi.unstubAllEnvs());

describe('serverFeaturesEnabled', () => {
  it('is on only when the build says exactly true', () => {
    expect(serverFeaturesEnabled('true')).toBe(true);
    expect(serverFeaturesEnabled(' true ')).toBe(true);
    ['false', '', '1', 'TRUE', undefined].forEach((flag) => expect(serverFeaturesEnabled(flag)).toBe(false));
  });

  it('reads VITE_BILLING_ENABLED when it is asked, so a build without it is off', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    expect(serverFeaturesEnabled()).toBe(false);
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    expect(serverFeaturesEnabled()).toBe(true);
  });
});

describe('reportsEnabled', () => {
  it('is on with the full server or with the Worker, and off with neither (GitHub Pages)', () => {
    const cases: [billing: string, sync: string, expected: boolean][] = [
      ['true', 'false', true],
      ['false', 'true', true],
      ['true', 'true', true],
      ['false', 'false', false],
    ];
    cases.forEach(([billing, sync, expected]) => {
      vi.stubEnv('VITE_BILLING_ENABLED', billing);
      vi.stubEnv('VITE_SYNC_ENABLED', sync);
      expect(reportsEnabled(), `billing ${billing}, sync ${sync}`).toBe(expected);
    });
  });
});
