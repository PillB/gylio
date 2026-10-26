/** XP needed per level; a level's range is [(level - 1) * XP_PER_LEVEL, level * XP_PER_LEVEL). */
export const XP_PER_LEVEL = 100;

/** Share of the current level already earned, 0 to 1. Points outside the level's range are clamped. */
export function levelProgress(points: number, level: number): number {
  const safeLevel = Math.max(1, Math.floor(level) || 1);
  const earnedInLevel = points - (safeLevel - 1) * XP_PER_LEVEL;
  return Math.min(1, Math.max(0, earnedInLevel / XP_PER_LEVEL));
}
