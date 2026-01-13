import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';

const ValidationSummary = ({ messages, id }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!messages.length) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      style={{
        border: `1px solid ${theme.colors.accent}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text
      }}
    >
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{t('validation.summaryHeading')}</p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: theme.colors.accent }}>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationSummary;
