/** FNV-1a 32-bit: small, deterministic, no dependency. Not cryptographic; only for bucketing. */
const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** Stable arm for an install: hash(installId + experiment) so arms are independent across experiments. */
export const assignVariant = <V extends string>(installId: string, experiment: string, variants: readonly V[]): V =>
  variants[fnv1a(`${experiment}:${installId}`) % variants.length];

/** Sample-ratio-mismatch check for a 50/50 test: chi-square (1 df) p<0.001 threshold is 10.83. */
export const hasSampleRatioMismatch = (a: number, b: number): boolean => {
  const n = a + b;
  if (n === 0) return false;
  const expected = n / 2;
  return ((a - expected) ** 2 + (b - expected) ** 2) / expected > 10.83;
};

export const PLAN_DAY_EXPERIMENT = { name: 'plan-day-v1', variants: ['cap', 'cap-with-nudge'] as const };
