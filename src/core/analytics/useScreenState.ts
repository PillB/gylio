import { useEffect, useRef } from 'react';
import { Events, track } from './index';

export type ListState = 'empty' | 'has_items';

/** What a list screen is showing once its data has loaded; null while it is still loading. */
export const listState = (loading: boolean, count: number): ListState | null => {
  if (loading) return null;
  return count > 0 ? 'has_items' : 'empty';
};

/**
 * Records which state of a screen a person was shown: once when it is known, and again only when it
 * changes. It is what lets the funnel tell someone who saw an empty Calendar and left from someone
 * who never opened it. `state` is null until the screen knows (its data is still loading).
 */
export function useScreenState(screen: string, state: string | null): void {
  // What was last sent. In development StrictMode runs each effect twice on mount; the ref is kept
  // between the two runs, so a screen that knows its state when it mounts is still counted once.
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const key = state === null ? null : `${screen}:${state}`;
    if (key === null || key === sent.current) return;
    sent.current = key;
    track(Events.SCREEN_STATE, { screen, state });
  }, [screen, state]);
}
