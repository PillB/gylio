import { useLayoutEffect, useState, type RefObject } from 'react';

/** Border-box height the card needs to show all of its content, even while a max-height clips it. */
export const naturalHeight = (el: HTMLElement): number => el.scrollHeight + el.offsetHeight - el.clientHeight;

/**
 * The tour card's real height, measured before paint each time its content changes and again
 * whenever the card resizes (a late font, a longer translation). Until the first measurement,
 * or where layout is not available, it is the estimate.
 */
export function useCardHeight(ref: RefObject<HTMLElement | null>, estimate: number, contentKey: string): number {
  const [measured, setMeasured] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const next = naturalHeight(el);
      if (next > 0) setMeasured((previous) => (previous !== null && Math.abs(previous - next) <= 1 ? previous : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, contentKey]);

  return measured ?? estimate;
}
