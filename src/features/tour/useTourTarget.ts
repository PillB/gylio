import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TourStep } from './tourSteps';
import { findTourTarget, reachableTargetTop, sameBox, scrollTargetTo, TOUR_LAYOUT } from './tourTarget';
import { naturalHeight } from './useCardHeight';

const SMOOTH_SCROLL_MS = 280;
const TAB_CHANGE_MS = 350;
// A tab that has just opened is still loading: sections above the target mount and change height.
// For this long after a target is shown, it is put back in place when the page shifts under it.
const SETTLE_WINDOW_MS = 2000;
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

export interface TourTarget {
  /** Where the highlighted element is on screen; null while the step has none on the page. */
  rect: DOMRect | null;
  /** Its `data-tour` name, which tells a stand-in (the Pro card, "Add details") from the step's own target. */
  name: string | null;
}

const NONE: TourTarget = { rect: null, name: null };

const viewportHeight = (): number => window.visualViewport?.height ?? window.innerHeight;

const measure = (el: HTMLElement): TourTarget => ({ rect: el.getBoundingClientRect(), name: el.getAttribute('data-tour') });

function bringIntoView(el: HTMLElement, step: TourStep, smooth: boolean, card: HTMLElement | null): void {
  const box = el.getBoundingClientRect();
  const top = reachableTargetTop({
    targetHeight: box.height,
    cardHeight: (card && naturalHeight(card)) || TOUR_LAYOUT.estimatedCardHeight,
    viewportH: viewportHeight(),
    prefer: step.placement,
    currentTop: box.top,
    canScrollUp: window.scrollY,
    canScrollDown: document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
  });
  scrollTargetTo(el, top, smooth);
}

interface PageWatch {
  /** The page scrolled or the window resized: the target is somewhere else on screen. */
  onMove: () => void;
  /** The page's content or height changed. At most once per frame. */
  onChange: () => void;
  /** The person scrolled, tapped or pressed a key: the page is theirs to position. */
  onTakeover: () => void;
}

function watchPage({ onMove, onChange, onTakeover }: PageWatch): () => void {
  let frame = 0;
  const queue = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };
  const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(queue);
  mutations?.observe(document.body, { childList: true, subtree: true });
  // Height changes with no nodes added or removed: a late font, an image, a section that expands.
  const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(queue);
  resizes?.observe(document.body);
  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('resize', onMove, { passive: true });
  // Visual Viewport API: fires when a phone's keyboard opens or closes.
  window.visualViewport?.addEventListener('resize', onMove);
  window.visualViewport?.addEventListener('scroll', onMove);
  TAKEOVER_EVENTS.forEach((type) => window.addEventListener(type, onTakeover, { passive: true, capture: true }));
  return () => {
    if (frame) cancelAnimationFrame(frame);
    mutations?.disconnect();
    resizes?.disconnect();
    window.removeEventListener('scroll', onMove);
    window.removeEventListener('resize', onMove);
    window.visualViewport?.removeEventListener('resize', onMove);
    window.visualViewport?.removeEventListener('scroll', onMove);
    TAKEOVER_EVENTS.forEach((type) => window.removeEventListener(type, onTakeover, { capture: true }));
  };
}

/**
 * Follows one step's target for as long as the step is showing: finds it, now or when the page
 * mounts it, scrolls it and its card into view, and keeps the reported box current while the
 * page scrolls, resizes or changes.
 */
function trackTarget(step: TourStep, smooth: boolean, cardRef: RefObject<HTMLElement | null>, report: (next: TourTarget) => void) {
  let stopped = false;
  let shownName: string | null = null;
  let settleUntil = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (run: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!stopped) run();
    }, ms);
    timers.add(id);
  };

  const show = (el: HTMLElement) => {
    shownName = el.getAttribute('data-tour');
    settleUntil = Date.now() + SETTLE_WINDOW_MS;
    bringIntoView(el, step, smooth, cardRef.current);
    later(() => {
      const settled = findTourTarget(step.target);
      report(settled ? measure(settled) : NONE);
    }, smooth ? SMOOTH_SCROLL_MS : 0);
  };

  /** The step's target if it is the one already shown; a different one (or a first one) is shown instead. */
  const current = (): HTMLElement | null => {
    const el = stopped ? null : findTourTarget(step.target);
    if (!el) return null;
    if (el.getAttribute('data-tour') === shownName) return el;
    // A different name means the spotlight has to move: the field behind "Add details" appeared
    // (or was hidden again).
    show(el);
    return null;
  };

  // The same target in a new place: only its box changes. The page is scrolled again only while
  // it is still settling and the person has not touched it, never under someone who is using it.
  const onMove = () => {
    const el = current();
    if (el) report(measure(el));
  };
  const onChange = () => {
    const el = current();
    if (!el) return;
    if (Date.now() < settleUntil) bringIntoView(el, step, smooth, cardRef.current);
    report(measure(el));
  };
  const onTakeover = () => {
    settleUntil = 0;
  };

  // A target that is not on the page yet (Budget mounts its sections after its data loads) is
  // picked up by `current` when the page changes.
  const locate = () => {
    const el = findTourTarget(step.target);
    if (el) show(el);
    else report(NONE);
  };

  const stopWatching = step.target ? watchPage({ onMove, onChange, onTakeover }) : undefined;

  return {
    locate,
    later,
    stop: () => {
      stopped = true;
      timers.forEach((id) => clearTimeout(id));
      stopWatching?.();
    },
  };
}

/**
 * The element the current tour step points at. Opens the step's tab first when the person is
 * somewhere else. `smooth` is false when motion is reduced or animations are off.
 */
export function useTourTarget(step: TourStep | null, smooth: boolean, cardRef: RefObject<HTMLElement | null>): TourTarget {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [found, setFound] = useState<TourTarget>(NONE);
  // The step that was last sent to its tab. A step is sent once. When the router answers by
  // sending the person somewhere else (signed out: every tab redirects to sign-in; setup not
  // finished: every tab redirects to it), asking again would bounce between the two pages for
  // ever. It also leaves someone who opens another tab mid-step where they chose to go.
  const sentFor = useRef<TourStep | null>(null);

  useEffect(() => {
    if (!step) {
      sentFor.current = null;
      setFound(NONE);
      return undefined;
    }
    const report = (next: TourTarget) =>
      setFound((previous) => (previous.name === next.name && sameBox(previous.rect, next.rect) ? previous : next));
    const tracker = trackTarget(step, smooth, cardRef, report);

    const tab = step.tab ? `/${step.tab}` : null;
    if (tab !== null && pathname !== tab && sentFor.current !== step) {
      sentFor.current = step;
      navigate(tab);
      // Arriving re-runs this effect; the timer covers a navigation that does not change the page.
      tracker.later(tracker.locate, smooth ? TAB_CHANGE_MS : 0);
    } else {
      tracker.locate();
    }

    return tracker.stop;
  }, [step, pathname, navigate, smooth, cardRef]);

  return found;
}
