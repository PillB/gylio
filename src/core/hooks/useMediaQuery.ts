import { useCallback, useSyncExternalStore } from 'react';

const canMatch = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Whether a CSS media query matches now, re-read whenever the answer changes (a window resized, a tablet turned).
 * Reading `matchMedia(...).matches` once during render goes stale until something else redraws the component.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query]
  );
  const read = useCallback(() => canMatch() && window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, read, () => false);
}

export default useMediaQuery;
