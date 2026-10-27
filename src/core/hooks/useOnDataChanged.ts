import { useEffect, useRef } from 'react';
import { onDataChanged } from '../dataEvents';

/**
 * Runs `reload` when rows changed behind the screen's back (a change from the account arrived, or another tab
 * saved). The screen should reload without a loading state and without moving the person's place.
 */
export function useOnDataChanged(reload: () => void) {
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => onDataChanged(() => latest.current()), []);
}
