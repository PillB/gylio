/**
 * UpgradePrompt
 *
 * Shown in-place when a free user tries to access a premium feature.
 * Encourages starting the 10-day trial with a gentle, non-punitive CTA.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';

type Props = {
  featureName: string;
  compact?: boolean;
};

export const UpgradePrompt: React.FC<Props> = ({ featureName, compact = false }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusFull,
          backgroundColor: theme.colors.overlay,
          border: `1px solid ${theme.colors.primary}`,
        }}
      >
        <span style={{ fontSize: '0.75rem', color: theme.colors.primary, fontWeight: 600 }}>
          {t('upgrade.premiumBadge', '✦ Premium')}
        </span>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          style={{
            fontSize: '0.75rem',
            padding: `2px ${theme.spacing.xs}px`,
            borderRadius: theme.shape.radiusFull,
            background: theme.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('upgrade.tryFree', 'Try free')}
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t('upgrade.regionAria', 'Upgrade to access this feature')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.lg,
        padding: `${theme.spacing.xxl}px ${theme.spacing.xl}px`,
        borderRadius: theme.shape.radiusLg,
        background: `linear-gradient(135deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 100%)`,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow.md,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.shape.radiusFull,
          background: theme.colors.overlay,
          border: `2px solid ${theme.colors.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}
      >
        ✦
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: theme.typography.heading.family,
            fontWeight: theme.typography.heading.weight,
            color: theme.colors.text,
            fontSize: '1.125rem',
          }}
        >
          {t('upgrade.title', '{{feature}} is a premium feature', { feature: featureName })}
        </h3>
        <p style={{ margin: `${theme.spacing.sm}px 0 0`, color: theme.colors.muted, fontSize: '0.9375rem' }}>
          {t('upgrade.subtitle', 'Start your 10-day free trial — no credit card required.')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.xl}px`,
            borderRadius: theme.shape.radiusFull,
            background: theme.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            boxShadow: theme.shadow.md,
          }}
        >
          {t('upgrade.startTrial', 'Start 10-day free trial')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
            borderRadius: theme.shape.radiusFull,
            background: 'transparent',
            color: theme.colors.primary,
            border: `1.5px solid ${theme.colors.primary}`,
            fontWeight: 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
        >
          {t('upgrade.seePlans', 'See plans')}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: theme.colors.muted }}>
        {t('upgrade.pricing', '$12/month · or $10/month billed yearly')}
      </p>
    </div>
  );
};

export default UpgradePrompt;
