import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { readableTextOn } from '../../../core/themes';
import { track, Events } from '../../../core/analytics';

const toIsoOrNull = (date) => (date ? date.toISOString() : null);

/**
 * Computes freshness level from a Date object.
 * Returns: 'fresh' | 'review' | 'stale'
 */
function computeFreshness(lastDate) {
  if (!lastDate) return 'stale';
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMidnight = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate(),
  );
  const diffDays = Math.round(
    (todayMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 1) return 'fresh';
  if (diffDays <= 7) return 'review';
  return 'stale';
}

/**
 * Formats a Date for human display, preferring relative labels.
 */
function formatLastUpdated(date, t) {
  if (!date) return t('budget.freshness.never', 'Never');
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (todayMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return t('budget.freshness.today', 'Today');
  if (diffDays === 1) return t('budget.freshness.yesterday', 'Yesterday');
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const FRESHNESS_CONFIG = {
  fresh: {
    labelKey: 'budget.freshness.upToDate',
    labelFallback: 'Up to date',
    icon: '✅',
    pillKey: 'budget.freshness.pillFresh',
    pillFallback: 'Fresh',
    colorKey: 'success',
  },
  review: {
    labelKey: 'budget.freshness.reviewSuggested',
    labelFallback: 'Review suggested',
    icon: '🟡',
    pillKey: 'budget.freshness.pillReview',
    pillFallback: 'Review',
    colorKey: 'warning',
  },
  stale: {
    labelKey: 'budget.freshness.dataStale',
    labelFallback: 'Data may be stale',
    icon: '🔴',
    pillKey: 'budget.freshness.pillStale',
    pillFallback: 'Stale',
    colorKey: 'error',
  },
};

export default function DataFreshnessBanner({ lastTransactionDate, budgetMonthKey }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const freshness = useMemo(
    () => computeFreshness(lastTransactionDate),
    [lastTransactionDate],
  );

  const config = FRESHNESS_CONFIG[freshness];
  const label = t(config.labelKey, config.labelFallback);
  const pillLabel = t(config.pillKey, config.pillFallback);
  const lastUpdatedLabel = formatLastUpdated(lastTransactionDate, t);
  const colors = theme.colors ?? {};
  const spacing = theme.spacing ?? {};

  // Fire analytics when stale warning is shown
  const lastTransactionIso = toIsoOrNull(lastTransactionDate);
  useEffect(() => {
    if (freshness === 'stale') {
      track(Events.BUDGET_DATA_STALE_WARNING_SHOWN, { budgetMonthKey, lastTransactionDate: lastTransactionIso });
    }
  }, [freshness, budgetMonthKey, lastTransactionIso]);

  // Derive the tinted surface from the themed semantic colour so the banner
  // follows light, dark and high-contrast modes.
  const semantic = colors[config.colorKey];
  const borderColor = semantic;
  const accentColor = semantic;
  const bgColor = `color-mix(in srgb, ${semantic} 12%, ${colors.surface})`;
  const textColor = colors.text;

  return (
    <div
      role={freshness === 'stale' ? 'alert' : 'status'}
      aria-live={freshness === 'stale' ? 'assertive' : 'polite'}
      aria-label={`${t('budget.freshness.dataFreshnessLabel', 'Data freshness')}: ${label}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
        padding: `${spacing.md}px ${spacing.md}px`,
        borderRadius: theme.shape.radiusSm,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        marginBottom: spacing.md,
        boxShadow:
          freshness === 'stale'
            ? (theme.shadow?.sm ?? '0 1px 3px rgba(0,0,0,0.1)')
            : 'none',
      }}
    >
      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          {config.icon}
        </span>

        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            // Status hues are tuned for fills; *Strong variants are the AA text colours.
            color: colors[`${config.colorKey}Strong`],
            minWidth: 0,
            flex: 1,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </span>

        {/* Pill badge */}
        <span
          aria-hidden="true"
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 99,
            background: accentColor,
            color: readableTextOn(accentColor),
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {pillLabel}
        </span>
      </div>

      {/* Last updated row */}
      <div style={{ fontSize: 13, opacity: 0.85 }}>
        {t('budget.freshness.lastUpdated', 'Last updated')}:{' '}
        <strong>{lastUpdatedLabel}</strong>
      </div>

      {/* Stale-only help text */}
      {freshness === 'stale' && (
        <div
          style={{
            marginTop: spacing.xs,
            fontSize: 13,
            padding: `${spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            background: colors.surface,
          }}
        >
          {t(
            'budget.freshness.staleHelp',
            "Your transaction data hasn't been updated in over a week. Please review and add any missing entries.",
          )}
        </div>
      )}
    </div>
  );
}
