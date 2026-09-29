import { describe, expect, it } from 'vitest';
import { houseAdIndex, isAdTestMode, resolveAdProvider } from './adConfig';

const adsense = { VITE_ADS_PROVIDER: 'adsense', VITE_ADSENSE_CLIENT: 'ca-pub-1', VITE_ADSENSE_SLOT: '123' };

describe('resolveAdProvider', () => {
  it('defaults to house ads', () => {
    expect(resolveAdProvider({}, 'settings')).toBe('house');
  });

  it('uses AdSense only when fully configured', () => {
    expect(resolveAdProvider(adsense, 'settings')).toBe('adsense');
    expect(resolveAdProvider({ ...adsense, VITE_ADSENSE_SLOT: '' }, 'settings')).toBe('house');
  });

  it('can switch ads off entirely', () => {
    expect(resolveAdProvider({ ...adsense, VITE_ADS_PROVIDER: 'off' }, 'qa')).toBe('off');
  });
});

describe('isAdTestMode', () => {
  it('is on in development and when requested, off in a normal production build', () => {
    expect(isAdTestMode({ DEV: true })).toBe(true);
    expect(isAdTestMode({ VITE_ADS_TEST_MODE: 'true' })).toBe(true);
    expect(isAdTestMode({ DEV: false })).toBe(false);
  });
});

describe('houseAdIndex', () => {
  it('keeps the same card all day and stays in range', () => {
    expect(houseAdIndex('2026-10-01', 3)).toBe(houseAdIndex('2026-10-01', 3));
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      const index = houseAdIndex(day, 3);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
  });
});
