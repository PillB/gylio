import { describe, expect, it } from 'vitest';
import {
  HOUSE_AD_SESSION_CAP,
  countHouseAdImpression,
  houseAdCapReached,
  houseAdCountKey,
  houseAdIndex,
  isAdTestMode,
  resolveAdProvider,
} from './adConfig';

const adsense = { VITE_ADS_PROVIDER: 'adsense', VITE_ADSENSE_CLIENT: 'ca-pub-1', VITE_ADSENSE_SLOT: '123' };

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

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

  it('allows the rewards placement for AdSense', () => {
    expect(resolveAdProvider(adsense, 'rewards')).toBe('adsense');
    expect(resolveAdProvider({}, 'rewards')).toBe('house');
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

describe('house ad session cap', () => {
  it('allows impressions below the cap and blocks at the cap', () => {
    const storage = memoryStorage();
    const key = houseAdCountKey('rewards');
    for (let i = 0; i < HOUSE_AD_SESSION_CAP; i += 1) {
      expect(houseAdCapReached(storage, 'rewards')).toBe(false);
      countHouseAdImpression(storage, 'rewards');
    }
    expect(houseAdCapReached(storage, 'rewards')).toBe(true);
    expect(storage.getItem(key)).toBe(String(HOUSE_AD_SESSION_CAP));
  });

  it('counts placements independently', () => {
    const storage = memoryStorage();
    countHouseAdImpression(storage, 'settings');
    countHouseAdImpression(storage, 'settings');
    expect(houseAdCapReached(storage, 'settings')).toBe(false);
    expect(houseAdCapReached(storage, 'rewards')).toBe(false);
    expect(houseAdCapReached(storage, 'qa')).toBe(false);
  });

  it('respects a custom cap', () => {
    const storage = memoryStorage();
    countHouseAdImpression(storage, 'settings');
    expect(houseAdCapReached(storage, 'settings', 1)).toBe(true);
  });

  it('shows the ad rather than breaking when storage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(houseAdCapReached(throwing, 'settings')).toBe(false);
    expect(() => countHouseAdImpression(throwing, 'settings')).not.toThrow();
  });
});
