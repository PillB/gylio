import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, assignVariant, bucketOf, fnv1a, readOverride } from './experiments';

describe('fnv1a', () => {
  it('matches the published FNV-1a 32-bit test vectors', () => {
    // Reference values from the FNV specification (isthe.com/chongo/tech/comp/fnv).
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });
});

describe('assignVariant', () => {
  it('always gives the same person the same variant', () => {
    const def = EXPERIMENTS.trial_cta_copy;
    const first = assignVariant(def, 'trial_cta_copy', 'user_123');
    for (let i = 0; i < 5; i += 1) expect(assignVariant(def, 'trial_cta_copy', 'user_123')).toBe(first);
  });

  it('splits 20,000 people close to 50/50 (within 2 points)', () => {
    const def = EXPERIMENTS.paywall_default_interval;
    let yearly = 0;
    for (let i = 0; i < 20_000; i += 1) if (assignVariant(def, 'paywall_default_interval', `u${i}`) === 'yearly') yearly += 1;
    expect(yearly / 20_000).toBeGreaterThan(0.48);
    expect(yearly / 20_000).toBeLessThan(0.52);
  });

  it('assigns the two experiments independently of each other', () => {
    // If buckets were shared, the same people would land "first" in both.
    let agree = 0;
    for (let i = 0; i < 10_000; i += 1) {
      const a = bucketOf('paywall_default_interval', `u${i}`) < 0.5;
      const b = bucketOf('trial_cta_copy', `u${i}`) < 0.5;
      if (a === b) agree += 1;
    }
    expect(agree / 10_000).toBeGreaterThan(0.47);
    expect(agree / 10_000).toBeLessThan(0.53);
  });

  it('respects weights', () => {
    const def = { variants: ['a', 'b'], weights: [9, 1] };
    let a = 0;
    for (let i = 0; i < 10_000; i += 1) if (assignVariant(def, 'w', `u${i}`) === 'a') a += 1;
    expect(a / 10_000).toBeGreaterThan(0.88);
    expect(a / 10_000).toBeLessThan(0.92);
  });
});

describe('readOverride', () => {
  it('accepts only a declared variant', () => {
    const variants = EXPERIMENTS.trial_cta_copy.variants;
    expect(readOverride('?exp_trial_cta_copy=try_free_no_card', 'trial_cta_copy', variants)).toBe('try_free_no_card');
    expect(readOverride('?exp_trial_cta_copy=free_money', 'trial_cta_copy', variants)).toBeNull();
  });
});
