/**
 * Where an arrow, Home or End key moves focus in a row of tabs (WAI-ARIA tabs pattern).
 * Returns null for any other key, so the caller leaves it alone. Wraps at both ends.
 */
export const tabIndexForKey = (key: string, index: number, count: number): number | null => {
  if (count <= 0) return null;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
};
