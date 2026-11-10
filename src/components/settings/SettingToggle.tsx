import React, { useId } from 'react';
import BudgetTooltip from '../atoms/BudgetTooltip';
import { useTheme } from '../../core/context/ThemeContext';

interface Props {
  /** Names the setting. It is the checkbox's visible label and its accessible name: the box itself says on or off. */
  label: string;
  helper?: string;
  tooltip?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Without its own border, for a switch that sits inside another setting's card. */
  bare?: boolean;
  dataTour?: string;
}

/**
 * One on/off setting. The label used to read "Enabled" or "Disabled" beside a box whose accessible
 * name was something else, with a "Current: Enabled" line repeating it a third time.
 */
export default function SettingToggle({ label, helper, tooltip, checked, onChange, bare = false, dataTour }: Props) {
  const { theme } = useTheme();
  const helperId = useId();
  const card: React.CSSProperties = bare
    ? {}
    : {
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: theme.spacing.md,
        background: theme.colors.surface,
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      };
  return (
    <div data-tour={dataTour} style={{ ...card, display: 'grid', gap: theme.spacing.xs }}>
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44, minWidth: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            aria-describedby={helper ? helperId : undefined}
            style={{ width: 20, height: 20, flexShrink: 0, accentColor: theme.colors.primary }}
          />
          <span style={{ fontWeight: 600 }}>{label}</span>
        </label>
        {tooltip ? <BudgetTooltip content={tooltip} /> : null}
      </div>
      {helper ? (
        <small id={helperId} style={{ color: theme.colors.muted }}>
          {helper}
        </small>
      ) : null}
    </div>
  );
}
