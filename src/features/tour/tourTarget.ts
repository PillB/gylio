import type { TourStep } from './tourSteps';

/** Spacing the tour's spotlight and card share, in CSS pixels. */
export const TOUR_LAYOUT = {
  /** Space between the target and its card. */
  gap: 14,
  /** Space kept between the card and the edge of the screen. */
  pad: 12,
  /** How far the highlight ring reaches outside the target. */
  ring: 8,
  /** Used until the card has been measured. Cards run 260-350px depending on browser, language and text size. */
  estimatedCardHeight: 340,
} as const;

const NAME = /data-tour="([^"]+)"/;

/**
 * The first selector in a step's comma-separated list that is on the page, in the order the
 * step lists them. `querySelector` on the whole list returns whichever comes first in the page
 * instead, so a fallback written second ("Add details") would win over the field it reveals.
 */
export function findTourTarget(selector: string | null, root: ParentNode = document): HTMLElement | null {
  if (!selector) return null;
  for (const part of selector.split(',')) {
    const el = root.querySelector<HTMLElement>(part.trim());
    if (el) return el;
  }
  return null;
}

/** True when the spotlight is on a stand-in (a later selector in the list), not on the step's own target. */
export function isStandIn(selector: string | null, resolvedName: string | null): boolean {
  if (!selector || !resolvedName) return false;
  const own = NAME.exec(selector.split(',')[0])?.[1] ?? null;
  return own !== null && own !== resolvedName;
}

interface PairArgs {
  targetHeight: number;
  cardHeight: number;
  viewportH: number;
  prefer: TourStep['placement'];
}

/**
 * Where the target's top edge should sit so that the target and its card are both on screen.
 * They are centred as a pair, card under the target (over it when the step prefers 'top').
 * Centring the target alone, as `scrollIntoView({ block: 'center' })` does, leaves less than a
 * card's height on either side of it on a phone, so the card lands on top of the target.
 * When the two cannot fit together, the target's top goes to the top of the screen: the card
 * then covers its lower edge, never its heading.
 */
export function targetTopFor({ targetHeight, cardHeight, viewportH, prefer }: PairArgs): number {
  const { gap, pad, ring } = TOUR_LAYOUT;
  const pair = targetHeight + gap + cardHeight;
  if (pair > viewportH - pad * 2) return pad + ring;
  const pairTop = (viewportH - pair) / 2;
  return prefer === 'top' ? pairTop + cardHeight + gap : pairTop;
}

interface ReachArgs extends PairArgs {
  /** Where the target's top edge is now. */
  currentTop: number;
  /** How far the page can still scroll in each direction. */
  canScrollUp: number;
  canScrollDown: number;
}

/**
 * `targetTopFor`, checked against how far the page can scroll. The last section of a page
 * cannot be raised far enough to leave room for a card under it, and the first cannot be lowered
 * for a card over it: when the preferred arrangement is out of reach and the other one is not,
 * the other one is used, so the card still ends up beside the target instead of on it.
 */
export function reachableTargetTop({ currentTop, canScrollUp, canScrollDown, ...pair }: ReachArgs): number {
  const reachable = (top: number) => {
    const down = currentTop - top;
    return down <= canScrollDown + 1 && -down <= canScrollUp + 1;
  };
  const preferred = targetTopFor(pair);
  if (reachable(preferred)) return preferred;
  const other = targetTopFor({ ...pair, prefer: pair.prefer === 'top' ? 'bottom' : 'top' });
  return reachable(other) ? other : preferred;
}

/**
 * Scrolls the page so the target's top edge is at `desiredTop`. The behaviour is always explicit:
 * 'auto' would follow the page's own smooth scrolling and animate for someone who turned motion off.
 */
export function scrollTargetTo(el: HTMLElement, desiredTop: number, smooth: boolean, view: Window = window): void {
  const delta = el.getBoundingClientRect().top - desiredTop;
  if (Math.abs(delta) < 1) return;
  view.scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'instant' });
}

/** Same position and size: lets the overlay skip a re-render when nothing moved. */
export function sameBox(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === null || b === null) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}
