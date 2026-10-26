import { describe, expect, it } from 'vitest';
import { levelProgress } from './xpProgress';

describe('levelProgress', () => {
  it('is empty at the start of a level and halfway at half the XP', () => {
    expect(levelProgress(0, 1)).toBe(0);
    expect(levelProgress(50, 1)).toBe(0.5);
  });
  it('measures from the level floor, not from zero (level 3 starts at 200 XP)', () => {
    expect(levelProgress(250, 3)).toBe(0.5);
  });
  it('clamps points that lag or lead the stored level', () => {
    expect(levelProgress(40, 2)).toBe(0);
    expect(levelProgress(500, 2)).toBe(1);
  });
  it('treats a missing or invalid level as level 1', () => {
    expect(levelProgress(25, 0)).toBe(0.25);
    expect(levelProgress(25, Number.NaN)).toBe(0.25);
  });
});
