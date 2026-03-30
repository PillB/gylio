/**
 * BudgetTooltip — Accessible inline ⓘ icon with hover/focus tooltip.
 *
 * Renders as a small button so keyboard users can focus it.
 * Tooltip appears above the trigger via CSS transform.
 * All strings passed as props (caller uses t()).
 */
import React, { useState, useId } from 'react';
import { useTheme } from '../../core/context/ThemeContext';

type Props = {
  content: string;
  /** Position relative to trigger. Default: 'top'. */
  position?: 'top' | 'bottom';
};

export default function BudgetTooltip({ content, position = 'top' }: Props) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const id = useId();

  const popStyle: React.CSSProperties = {
    position: 'absolute',
    ...(position === 'top'
      ? { bottom: 'calc(100% + 6px)' }
      : { top: 'calc(100% + 6px)' }),
    left: '50%',
    transform: 'translateX(-50%)',
    width: 240,
    padding: '8px 10px',
    borderRadius: theme.shape.radiusMd,
    background: theme.colors.text,
    color: theme.colors.background,
    fontSize: 12,
    lineHeight: 1.55,
    fontFamily: theme.typography.body.family,
    zIndex: 9999,
    boxShadow: theme.shadow.md,
    pointerEvents: 'none',
    whiteSpace: 'normal',
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5 }}
    >
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${theme.colors.muted}`,
          background: 'transparent',
          color: theme.colors.muted,
          fontSize: 11,
          fontWeight: 700,
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
          fontFamily: theme.typography.body.family,
          lineHeight: 1,
        }}
        aria-label="Information"
      >
        i
      </button>
      {visible && (
        <span id={id} role="tooltip" style={popStyle}>
          {content}
        </span>
      )}
    </span>
  );
}
