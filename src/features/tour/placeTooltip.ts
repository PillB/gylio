export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type TooltipSide = 'below' | 'above' | 'right' | 'left' | 'dock';

export interface TooltipPlacement {
  top: number;
  left: number;
  side: TooltipSide;
}

interface PlaceArgs {
  target: Rect;
  viewportW: number;
  viewportH: number;
  tipW: number;
  tipH: number;
  gap: number;
  pad: number;
  /** The author's preferred side; honoured only when the card fits there without covering the target. */
  prefer: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * Places the tour card so it does not cover the element it explains.
 * Order: preferred side, then below, above, right, left. When the target is so
 * large that no side has room (a full week grid on a phone), the card docks to
 * the viewport edge farther from the target's centre so it covers the least
 * important edge of the target instead of its heading.
 */
export function placeTooltip({ target, viewportW, viewportH, tipW, tipH, gap, pad, prefer }: PlaceArgs): TooltipPlacement {
  const centerX = (target.left + target.right) / 2;
  const alignedLeft = clamp(centerX - tipW / 2, pad, viewportW - tipW - pad);
  const alignedTop = clamp(target.top, pad, viewportH - tipH - pad);

  const fits = {
    below: viewportH - target.bottom >= tipH + gap + pad,
    above: target.top >= tipH + gap + pad,
    right: viewportW - target.right >= tipW + gap + pad,
    left: target.left >= tipW + gap + pad,
  };
  const spots: Record<Exclude<TooltipSide, 'dock'>, TooltipPlacement> = {
    below: { side: 'below', top: target.bottom + gap, left: alignedLeft },
    above: { side: 'above', top: target.top - gap - tipH, left: alignedLeft },
    right: { side: 'right', top: alignedTop, left: target.right + gap },
    left: { side: 'left', top: alignedTop, left: target.left - gap - tipW },
  };

  const preferred = prefer === 'top' ? 'above' : prefer === 'bottom' ? 'below' : prefer === 'center' ? null : prefer;
  const order = [preferred, 'below', 'above', 'right', 'left'].filter(Boolean) as (keyof typeof spots)[];
  const side = order.find((candidate) => fits[candidate]);
  if (side) return spots[side];

  const targetMid = (target.top + target.bottom) / 2;
  const dockTop = targetMid > viewportH / 2 ? pad : viewportH - tipH - pad;
  return { side: 'dock', top: Math.max(pad, dockTop), left: alignedLeft };
}
