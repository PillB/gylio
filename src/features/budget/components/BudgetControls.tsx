import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { ThemeTokens } from '../../../core/themes';

// Shared building blocks for the Budget screen. Styles match the original
// single-file BudgetView so the split is visually identical.

export const fieldStyle = (theme: ThemeTokens): React.CSSProperties => ({
  width: '100%',
  padding: `${theme.spacing.sm}px`,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.shape.radiusSm,
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
  fontFamily: theme.typography.body.family,
});

export const stackStyle = (theme: ThemeTokens): React.CSSProperties => ({
  display: 'grid',
  gap: `${theme.spacing.sm}px`,
});

type FieldProps = {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
};

/** A label wrapping its control, with the inline validation message below it. */
export const BudgetField: React.FC<FieldProps> = ({ label, error, children }) => {
  const { theme } = useTheme();
  return (
    <label>
      {label}
      {children}
      {error ? <span style={{ color: theme.colors.accent }}>{error}</span> : null}
    </label>
  );
};

type InputProps = {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'number' | 'date';
};

export const BudgetInput: React.FC<InputProps> = ({ label, value, onChange, error, type = 'text' }) => {
  const { theme } = useTheme();
  return (
    <BudgetField label={label} error={error}>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={fieldStyle(theme)} />
    </BudgetField>
  );
};

type ButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
  fitContent?: boolean;
};

export const PrimaryButton: React.FC<ButtonProps> = ({ onClick, children, compact = false, fitContent = false }) => {
  const { theme } = useTheme();
  const padX = compact ? theme.spacing.sm : theme.spacing.md;
  const padY = compact ? theme.spacing.xs : theme.spacing.sm;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `${padY}px ${padX}px`,
        ...(fitContent ? { width: 'fit-content' } : {}),
        borderRadius: theme.shape.radiusSm,
        border: `1px solid ${theme.colors.primary}`,
        backgroundColor: theme.colors.primary,
        color: theme.colors.background,
        cursor: 'pointer',
        fontFamily: theme.typography.body.family,
      }}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ onClick, children, compact = false }) => {
  const { theme } = useTheme();
  const padX = compact ? theme.spacing.sm : theme.spacing.md;
  const padY = compact ? theme.spacing.xs : theme.spacing.sm;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `${padY}px ${padX}px`,
        borderRadius: theme.shape.radiusSm,
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        cursor: 'pointer',
        fontFamily: theme.typography.body.family,
      }}
    >
      {children}
    </button>
  );
};

type ToggleProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/** Pill used for picking one option from a small set (budget month, payoff strategy). */
export const ToggleButton: React.FC<ToggleProps> = ({ selected, onClick, children }) => {
  const { theme } = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusSm,
        border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
        backgroundColor: selected ? theme.colors.primary : theme.colors.background,
        color: selected ? theme.colors.background : theme.colors.text,
        cursor: 'pointer',
        fontFamily: theme.typography.body.family,
      }}
    >
      {children}
    </button>
  );
};

type RowListProps<T> = {
  items: T[];
  emptyText: string;
  getKey: (item: T, index: number) => React.Key;
  renderLabel: (item: T) => React.ReactNode;
  onRemove: (item: T, index: number) => void;
};

/** Plain list of saved entries, each with a Delete button; shows a hint when empty. */
export function RemovableRowList<T>({ items, emptyText, getKey, renderLabel, onRemove }: RowListProps<T>) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (!items.length) return <p>{emptyText}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((item, index) => (
        <li
          key={getKey(item, index)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${theme.spacing.xs}px 0`,
          }}
        >
          <span>{renderLabel(item)}</span>
          <SecondaryButton compact onClick={() => onRemove(item, index)}>
            {t('deleteLabel', 'Delete')}
          </SecondaryButton>
        </li>
      ))}
    </ul>
  );
}
