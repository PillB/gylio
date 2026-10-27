import type React from 'react';
import type { ThemeTokens } from '../../../core/themes';

export const fieldControlStyle = (theme: ThemeTokens): React.CSSProperties => ({
  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.shape.radiusSm,
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
});

type ButtonTone = 'plain' | 'primary' | 'outlinePrimary' | 'outlineAccent' | 'danger';

const TONES: Record<ButtonTone, (theme: ThemeTokens) => React.CSSProperties> = {
  plain: (theme) => ({ border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.surface, color: theme.colors.text }),
  primary: (theme) => ({ border: `1px solid ${theme.colors.primary}`, backgroundColor: theme.colors.primary, color: theme.colors.primaryForeground }),
  outlinePrimary: (theme) => ({ border: `1px solid ${theme.colors.primary}`, backgroundColor: theme.colors.surface, color: theme.colors.text }),
  outlineAccent: (theme) => ({ border: `1px solid ${theme.colors.accent}`, backgroundColor: theme.colors.surface, color: theme.colors.text }),
  danger: (theme) => ({ border: `1px solid ${theme.colors.accent}`, backgroundColor: theme.colors.accent, color: theme.colors.background, fontWeight: 600 }),
};

/** Calendar buttons: small radius, xs vertical padding, one of a few colour tones. */
export const calendarButtonStyle = (
  theme: ThemeTokens,
  tone: ButtonTone = 'plain',
  overrides: React.CSSProperties = {}
): React.CSSProperties => ({
  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
  borderRadius: theme.shape.radiusSm,
  ...TONES[tone](theme),
  ...overrides,
});

export const panelStyle = (theme: ThemeTokens, padding: number = theme.spacing.sm): React.CSSProperties => ({
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.shape.radiusSm,
  padding: `${padding}px`,
  backgroundColor: theme.colors.surface,
});
