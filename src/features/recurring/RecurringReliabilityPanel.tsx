/**
 * RecurringReliabilityPanel
 *
 * Displays a reliability dashboard for recurring tasks:
 *  - Per-task rows: title | recurrence | last generated | next expected | failure badge
 *  - "Check now" and "Rebuild recurring instances" action buttons
 *  - Last-checked timestamp footer
 *  - Empty state when no recurring tasks exist
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { track, Events } from '../../core/analytics';
import type { ReliabilityState, RecurringTaskRow } from './useRecurringReliability';

// ---------------------------------------------------------------------------
// Column-header labels row (aria-hidden, purely visual)
// ---------------------------------------------------------------------------

function ColumnHeaders({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) repeat(3, minmax(0, auto))',
        gap: `0 ${theme.spacing.md}px`,
        padding: `0 ${theme.spacing.sm}px`,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: theme.colors.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '4px',
      }}
    >
      <span>{t('recurring.colTask', 'Task')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colLastGen', 'Last gen.')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colNextExp', 'Next exp.')}</span>
      <span style={{ textAlign: 'right' }}>{t('recurring.colFailures', 'Fails')}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single task row
// ---------------------------------------------------------------------------

interface RowProps {
  row: RecurringTaskRow;
  theme: ReturnType<typeof useTheme>['theme'];
}

function TaskRow({ row, theme }: RowProps) {
  const { t } = useTranslation();
  const hasFailures = row.meta.failureCount > 0;

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) repeat(3, minmax(0, auto))',
        gap: `0 ${theme.spacing.md}px`,
        alignItems: 'center',
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusSm,
        background: hasFailures ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.025)',
        marginBottom: `${theme.spacing.xs}px`,
        listStyle: 'none',
        minHeight: '40px',
      }}
    >
      {/* ── Title + recurrence chip ── */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${theme.spacing.xs}px`,
          overflow: 'hidden',
          color: theme.colors.text,
          fontWeight: 500,
          fontSize: '0.875rem',
        }}
        title={row.title}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.title}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: '0.68rem',
            fontWeight: 600,
            background: `${theme.colors.primary}22`,
            color: theme.colors.text,
            borderRadius: theme.shape.radiusSm,
            padding: '1px 6px',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
          }}
        >
          {row.recurrence}
        </span>
      </span>

      {/* ── Last generated date ── */}
      <span
        style={{ fontSize: '0.8rem', color: theme.colors.muted, whiteSpace: 'nowrap', textAlign: 'right' }}
        aria-label={`${t('recurring.lastGenerated', 'Last generated')}: ${row.meta.lastGeneratedDate ?? t('recurring.neverGenerated', 'Never')}`}
      >
        {row.meta.lastGeneratedDate ?? t('recurring.neverGenerated', 'Never')}
      </span>

      {/* ── Next expected date ── */}
      <span
        style={{ fontSize: '0.8rem', color: theme.colors.muted, whiteSpace: 'nowrap', textAlign: 'right' }}
        aria-label={`${t('recurring.nextExpected', 'Next expected')}: ${row.meta.nextExpectedDate ?? '—'}`}
      >
        {row.meta.nextExpectedDate ?? '—'}
      </span>

      {/* ── Failure badge or OK checkmark ── */}
      {hasFailures ? (
        <span
          role="status"
          aria-label={t('recurring.failureBadgeLabel', '{{count}} missed instances', { count: row.meta.failureCount })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.colors.error,
            color: theme.colors.onError,
            borderRadius: '999px',
            padding: '1px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            minWidth: '28px',
          }}
        >
          {row.meta.failureCount}×
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.successStrong,
            fontSize: '1rem',
            minWidth: '28px',
          }}
        >
          ✓
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Panel props — extends ReliabilityState with action callbacks
// ---------------------------------------------------------------------------

interface PanelProps extends ReliabilityState {
  onRepair: () => void;
  onManualCheck: () => void;
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export default function RecurringReliabilityPanel({
  rows,
  lastGlobalCheckAt,
  isChecking,
  isRepairing,
  onRepair,
  onManualCheck,
}: PanelProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const anyFailures = rows.some((r) => r.meta.failureCount > 0);

  const handleManualCheck = useCallback(() => {
    track(Events.RECURRING_MANUAL_CHECK_TRIGGERED, { trigger: 'panel_button' });
    onManualCheck();
  }, [onManualCheck]);

  const handleRepair = useCallback(() => {
    track(Events.RECURRING_REPAIRED, { trigger: 'panel_button' });
    onRepair();
  }, [onRepair]);

  const formattedCheckTime = lastGlobalCheckAt
    ? new Date(lastGlobalCheckAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <section
        aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
        style={{
          padding: `${theme.spacing.md}px`,
          color: theme.colors.muted,
          fontSize: '0.875rem',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        {t('recurring.noRecurringTasks', 'No recurring tasks configured.')}
      </section>
    );
  }

  // ── Full dashboard ───────────────────────────────────────────────────────
  return (
    <section
      aria-label={t('recurring.panelTitle', 'Recurring task reliability')}
      style={{ padding: `${theme.spacing.sm}px 0` }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: `${theme.spacing.xs}px`,
          marginBottom: `${theme.spacing.sm}px`,
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: theme.colors.text }}>
          {t('recurring.panelTitle', 'Recurring task reliability')}
          {anyFailures && (
            <span
              aria-hidden="true"
              style={{
                marginLeft: `${theme.spacing.xs}px`,
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: theme.colors.error,
                verticalAlign: 'middle',
              }}
            />
          )}
        </h3>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            aria-busy={isChecking}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              background: 'transparent',
              color: theme.colors.text,
              cursor: isChecking ? 'wait' : 'pointer',
              fontSize: '0.8rem',
              fontFamily: theme.typography.body.family,
              opacity: isChecking ? 0.6 : 1,
            }}
          >
            {isChecking
              ? t('recurring.checking', 'Checking…')
              : t('recurring.checkNow', 'Check now')}
          </button>

          {anyFailures && (
            <button
              type="button"
              onClick={handleRepair}
              disabled={isRepairing}
              aria-busy={isRepairing}
              style={{
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.primary}`,
                background: `${theme.colors.primary}12`,
                color: theme.colors.primary,
                cursor: isRepairing ? 'wait' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: theme.typography.body.family,
                opacity: isRepairing ? 0.6 : 1,
              }}
            >
              {isRepairing
                ? t('recurring.repairing', 'Rebuilding…')
                : t('recurring.repair', 'Rebuild recurring instances')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <ColumnHeaders theme={theme} />
      <ul style={{ margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <TaskRow key={row.id} row={row} theme={theme} />
        ))}
      </ul>

      {/* Footer: last-checked timestamp */}
      {formattedCheckTime && (
        <p
          style={{
            margin: `${theme.spacing.sm}px 0 0`,
            fontSize: '0.75rem',
            color: theme.colors.muted,
            textAlign: 'right',
          }}
        >
          {t('recurring.lastChecked', 'Last checked at {{time}}', { time: formattedCheckTime })}
        </p>
      )}
    </section>
  );
}
