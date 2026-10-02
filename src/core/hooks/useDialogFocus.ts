import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusablesIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

/** Where Tab must land to stay inside `root`, or null when the browser's own move stays inside. */
function wrapTarget(root: HTMLElement, current: Element | null, backwards: boolean): HTMLElement | null {
  const items = focusablesIn(root);
  const first = items[0] ?? root;
  const last = items[items.length - 1] ?? root;
  const outside = current === root || !root.contains(current);
  if (outside || current === (backwards ? first : last)) return backwards ? last : first;
  return null;
}

/** Moves focus to `[data-autofocus]`, else the first focusable element inside `root`. */
const focusFirst = (root: HTMLElement): void => {
  (root.querySelector<HTMLElement>('[data-autofocus]') ?? focusablesIn(root)[0])?.focus();
};

/** True when `el` sits in another modal (a native <dialog>, WinCard) layered over `root`; that modal owns Tab. */
const inOtherModal = (root: HTMLElement, el: Element | null): boolean =>
  !!el && !root.contains(el) && !!el.closest('dialog[open], [aria-modal="true"]');

/**
 * Keyboard focus for a dialog. While `active`: moves focus inside `ref`
 * (to `[data-autofocus]`, else the first focusable element) and, whenever the
 * dialog has aria-modal="true", keeps Tab / Shift+Tab inside it. When `active`
 * turns false or the dialog unmounts, focus returns to the element that had it.
 *
 * `step` names what the dialog is showing (a tour's step index). When it changes
 * while the dialog is aria-modal="true" and focus is still outside it, for example
 * when a spotlight step hands over to a centred card, focus moves back in. The
 * element that had focus when the dialog opened is still the one restored.
 */
export default function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  step?: string | number,
): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return undefined;
    const opener = document.activeElement as HTMLElement | null;
    if (!root.contains(opener)) focusFirst(root);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || root.getAttribute('aria-modal') !== 'true') return;
      const current = document.activeElement;
      if (inOtherModal(root, current)) return;
      const target = wrapTarget(root, current, e.shiftKey);
      if (!target) return;
      target.focus();
      // Cancel the browser's own move only when ours happened: an inert target refuses focus.
      if (document.activeElement === target) e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [ref, active]);

  // A step change can turn a non-modal dialog modal while focus sits on the page behind it.
  useEffect(() => {
    const root = ref.current;
    if (!active || !root || root.getAttribute('aria-modal') !== 'true') return;
    const current = document.activeElement;
    if (root.contains(current) || inOtherModal(root, current)) return;
    focusFirst(root);
  }, [ref, active, step]);
}
