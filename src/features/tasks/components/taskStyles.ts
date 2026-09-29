import type React from 'react';
import type { ThemeTokens } from '../../../core/themes';

/** 44px-tall secondary control used across the Tasks screen. */
export const controlStyle = (theme: ThemeTokens, overrides: React.CSSProperties = {}): React.CSSProperties => ({
  minHeight: '44px',
  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
  borderRadius: theme.shape.radiusMd,
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.surface,
  color: theme.colors.text,
  fontFamily: theme.typography.body.family,
  ...overrides,
});

export const textInputStyle = (theme: ThemeTokens, overrides: React.CSSProperties = {}): React.CSSProperties => ({
  minHeight: '44px',
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  borderRadius: theme.shape.radiusMd,
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
  fontFamily: theme.typography.body.family,
  ...overrides,
});

export const primaryControlStyle = (theme: ThemeTokens, overrides: React.CSSProperties = {}): React.CSSProperties =>
  controlStyle(theme, {
    border: `1px solid ${theme.colors.primary}`,
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
    ...overrides,
  });
