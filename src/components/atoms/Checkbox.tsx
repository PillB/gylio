import React from 'react';

export type CheckboxProps = {
  id?: string;
  label: string;
  helperText?: string;
  checked: boolean;
  ariaLabel?: string;
  onChange: (checked: boolean) => void;
};

const Checkbox: React.FC<CheckboxProps> = ({ id, label, helperText, checked, ariaLabel, onChange }) => (
  <label
    htmlFor={id}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '8px',
      minHeight: '44px',
      cursor: 'pointer',
    }}
  >
    <input
      id={id}
      type="checkbox"
      role="checkbox"
      aria-label={ariaLabel || label}
      aria-checked={checked}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      style={{
        width: '24px',
        height: '24px',
        minWidth: '24px',
        minHeight: '24px',
        cursor: 'pointer',
      }}
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '1rem', lineHeight: 1.3 }}>{label}</span>
      {helperText && (
        <span style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.3 }}>
          {helperText}
        </span>
      )}
    </div>
  </label>
);

export default Checkbox;
