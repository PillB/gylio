/**
 * HelpLabel and HelpField — a form label with its help button beside it, not inside it.
 *
 * A help button inside a <label> breaks the field in two ways. Without htmlFor, the label names
 * the button (its first focusable child), so the input is read out with no name and a click on
 * the label text opens the help. With htmlFor, the button's name is added to the input's name
 * ("Title Information"). Keeping the button next to the label avoids both.
 */
import React, { useId } from 'react';
import { useTheme } from '../../core/context/ThemeContext';

type LabelProps = {
  htmlFor: string;
  /** The help button, usually a BudgetTooltip. */
  help?: React.ReactNode;
  children: React.ReactNode;
  /** Applied to the row; the label inherits font settings from it. */
  style?: React.CSSProperties;
};

export const HelpLabel: React.FC<LabelProps> = ({ htmlFor, help, children, style }) => (
  <span style={{ display: 'flex', alignItems: 'center', ...style }}>
    <label htmlFor={htmlFor}>{children}</label>
    {help}
  </span>
);

type FieldProps = {
  label: React.ReactNode;
  help?: React.ReactNode;
  /** Shown under the control and read out with it. */
  error?: string;
  /** Standing guidance shown under the control and read out after its name, not as part of it. */
  hint?: React.ReactNode;
  /** One form control. It gets an id (unless it has one), and the error as its description. */
  children: React.ReactElement;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
};

/** A control with its label, help button and validation message. */
const HelpField: React.FC<FieldProps> = ({ label, help, error, hint, children, style, labelStyle }) => {
  const { theme } = useTheme();
  const generatedId = useId();
  const childProps = children.props as { id?: string; style?: React.CSSProperties };
  const controlId = childProps.id ?? generatedId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const describedBy = [error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ');
  const control = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id: controlId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    // Inputs have a built-in width of about 20 characters and will not shrink below it unless told to,
    // which pushed fields out of their card on 320px phones. The control's own style still wins.
    style: { width: '100%', minWidth: 0, boxSizing: 'border-box', ...childProps.style },
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, ...style }}>
      <HelpLabel htmlFor={controlId} help={help} style={labelStyle}>
        {label}
      </HelpLabel>
      {control}
      {error ? (
        <span id={errorId} style={{ color: theme.colors.errorStrong }}>
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} style={{ color: theme.colors.muted }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export default HelpField;
