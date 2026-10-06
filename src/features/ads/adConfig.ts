/**
 * adConfig — where ads may appear and which network serves them.
 *
 * Research summary (docs/billing/ADS.md): AdSense needs its own domain and
 * forbids ads on screens where the user is not looking (timers, focus) or that
 * carry little publisher content; none of the neurodivergent-focused competitors
 * show ads. So ads are limited to low-stakes pages — Settings, QA and the
 * Rewards pause point — never Tasks, Calendar, Budget entry, Routines, focus
 * or the paywall, and default to Gylio's own "house" cards until AdSense is
 * approved. House ads are frequency-capped per session so repeat visits in
 * one sitting never pile up (non-intrusive discipline).
 */

export type AdPlacement = 'settings' | 'qa' | 'rewards';
export type AdProvider = 'house' | 'adsense' | 'off';

export type AdEnv = {
  VITE_ADS_PROVIDER?: string;
  VITE_ADSENSE_CLIENT?: string;
  VITE_ADSENSE_SLOT?: string;
  VITE_ADS_TEST_MODE?: string;
  DEV?: boolean;
};

const ADSENSE_PLACEMENTS: ReadonlySet<AdPlacement> = new Set(['settings', 'qa', 'rewards']);

export function resolveAdProvider(env: AdEnv, placement: AdPlacement): AdProvider {
  const requested = env.VITE_ADS_PROVIDER ?? 'house';
  if (requested === 'off') return 'off';
  const adsenseReady = Boolean(env.VITE_ADSENSE_CLIENT && env.VITE_ADSENSE_SLOT);
  if (requested === 'adsense' && adsenseReady && ADSENSE_PLACEMENTS.has(placement)) return 'adsense';
  return 'house';
}

/** Test ads never earn and never count as invalid traffic; on in dev and when asked. */
export const isAdTestMode = (env: AdEnv) => env.VITE_ADS_TEST_MODE === 'true' || Boolean(env.DEV);

/** The house card shown today; one per day so it never flickers between renders. */
export function houseAdIndex(dayKey: string, count: number): number {
  let sum = 0;
  for (const char of dayKey) sum = (sum + char.charCodeAt(0)) % 9973;
  return count > 0 ? sum % count : 0;
}

// ── House-ad session frequency cap ──────────────────────────────────────────

/** Max house-ad exposures per placement per browser session. */
export const HOUSE_AD_SESSION_CAP = 3;

export type ImpressionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const houseAdCountKey = (placement: AdPlacement): string => `ads:house:${placement}`;

/**
 * Read-only cap check for the current mount. Counting happens once per mount
 * (ref-guarded in AdSlot so React StrictMode's double effect run counts once).
 */
export function houseAdCapReached(
  storage: ImpressionStorage,
  placement: AdPlacement,
  cap: number = HOUSE_AD_SESSION_CAP,
): boolean {
  try {
    return parseInt(storage.getItem(houseAdCountKey(placement)) ?? '0', 10) >= cap;
  } catch {
    return false; // storage unavailable: prefer showing over breaking the page
  }
}

/** Count one house-ad exposure for this placement (once per mount). */
export function countHouseAdImpression(storage: ImpressionStorage, placement: AdPlacement): void {
  try {
    const key = houseAdCountKey(placement);
    const next = parseInt(storage.getItem(key) ?? '0', 10) + 1;
    storage.setItem(key, String(next));
  } catch {
    // storage unavailable: skip counting; the cap check degrades to "show"
  }
}
