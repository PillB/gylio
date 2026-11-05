import { afterEach, describe, expect, it, vi } from 'vitest';
import { serverFeaturesEnabled } from './serverFeatures';

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
