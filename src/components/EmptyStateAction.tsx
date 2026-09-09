/**
 * EmptyStateAction — compact, action-oriented empty-state UI.
 *
 * Keeps one clear next action visible without turning an empty screen into a
 * second onboarding flow. The component intentionally stays generic; product
 * copy and evidence claims belong to the feature using it.
 */

import React from 'react';
import { useTheme } from '../core/context/ThemeContext';

type Props = {
  emoji: string;
  headline: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  accentColor?: string;
};

export default function EmptyStateAction({
  emoji,
  headline,
  body,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  accentColor,
}: Props) {
  const { theme } = useTheme();
  const color = accentColor ?? theme.colors.primary;

  return (
    <div
      style={{
        textAlign: 'center',
        padding: `${theme.spacing.lg}px ${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusLg,
        background: `${color}08`,
        border: `1.5px dashed ${color}30`,
        fontFamily: theme.typography.body.family,
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 34, lineHeight: 1, marginBottom: theme.spacing.sm }}>
        {emoji}
      </div>
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.3,
          fontWeight: 700,
          color: theme.colors.text,
          fontFamily: theme.typography.heading.family,
          marginBottom: theme.spacing.xs,
        }}
      >
        {headline}
      </div>
      <p
        style={{
          fontSize: 13,
          color: theme.colors.muted,
          lineHeight: 1.45,
          margin: `0 0 ${theme.spacing.md}px`,
        }}
      >
        {body}
      </p>
      <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onCta}
          style={{
            minHeight: 44,
            padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusMd,
            background: color,
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.2,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          {ctaLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            style={{
              minHeight: 44,
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusMd,
              background: 'transparent',
              color: theme.colors.muted,
              border: `1px solid ${theme.colors.border}`,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: theme.typography.body.family,
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
