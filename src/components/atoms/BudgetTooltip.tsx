/**
 * BudgetTooltip — Accessible inline ⓘ button with a help bubble.
 *
 * The bubble opens on hover, on keyboard focus and on tap (touch screens have
 * no hover), stays open while the pointer is over it, and closes on Escape,
 * on a second tap, or when focus or a tap moves elsewhere (WCAG 1.4.13).
 * The whole 44px box is the button, so it is easy to hit (WCAG 2.5.8).
 * The bubble is nudged back inside the screen on narrow phones.
 * All strings passed as props (caller uses t()).
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';

type Props = {
  content: string;
  /** Position relative to trigger. Default: 'top'. */
  position?: 'top' | 'bottom';
};

/** Space kept between the bubble and the edge of the screen. */
const EDGE = 8;

/** How far to slide a bubble sideways so it fits between the screen edges. */
export const clampShift = (left: number, right: number, viewportWidth: number): number => {
  if (right - left > viewportWidth - EDGE * 2) return EDGE - left;
  if (left < EDGE) return EDGE - left;
  if (right > viewportWidth - EDGE) return viewportWidth - EDGE - right;
  return 0;
};

/** Measures the open bubble and returns the sideways shift and side that keep it on screen. */
const useOnScreen = (open: boolean, preferred: 'top' | 'bottom') => {
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState({ shift: 0, side: preferred });

  useLayoutEffect(() => {
    if (!open) {
      setPlacement((current) => (current.shift === 0 && current.side === preferred ? current : { shift: 0, side: preferred }));
      return;
    }
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tooHigh = preferred === 'top' && rect.top < 0;
    const tooLow = preferred === 'bottom' && rect.bottom > window.innerHeight;
    setPlacement({
      shift: clampShift(rect.left, rect.right, window.innerWidth),
      side: tooHigh ? 'bottom' : tooLow ? 'top' : preferred,
    });
  }, [open, preferred]);

  return { bubbleRef, ...placement };
};

/** Closes the bubble on Escape and on a tap outside it. */
const useDismiss = (open: boolean, wrapperRef: React.RefObject<HTMLSpanElement>, close: () => void) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, wrapperRef, close]);
};

export default function BudgetTooltip({ content, position = 'top' }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setPinned(false);
  }, []);
  const { bubbleRef, shift, side } = useOnScreen(open, position);
  useDismiss(open, wrapperRef, close);

  const popStyle: React.CSSProperties = {
    position: 'absolute',
    ...(side === 'top' ? { bottom: '100%' } : { top: '100%' }),
    left: '50%',
    transform: `translateX(calc(-50% + ${shift}px))`,
    width: 'max-content',
    maxWidth: `min(240px, calc(100vw - ${EDGE * 2}px))`,
    padding: '8px 10px',
    borderRadius: theme.shape.radiusMd,
    background: theme.colors.text,
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.55,
    textAlign: 'left',
    fontFamily: theme.typography.body.family,
    zIndex: 9999,
    boxShadow: theme.shadow.md,
    whiteSpace: 'normal',
    ...(open ? {} : { display: 'none' }),
  };

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5, flexShrink: 0 }}
    >
      <button
        type="button"
        aria-describedby={id}
        aria-label={t('shell.information')}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onClick={() => {
          if (pinned) close();
          else {
            setOpen(true);
            setPinned(true);
          }
        }}
        style={{
          width: 44,
          height: 44,
          border: 'none',
          background: 'transparent',
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `1px solid ${theme.colors.muted}`,
            color: theme.colors.muted,
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: theme.typography.body.family,
            lineHeight: 1,
          }}
        >
          i
        </span>
      </button>
      <span ref={bubbleRef} id={id} role="tooltip" style={popStyle}>
        {content}
      </span>
    </span>
  );
}
