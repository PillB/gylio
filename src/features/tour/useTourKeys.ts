import { useEffect } from 'react';

const OWN_ARROWS = [
  'input:not([type="checkbox"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="tab"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
].join(', ');

/** True when the focused control uses the arrow keys itself: the caret in a text field, a select's options, a radio group. */
export const usesArrowKeys = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(OWN_ARROWS) !== null;

interface TourKeyActions {
  onPause: () => void;
  /** Left out on the last step. */
  onNext?: () => void;
  /** Left out on the first step. */
  onPrev?: () => void;
}

/**
 * Esc pauses the tour; the arrow keys move between steps. A "Try it" step asks the person to type
 * in the highlighted field, so arrows pressed inside a field (or with a modifier, such as the
 * browser's Alt+Left for Back) are left alone.
 */
export function useTourKeys(active: boolean, { onPause, onNext, onPrev }: TourKeyActions): void {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onPause();
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || usesArrowKeys(e.target)) return;
      const move = e.key === 'ArrowRight' ? onNext : e.key === 'ArrowLeft' ? onPrev : undefined;
      if (!move) return;
      e.preventDefault();
      move();
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [active, onPause, onNext, onPrev]);
}
