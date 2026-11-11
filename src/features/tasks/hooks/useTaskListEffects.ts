import { useEffect, type RefObject } from 'react';
import { scrollBehavior } from '../../../core/accessibility/motion';

const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

const isPlainN = (event: KeyboardEvent) => event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey;

/** Pressing "n" anywhere outside a field jumps to the new-task title. */
export const useNewTaskShortcut = (titleRef: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || !isPlainN(event)) return;
      event.preventDefault();
      titleRef.current?.focus();
      titleRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [titleRef]);
};
