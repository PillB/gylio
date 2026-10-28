import { describe, expect, it } from 'vitest';
import { placeTooltip, type Rect } from './placeTooltip';

const base = { viewportW: 1280, viewportH: 800, tipW: 320, tipH: 330, gap: 14, pad: 12, prefer: 'bottom' as const };
const rect = (top: number, bottom: number, left = 400, right = 880): Rect => ({ top, bottom, left, right });

const overlaps = (p: { top: number; left: number }, r: Rect, tipW = 320, tipH = 330) =>
  p.top < r.bottom && p.top + tipH > r.top && p.left < r.right && p.left + tipW > r.left;

describe('placeTooltip', () => {
  it('goes below the target when there is room', () => {
    const r = rect(100, 200);
    const p = placeTooltip({ ...base, target: r });
    expect(p.side).toBe('below');
    expect(overlaps(p, r)).toBe(false);
  });

  it('goes above when below is cramped (the old code clamped it onto the target)', () => {
    const r = rect(500, 760);
    const p = placeTooltip({ ...base, target: r });
    expect(p.side).toBe('above');
    expect(overlaps(p, r)).toBe(false);
  });

  it('goes beside a tall, narrow target on a wide screen (premium gate card on desktop)', () => {
    const r = rect(130, 670, 400, 880);
    const p = placeTooltip({ ...base, target: r });
    expect(['right', 'left']).toContain(p.side);
    expect(overlaps(p, r)).toBe(false);
  });

  it('keeps the card inside the viewport', () => {
    const r = rect(130, 670, 400, 880);
    const p = placeTooltip({ ...base, target: r });
    expect(p.top).toBeGreaterThanOrEqual(12);
    expect(p.top + 330).toBeLessThanOrEqual(800 - 12);
    expect(p.left + 320).toBeLessThanOrEqual(1280 - 12);
  });

  it('docks at the edge away from the target centre when nothing fits (full-width calendar)', () => {
    const wide = placeTooltip({ ...base, target: rect(120, 700, 145, 1135) });
    expect(wide.side).toBe('dock');
    expect(wide.top).toBe(12); // target centre is below mid-screen -> card at the top
    const top = placeTooltip({ ...base, target: rect(20, 500, 145, 1135) });
    expect(top.side).toBe('dock');
    expect(top.top).toBe(800 - 330 - 12);
  });

  it('honours a preferred side only if it fits', () => {
    const r = rect(400, 450);
    expect(placeTooltip({ ...base, target: r, prefer: 'top' }).side).toBe('above');
    expect(placeTooltip({ ...base, target: rect(100, 150), prefer: 'top' }).side).toBe('below');
  });
});
