import { useCallback, useRef, useState } from 'react';

export const UNDO_WINDOW_MS = 4500;

type Options = {
  remove: (id: number) => Promise<unknown>;
  /** Called once per delete with the undo callback, so the caller can offer it (e.g. in a toast). */
  offerUndo: (id: number, undo: () => void) => void;
};

const without = (set: Set<number>, id: number) => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

/**
 * Hides an item at once and only removes it for real after the undo window,
 * so a mistaken delete costs nothing. Leaving the screen does not cancel a
 * pending delete, matching what the toast already told the person.
 */
export const useDeferredDelete = ({ remove, offerUndo }: Options) => {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleDelete = useCallback(
    (id: number) => {
      setHiddenIds((prev) => new Set(prev).add(id));
      const timer = setTimeout(async () => {
        timers.current.delete(id);
        await remove(id);
        setHiddenIds((prev) => without(prev, id));
      }, UNDO_WINDOW_MS);
      timers.current.set(id, timer);
      offerUndo(id, () => {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setHiddenIds((prev) => without(prev, id));
      });
    },
    [offerUndo, remove]
  );

  return { hiddenIds, scheduleDelete };
};
