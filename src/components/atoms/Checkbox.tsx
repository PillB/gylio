import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useAccessibility from '../../core/hooks/useAccessibility';
import { useTheme } from '../../core/context/ThemeContext';

export type CheckboxProps = {
  id?: string;
  label?: string;
  labelKey?: string;
  helperText?: string;
  helperTextKey?: string;
  checked: boolean;
  ariaLabel?: string;
  checkedAnnouncement?: string;
  uncheckedAnnouncement?: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

type IndicatorProps = {
  size?: number;
  color?: string;
  borderColor?: string;
};

export const UncheckedIndicator: React.FC<IndicatorProps> = ({ size = 22, borderColor }) => {
  const { theme } = useTheme();
  const stroke = borderColor ?? theme.colors.border;

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.shape.radiusSm,
        border: `2px solid ${stroke}`,
        boxSizing: 'border-box',
      }}
    />
  );
};

export const CheckedIndicator: React.FC<IndicatorProps> = ({ size = 22, color, borderColor }) => {
  const { theme } = useTheme();
  const fill = color ?? theme.colors.primary;
  const stroke = borderColor ?? theme.colors.primary;

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.shape.radiusSm,
        backgroundColor: fill,
        border: `2px solid ${stroke}`,
        boxSizing: 'border-box',
      }}
    >
      <svg
        width={size - 6}
        height={size - 6}
        viewBox="0 0 20 20"
        role="presentation"
        focusable="false"
        aria-hidden
      >
        <polyline
          points="4,11 8,15 16,5"
          fill="none"
          stroke={theme.mode === 'highContrast' ? theme.colors.background : '#fff'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  labelKey,
  helperText,
  helperTextKey,
  checked,
  ariaLabel,
  checkedAnnouncement,
  uncheckedAnnouncement,
  disabled = false,
  onChange
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { speak } = useAccessibility();

  const resolvedLabel = useMemo(
    () => (labelKey ? t(labelKey, label ?? labelKey) : label ?? ''),
    [label, labelKey, t]
  );

  const resolvedHelperText = useMemo(
    () => (helperTextKey ? t(helperTextKey, helperText ?? helperTextKey) : helperText),
    [helperText, helperTextKey, t]
  );

  const computedAriaLabel = useMemo(
    () => ariaLabel || t('checkbox.ariaLabel', { label: resolvedLabel }) || resolvedLabel,
    [ariaLabel, resolvedLabel, t]
  );

  const touchTarget = 44;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextChecked = event.target.checked;
      onChange(nextChecked);

      const announcement = nextChecked
        ? checkedAnnouncement ||
          t('checkbox.stateChange', {
            label: resolvedLabel,
            state: t('checkbox.checked')
          })
        : uncheckedAnnouncement ||
          t('checkbox.stateChange', {
            label: resolvedLabel,
            state: t('checkbox.unchecked')
          });

      void speak(announcement);
    },
    [checkedAnnouncement, onChange, resolvedLabel, speak, t, uncheckedAnnouncement]
  );

  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        minHeight: `${touchTarget}px`,
        minWidth: `${touchTarget}px`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        color: theme.colors.text,
        userSelect: 'none',
      }}
    >
      <input
        id={id}
        type="checkbox"
        role="checkbox"
        aria-label={computedAriaLabel}
        aria-checked={checked}
        disabled={disabled}
        checked={checked}
        onChange={handleChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />

      {checked ? <CheckedIndicator /> : <UncheckedIndicator />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto' }}>
        <span style={{ fontSize: '1rem', lineHeight: 1.3 }}>{resolvedLabel}</span>
        {resolvedHelperText && (
          <span style={{ fontSize: '0.9rem', color: theme.colors.muted, lineHeight: 1.3 }}>
            {resolvedHelperText}
          </span>
        )}
      </div>
    </label>
  );
};

export default Checkbox;
