import { afterEach, describe, expect, it, vi } from 'vitest';
import { findTourTarget, isStandIn, reachableTargetTop, sameBox, scrollTargetTo, targetTopFor, TOUR_LAYOUT } from './tourTarget';

const box = (top: number, left = 0, width = 100, height = 40) => ({ top, left, width, height }) as DOMRect;

describe('findTourTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const LIST = '[data-tour="task-date"], [data-tour="task-details-toggle"]';

  it('returns the first selector that is on the page, even when a later one comes first in the page', () => {
    // "Add details" sits above the date field it reveals, so querySelector on the list returns the button.
    document.body.innerHTML = '<button data-tour="task-details-toggle"></button><input data-tour="task-date" />';
    expect(document.querySelector(LIST)?.getAttribute('data-tour')).toBe('task-details-toggle');
    expect(findTourTarget(LIST)?.getAttribute('data-tour')).toBe('task-date');
  });

  it('falls back to the next selector while the first is not on the page', () => {
    document.body.innerHTML = '<button data-tour="task-details-toggle"></button>';
    expect(findTourTarget(LIST)?.getAttribute('data-tour')).toBe('task-details-toggle');
  });

  it('is null when nothing matches or the step has no target', () => {
    expect(findTourTarget(LIST)).toBeNull();
    expect(findTourTarget(null)).toBeNull();
  });
});

describe('isStandIn', () => {
  const LIST = '[data-tour="social-form"], [data-tour="premium-gate"]';
  it('is false on the step\'s own target', () => expect(isStandIn(LIST, 'social-form')).toBe(false));
  it('is true on a later selector', () => expect(isStandIn(LIST, 'premium-gate')).toBe(true));
  it('is false when nothing is highlighted', () => {
    expect(isStandIn(LIST, null)).toBe(false);
    expect(isStandIn(null, 'premium-gate')).toBe(false);
  });
});

describe('targetTopFor', () => {
  const phone = { viewportH: 568, cardHeight: 309, prefer: 'bottom' as const };

  it('centres the target and its card as a pair, so the card fits under the target on a small phone', () => {
    const top = targetTopFor({ ...phone, targetHeight: 60 });
    expect(top).toBe((568 - (60 + TOUR_LAYOUT.gap + 309)) / 2);
    const cardBottom = top + 60 + TOUR_LAYOUT.gap + 309;
    expect(cardBottom).toBeLessThanOrEqual(568 - TOUR_LAYOUT.pad);
    // Centring the target alone (the old scrollIntoView) leaves 254px under it: less than the card needs.
    const centredAlone = (568 - 60) / 2;
    expect(568 - (centredAlone + 60)).toBeLessThan(309 + TOUR_LAYOUT.gap + TOUR_LAYOUT.pad);
  });

  it('puts the card first when the step prefers the top', () => {
    const top = targetTopFor({ ...phone, targetHeight: 60, prefer: 'top' });
    const pairTop = (568 - (60 + TOUR_LAYOUT.gap + 309)) / 2;
    expect(top).toBe(pairTop + 309 + TOUR_LAYOUT.gap);
    expect(top + 60).toBeLessThanOrEqual(568 - TOUR_LAYOUT.pad);
  });

  it('shows the top of a target that cannot share the screen with its card', () => {
    expect(targetTopFor({ ...phone, targetHeight: 1073 })).toBe(TOUR_LAYOUT.pad + TOUR_LAYOUT.ring);
    // 222px is one pixel more than fits: 222 + 14 + 309 = 545 > 568 - 24.
    expect(targetTopFor({ ...phone, targetHeight: 222 })).toBe(TOUR_LAYOUT.pad + TOUR_LAYOUT.ring);
    expect(targetTopFor({ ...phone, targetHeight: 221 })).toBe(TOUR_LAYOUT.pad);
  });
});

describe('reachableTargetTop', () => {
  // Rewards on a 1280x800 screen: the custom-rewards form is the last section of the page.
  const lastSection = { viewportH: 800, cardHeight: 309, targetHeight: 334, prefer: 'bottom' as const, currentTop: 238 };
  const under = (800 - (334 + TOUR_LAYOUT.gap + 309)) / 2;
  const over = under + 309 + TOUR_LAYOUT.gap;

  it('keeps the preferred arrangement when the page can scroll that far', () => {
    expect(reachableTargetTop({ ...lastSection, canScrollUp: 654, canScrollDown: 400 })).toBe(under);
  });

  it('puts the card over the last section of a page, which cannot be raised to make room under it', () => {
    const top = reachableTargetTop({ ...lastSection, canScrollUp: 654, canScrollDown: 0 });
    expect(top).toBe(over);
    // Room for the card above the target, and the target still ends on screen.
    expect(top).toBeGreaterThanOrEqual(309 + TOUR_LAYOUT.gap + TOUR_LAYOUT.pad);
    expect(top + 334).toBeLessThanOrEqual(800 - TOUR_LAYOUT.pad);
  });

  it('puts the card under the first section of a page when the step would rather have it on top', () => {
    const first = { ...lastSection, prefer: 'top' as const, currentTop: 120 };
    expect(reachableTargetTop({ ...first, canScrollUp: 0, canScrollDown: 2000 })).toBe(under);
  });

  it('stays with the preferred arrangement when neither can be reached (a page shorter than the screen)', () => {
    expect(reachableTargetTop({ ...lastSection, canScrollUp: 0, canScrollDown: 0 })).toBe(under);
  });

  it('allows a pixel of rounding in how far the page can scroll', () => {
    const down = lastSection.currentTop - under;
    expect(reachableTargetTop({ ...lastSection, canScrollUp: 654, canScrollDown: down - 1 })).toBe(under);
    expect(reachableTargetTop({ ...lastSection, canScrollUp: 654, canScrollDown: down - 2 })).toBe(over);
  });

  it('has only one place for a target too tall to share the screen', () => {
    const tall = { ...lastSection, targetHeight: 900 };
    expect(reachableTargetTop({ ...tall, canScrollUp: 654, canScrollDown: 0 })).toBe(TOUR_LAYOUT.pad + TOUR_LAYOUT.ring);
  });
});

describe('scrollTargetTo', () => {
  const el = (top: number) => ({ getBoundingClientRect: () => box(top) }) as unknown as HTMLElement;
  const view = () => ({ scrollBy: vi.fn() }) as unknown as Window & { scrollBy: ReturnType<typeof vi.fn> };

  it('scrolls by the distance between where the target is and where it should be', () => {
    const win = view();
    scrollTargetTo(el(254), 92, false, win);
    expect(win.scrollBy).toHaveBeenCalledWith({ top: 162, behavior: 'instant' });
  });

  it('scrolls up when the target is above where it should be', () => {
    const win = view();
    scrollTargetTo(el(-400), 20, true, win);
    expect(win.scrollBy).toHaveBeenCalledWith({ top: -420, behavior: 'smooth' });
  });

  it('never leaves the choice to the page: "auto" would animate for someone who turned motion off', () => {
    const win = view();
    scrollTargetTo(el(300), 100, false, win);
    expect(win.scrollBy.mock.calls[0][0].behavior).toBe('instant');
  });

  it('does nothing when the target is already in place', () => {
    const win = view();
    scrollTargetTo(el(92.4), 92, true, win);
    expect(win.scrollBy).not.toHaveBeenCalled();
  });
});

describe('sameBox', () => {
  it('compares position and size', () => {
    expect(sameBox(box(10), box(10))).toBe(true);
    expect(sameBox(box(10), box(11))).toBe(false);
    expect(sameBox(box(10, 0, 100, 40), box(10, 0, 100, 41))).toBe(false);
    expect(sameBox(box(10, 0, 100, 40), box(10, 5, 100, 40))).toBe(false);
    expect(sameBox(box(10, 0, 100, 40), box(10, 0, 90, 40))).toBe(false);
  });
  it('treats two missing boxes as the same and a missing one as different', () => {
    expect(sameBox(null, null)).toBe(true);
    expect(sameBox(null, box(10))).toBe(false);
    expect(sameBox(box(10), null)).toBe(false);
  });
});
