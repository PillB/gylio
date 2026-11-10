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

/**
 * How many pixels short of fitting still counts as fitting. Pages scroll in whole pixels and cards
 * measure in fractions (330.53px in Firefox), so a card that fits beside its target exactly on paper
 * arrives up to a pixel short. Without this it was then docked on top of the target it had room beside.
 */
export const FIT_SLACK = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * Places the tour card so it does not cover the element it explains.
 * Order: preferred side, then below, above, right, left. When the target is so
 * large that no side has room (a full week grid, or a long form on a phone), the
 * card docks to the bottom of the screen, where it covers the target's lower edge
 * and leaves its heading readable. It docks to the top only when the target's top
 * has scrolled off and its lower part is what is on screen.
 */
export function placeTooltip({ target, viewportW, viewportH, tipW, tipH, gap, pad, prefer }: PlaceArgs): TooltipPlacement {
  const centerX = (target.left + target.right) / 2;
  const alignedLeft = clamp(centerX - tipW / 2, pad, viewportW - tipW - pad);
  const alignedTop = clamp(target.top, pad, viewportH - tipH - pad);

  const fits = {
    below: viewportH - target.bottom >= tipH + gap + pad - FIT_SLACK,
    above: target.top >= tipH + gap + pad - FIT_SLACK,
    right: viewportW - target.right >= tipW + gap + pad - FIT_SLACK,
    left: target.left >= tipW + gap + pad - FIT_SLACK,
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

  const onlyLowerPartShows = target.top < 0 && target.bottom <= viewportH;
  const dockTop = onlyLowerPartShows ? pad : viewportH - tipH - pad;
  return { side: 'dock', top: Math.max(pad, dockTop), left: alignedLeft };
}
