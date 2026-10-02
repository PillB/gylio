import React from 'react';
import type { Subtask } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';
import { MAX_SUBTASKS } from '../utils/taskForm';
import { controlStyle } from './taskStyles';

type SubtaskEditorProps = {
  subtasks: Subtask[];
  onChange: (next: Subtask[]) => void;
  onTouch: () => void;
  label: string;
  helper: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  error?: string | null;
  theme: ThemeTokens;
  idPrefix: string;
  /** Help shown next to the legend. */
  tooltip?: React.ReactNode;
};

/** Editable list of micro-steps (up to MAX_SUBTASKS). */
const SubtaskEditor: React.FC<SubtaskEditorProps> = ({
  subtasks,
  onChange,
  onTouch,
  label,
  helper,
  placeholder,
  addLabel,
  removeLabel,
  error,
  theme,
  idPrefix,
  tooltip,
}) => {
  const update = (next: Subtask[]) => {
    onChange(next);
    onTouch();
  };
  return (
    <fieldset
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        margin: 0,
        // Fieldsets default to min-inline-size: min-content, which overflows 320px screens.
        minWidth: 0,
      }}
    >
      <legend style={{ padding: `0 ${theme.spacing.xs}px`, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {label}
        {tooltip}
      </legend>
      <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted }}>{helper}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.5rem' }}>
        {subtasks.map((subtask, index) => (
          <div key={`${idPrefix}-subtask-${index.toString()}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id={`${idPrefix}-subtask-${index.toString()}`}
              type="text"
              value={subtask.label}
              placeholder={placeholder}
              onChange={(event) =>
                update(subtasks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, label: event.target.value } : entry)))
              }
              style={controlStyle(theme, { flex: 1, minWidth: 0, padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`, backgroundColor: theme.colors.background })}
            />
            <button
              type="button"
              onClick={() => update(subtasks.filter((_, entryIndex) => entryIndex !== index))}
              aria-label={removeLabel}
              style={controlStyle(theme)}
            >
              {removeLabel}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          if (subtasks.length >= MAX_SUBTASKS) return;
          update([...subtasks, { label: '', done: false }]);
        }}
        style={controlStyle(theme, { marginTop: '0.5rem' })}
      >
        {addLabel}
      </button>
      {error ? <p style={{ margin: '0.5rem 0 0', color: theme.colors.accent }}>{error}</p> : null}
    </fieldset>
  );
};

export default SubtaskEditor;
