/**
 * UpgradePrompt
 *
 * Shown in place when a free user opens a Pro feature. Where Pro can be bought it
 * offers the trial with a gentle, non-punitive CTA and the price from the same
 * catalogue as the pricing page. Where it can't (billing off: serverFeatures.ts)
 * it says so plainly and offers nothing to buy.
 *
 * Optional props:
 *   outcomes        – up to ~3 concrete benefits the user gains with Pro
 *   freeAlternative – what they can still do without upgrading (calm framing)
 *   onTryOnce       – when provided, surfaces a one-shot "try this once, free"
 *                     button; the token is stored in localStorage so it only
 *                     ever shows once per feature per browser.
 */
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { track, Events } from '../../core/analytics';
import { serverFeaturesEnabled } from '../../core/utils/serverFeatures';
import { FALLBACK_CATALOG } from '../billing/billingApi';
import { currencyForLocale, formatMoney } from '../billing/formatMoney';

// ── try-once token helpers ────────────────────────────────────────────────────

const TRY_ONCE_PREFIX = 'gylio:tryOnceUsed:';

function isTryOnceUsed(featureName: string): boolean {
  try {
    return localStorage.getItem(`${TRY_ONCE_PREFIX}${featureName}`) === 'true';
  } catch {
    return false;
  }
}

function markTryOnceUsed(featureName: string): void {
  try {
    localStorage.setItem(`${TRY_ONCE_PREFIX}${featureName}`, 'true');
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — fail silently,
    // never block the user action.
  }
}

// ── types ─────────────────────────────────────────────────────────────────────

type Props = {
  featureName: string;
  compact?: boolean;
  /** 2–3 concrete things the user gains with Pro (optional). */
  outcomes?: string[];
  /** What the user can still do without upgrading (optional, calm framing). */
  freeAlternative?: string;
  /** When provided a one-shot "try this once, free" button is shown. */
  onTryOnce?: () => void;
};

// ── component ─────────────────────────────────────────────────────────────────

export const UpgradePrompt: React.FC<Props> = ({
  featureName,
  compact = false,
  outcomes,
  freeAlternative,
  onTryOnce,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const tryOnceAvailable = onTryOnce !== undefined && !isTryOnceUsed(featureName);

  // ── analytics ──────────────────────────────────────────────────────────────

  useEffect(() => {
    track(Events.UPGRADE_PROMPT_VIEWED, {
      featureName,
      compact,
      hasOutcomes: Boolean(outcomes?.length),
      hasFreeAlternative: Boolean(freeAlternative),
      tryOnceAvailable,
      selling: serverFeaturesEnabled(),
    });
    // Only fire once per mount; featureName is the stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureName]);

  const handleUpgradeClick = useCallback(() => {
    track(Events.UPGRADE_CLICKED, { featureName, compact });
    navigate('/pricing');
  }, [featureName, compact, navigate]);

  const handleTryOnce = useCallback(() => {
    markTryOnceUsed(featureName);
    track(Events.TRY_ONCE_USED, { featureName });
    onTryOnce?.();
  }, [featureName, onTryOnce]);

  // ── shared sub-components ──────────────────────────────────────────────────

  const OutcomesList: React.FC = () => {
    if (!outcomes?.length) return null;
    return (
      <ul
        aria-label={t('upgrade.outcomesListAria', 'What you gain with Pro')}
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xs,
          width: '100%',
          textAlign: 'left',
        }}
      >
        {outcomes.map((outcome) => (
          <li
            key={outcome}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing.xs,
              fontSize: '0.875rem',
              color: theme.colors.muted,
            }}
          >
            <span aria-hidden="true" style={{ color: theme.colors.primary, flexShrink: 0, fontWeight: 700 }}>
              ✓
            </span>
            {outcome}
          </li>
        ))}
      </ul>
    );
  };

  const FreeAlternativeNote: React.FC = () => {
    if (!freeAlternative) return null;
    return (
      <p
        style={{
          margin: 0,
          fontSize: '0.8125rem',
          color: theme.colors.muted,
          fontStyle: 'italic',
        }}
      >
        {t('upgrade.freeAlternativePrefix', 'You can still')}{' '}
        {freeAlternative}
      </p>
    );
  };

  const TryOnceButton: React.FC = () => {
    if (!tryOnceAvailable) return null;
    return (
      <button
        type="button"
        onClick={handleTryOnce}
        aria-label={t('upgrade.tryOnceAria', 'Try this once, free — {{featureName}}', { featureName })}
        style={{
          padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
          borderRadius: theme.shape.radiusFull,
          background: 'transparent',
          color: theme.colors.primary,
          border: `1.5px solid ${theme.colors.primary}`,
          fontWeight: 600,
          fontSize: '0.9375rem',
          cursor: 'pointer',
        }}
      >
        {t('upgrade.tryOnce', 'Try this once, free')}
      </button>
    );
  };

  // ── compact variant ────────────────────────────────────────────────────────

  if (compact) {
    return (
      <div
        role="region"
        aria-label={t('upgrade.regionAria', 'Upgrade to access this feature')}
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusFull,
          backgroundColor: theme.colors.overlay,
          border: `1px solid ${theme.colors.primary}`,
        }}
      >
        {/* Badge */}
        <span
          style={{ fontSize: '0.75rem', color: theme.colors.primary, fontWeight: 600 }}
          aria-label={t('upgrade.premiumBadgeAria', 'Pro feature')}
        >
          {t('upgrade.premiumBadge', '✦ Pro')}
        </span>

        {/* First outcome as a one-liner hint */}
        {outcomes?.[0] && (
          <span style={{ fontSize: '0.75rem', color: theme.colors.muted }}>
            {outcomes[0]}
          </span>
        )}

        {/* Try-once (compact) */}
        {tryOnceAvailable && (
          <button
            type="button"
            onClick={handleTryOnce}
            aria-label={t('upgrade.tryOnceAria', 'Try this once, free — {{featureName}}', { featureName })}
            style={{
              fontSize: '0.75rem',
              padding: `2px ${theme.spacing.xs}px`,
              borderRadius: theme.shape.radiusFull,
              background: 'transparent',
              color: theme.colors.primary,
              border: `1px solid ${theme.colors.primary}`,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('upgrade.tryOnce', 'Try this once, free')}
          </button>
        )}

        <CompactUpgradeButton onUpgrade={handleUpgradeClick} />
      </div>
    );
  }

  // ── full variant ───────────────────────────────────────────────────────────

  return (
    <div
      role="region"
      data-tour="premium-gate"
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
        role="img"
        aria-label={t('upgrade.iconAria', 'Sparkles')}
      >
        ✦
      </div>

      {/* Heading + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, alignItems: 'center' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: theme.typography.heading.family,
            fontWeight: theme.typography.heading.weight,
            color: theme.colors.text,
            fontSize: '1.125rem',
          }}
        >
          {t('upgrade.title', '{{feature}} is part of Pro', { feature: featureName })}
        </h2>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.9375rem', lineHeight: 1.5 }}>
          <UpgradeSubtitle />
        </p>
      </div>

      {/* Contextual outcomes list */}
      {outcomes?.length ? (
        <div
          style={{
            width: '100%',
            background: theme.colors.surface,
            borderRadius: theme.shape.radiusLg,
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: `0 0 ${theme.spacing.xs}px 0`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: theme.colors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'left',
            }}
          >
            {t('upgrade.outcomesHeading', "What you'll be able to do")}
          </p>
          <OutcomesList />
        </div>
      ) : null}

      {/* Free alternative note */}
      <FreeAlternativeNote />

      {/* CTA row and price, only where Pro can be bought */}
      <UpgradeActions tryOnce={<TryOnceButton />} onUpgrade={handleUpgradeClick} />
    </div>
  );
};

/** The trial offer where Pro can be bought; otherwise that Pro isn't on sale yet (serverFeatures.ts). */
function UpgradeSubtitle() {
  const { t } = useTranslation();
  return <>{serverFeaturesEnabled() ? t('upgrade.subtitle', { days: FALLBACK_CATALOG.trialDays }) : t('upgrade.notOnSale')}</>;
}

/** The compact prompt's "Try free", only where Pro can be bought. */
function CompactUpgradeButton({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (!serverFeaturesEnabled()) return null;
  return (
    <button
      type="button"
      onClick={onUpgrade}
      style={{
        fontSize: '0.75rem',
        padding: `2px ${theme.spacing.xs}px`,
        borderRadius: theme.shape.radiusFull,
        background: theme.colors.primary,
        color: theme.colors.primaryForeground,
        border: 'none',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {t('upgrade.tryFree', 'Try free')}
    </button>
  );
}

/** Start the trial, see plans, and the price, from the same catalogue as the pricing page. Nothing where Pro can't be bought. */
function UpgradeActions({ tryOnce, onUpgrade }: { tryOnce: React.ReactNode; onUpgrade: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  if (!serverFeaturesEnabled()) return null;
  const currency = currencyForLocale(i18n.language);
  const monthly = FALLBACK_CATALOG.plans.find((plan) => plan.interval === 'month') ?? FALLBACK_CATALOG.plans[0];
  const yearly = FALLBACK_CATALOG.plans.find((plan) => plan.interval === 'year') ?? FALLBACK_CATALOG.plans[0];
  const money = (minor: number) => formatMoney(minor, currency, i18n.language);
  return (
    <>
      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        {tryOnce}
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.xl}px`,
            minHeight: '44px',
            borderRadius: theme.shape.radiusFull,
            background: theme.colors.primary,
            color: theme.colors.primaryForeground,
            border: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            boxShadow: theme.shadow.md,
            flex: '1 1 auto',
          }}
        >
          {t('upgrade.startTrial', { days: FALLBACK_CATALOG.trialDays })}
        </button>
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
            minHeight: '44px',
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
        {t('upgrade.price', { monthly: money(monthly.prices[currency]), yearly: money(yearly.prices[currency]) })}
      </p>
    </>
  );
}

// Used by PremiumGate in src/App.jsx, which passes each feature's outcomes and free alternative (PREMIUM_GATE_CONFIG).

export default UpgradePrompt;
