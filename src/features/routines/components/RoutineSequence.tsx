import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';

type RoutineStep = { label: string; done: boolean };

type RoutineSequenceProps = {
  routineTitle: string;
  steps: RoutineStep[];
  anchorHabit?: string | null;
  theme: ThemeTokens;
};

export type SequenceItem = { key: string; label: string; done: boolean; anchor: boolean };

/** The habit the routine is stacked onto, then every step that has a name, in order. */
export function sequenceItems(steps: RoutineStep[], anchorHabit?: string | null): SequenceItem[] {
  const named = steps
    .map((step, index) => ({ key: `step-${index}`, label: step.label.trim(), done: step.done, anchor: false }))
    .filter((step) => step.label.length > 0);
  const anchor = anchorHabit?.trim();
  return anchor ? [{ key: 'anchor', label: anchor, done: false, anchor: true }, ...named] : named;
}

const hidden: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

/**
 * The order of a routine as a chain of boxes: the habit it follows, then each step. It is plain markup, an ordered
 * list a screen reader can read, with nothing to load and nothing that moves. (It was a graph library's canvas: that
 * drew off-centre when the section opened, hid a link from screen readers that the keyboard could still reach, and
 * made up about 40% of the app's download for a list that never branches.)
 */
export function RoutineSequence({ routineTitle, steps, anchorHabit, theme }: RoutineSequenceProps) {
  const { t } = useTranslation();
  const items = sequenceItems(steps, anchorHabit);
  if (items.filter((item) => !item.anchor).length < 2) return null;

  const box = (item: SequenceItem): React.CSSProperties => ({
    boxSizing: 'border-box',
    width: 'min(100%, 280px)',
    padding: '10px 12px',
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${item.done ? theme.colors.success : item.anchor ? theme.colors.primary : theme.colors.borderStrong}`,
    background: item.anchor ? theme.colors.overlay : theme.colors.surfaceElevated,
    color: item.done ? theme.colors.muted : theme.colors.text,
    textDecoration: item.done ? 'line-through' : 'none',
    fontSize: '0.875rem',
    lineHeight: 1.35,
    overflowWrap: 'anywhere',
  });

  return (
    <details style={{ marginTop: theme.spacing.sm, borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.sm }}>
      <summary
        style={{
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          color: theme.colors.primary,
          cursor: 'pointer',
          fontWeight: 600,
          fontFamily: theme.typography.body.family,
        }}
      >
        {t('routines.sequenceLabel')}
      </summary>
      <ol
        aria-label={t('routines.sequenceAria', { title: routineTitle })}
        style={{ listStyle: 'none', margin: `${theme.spacing.xs}px 0 ${theme.spacing.sm}px`, padding: 0, fontFamily: theme.typography.body.family }}
      >
        {items.map((item, index) => (
          <li key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {index > 0 && (
              <span aria-hidden="true" style={{ width: 'min(100%, 280px)', textAlign: 'center', color: theme.colors.muted, lineHeight: 1.6 }}>
                ↓
              </span>
            )}
            <span style={box(item)}>
              {item.label}
              {item.done && <span style={hidden}> ({t('routines.doneBadge')})</span>}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default RoutineSequence;
