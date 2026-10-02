import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { readableTextOn } from '../../../core/themes';
import { track, Events } from '../../../core/analytics';

/**
 * Whole calendar days from a Date to today (0 for today), or null without a Date.
 */
function daysSince(date) {
  if (!date) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((todayMidnight.getTime() - dateMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Computes freshness level from a Date object.
 * Returns: 'fresh' | 'review' | 'stale'
 */
function computeFreshness(lastDate) {
  const diffDays = daysSince(lastDate);
  if (diffDays === null) return 'stale';

  if (diffDays <= 1) return 'fresh';
  if (diffDays <= 7) return 'review';
  return 'stale';
}

/**
 * How long a budget has been stale, in coarse buckets. Analytics events are kept in
 * localStorage, so they learn how stale the data was, never the date of a transaction.
 */
function staleBucket(lastDate) {
  const days = daysSince(lastDate);
  if (days === null) return 'never';
  if (days <= 30) return '8-30';
  if (days <= 90) return '31-90';
  return '90+';
}

/**
 * True when a budget period names a month other than the current local month.
 * The period is a text field (the app asks for YYYY-MM but only checks that it is not
 * empty), so text that is not a year and a month is not judged either way.
 */
function isOtherMonth(budgetMonthKey, now = new Date()) {
  const match = /^\s*(\d{4})-(\d{1,2})\s*$/.exec(budgetMonthKey ?? '');
  if (!match) return false;
  return Number(match[1]) !== now.getFullYear() || Number(match[2]) !== now.getMonth() + 1;
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

  // Freshness asks whether this month has been kept up to date. A closed month has
  // nothing left to add and a month that has not started has nothing to record yet,
  // so a budget for another month is not judged. Without a month key, or with a period
  // that is not a year and a month, the banner judges the dates it is given, as before.
  const otherMonth = isOtherMonth(budgetMonthKey);

  const freshness = useMemo(
    () => (otherMonth ? null : computeFreshness(lastTransactionDate)),
    [otherMonth, lastTransactionDate],
  );

  // Fire analytics when a stale warning is shown. The bucket triggers the effect, so a new
  // Date object for the same staleness does not record the warning again.
  const staleDays = freshness === 'stale' ? staleBucket(lastTransactionDate) : null;
  useEffect(() => {
    if (staleDays) track(Events.BUDGET_DATA_STALE_WARNING_SHOWN, { daysSinceLastTransaction: staleDays });
  }, [staleDays]);

  if (!freshness) return null;

  const config = FRESHNESS_CONFIG[freshness];
  const label = t(config.labelKey, config.labelFallback);
  const pillLabel = t(config.pillKey, config.pillFallback);
  const lastUpdatedLabel = formatLastUpdated(lastTransactionDate, t);
  const colors = theme.colors ?? {};
  const spacing = theme.spacing ?? {};

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
