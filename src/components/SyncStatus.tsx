/**
 * Sync status, in two places:
 *  - SyncStatusChip: a small, polite note that appears only while saved changes are waiting to reach the
 *    account (offline, a pause, sign-up not open). It waits a few seconds before appearing so a brief
 *    blip never flashes, can be hidden, shows no countdown and never uses an error colour.
 *  - SyncSettingsSection: the longer account of the same thing, with "try now".
 * All text goes through i18n (`sync.status.*`, `sync.detail.*`).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { useSync } from '../core/sync/SyncContext';
import { detailFor, noticeFor } from '../core/sync/status';

/** A value that only becomes visible once it has stayed the same for `ms`; it disappears at once. */
function useAfterQuiet<T>(value: T | null, ms: number): T | null {
  const [shown, setShown] = useState<T | null>(null);
  const key = value === null ? null : JSON.stringify(value);
  useEffect(() => {
    if (value === null) {
      setShown(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setShown(value), ms);
    return () => window.clearTimeout(timer);
    // `key` stands for the value's content, so a new object with the same content does not restart the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return value === null ? null : shown;
}

export const CHIP_DELAY_MS = 4000;

export function SyncStatusChip({ delayMs = CHIP_DELAY_MS }: { delayMs?: number }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { snapshot } = useSync();
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const notice = useAfterQuiet(snapshot ? noticeFor(snapshot) : null, delayMs);

  if (!notice || notice.messageKey === hiddenKey) return null;
  const { colors, spacing, shape } = theme;
  const attention = notice.tone === 'attention';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('sync.status.ariaLabel')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: shape.radiusMd,
        background: colors.surface,
        border: `1px solid ${attention ? colors.primary : colors.border}`,
        color: colors.text,
        fontSize: 14,
        lineHeight: 1.5,
        maxWidth: 600,
      }}
    >
      <span style={{ flex: '1 1 220px', minWidth: 0 }}>
        {t(notice.messageKey)}
        {notice.pending > 0 && <> {t('sync.status.pending', { count: notice.pending })}</>}
      </span>
      {!attention && (
        <button
          type="button"
          onClick={() => setHiddenKey(notice.messageKey)}
          style={{ minHeight: 44, minWidth: 44, background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 14 }}
        >
          {t('sync.status.dismiss')}
        </button>
      )}
    </div>
  );
}

export function SyncSettingsSection() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { snapshot, tryNow, retryRefused } = useSync();
  if (!snapshot) return null;
  const detail = detailFor(snapshot);
  const { colors, spacing } = theme;
  const button = {
    minHeight: 44,
    padding: `0 ${spacing.md}px`,
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${colors.primary}`,
    background: 'transparent',
    color: colors.primary,
    cursor: 'pointer',
    fontSize: 14,
  } as const;
  const when = detail.lastSyncedAt === null ? t('sync.detail.neverSynced') : t('sync.detail.lastSynced', { time: new Date(detail.lastSyncedAt).toLocaleString(i18n.language) });

  return (
    <section aria-labelledby="sync-settings-title" style={{ display: 'grid', gap: spacing.sm }}>
      <h3 id="sync-settings-title" style={{ margin: 0, fontSize: 16, color: colors.text }}>
        {t('sync.detail.title')}
      </h3>
      <p style={{ margin: 0, color: colors.text, fontSize: 14 }}>{t(detail.headlineKey)}</p>
      <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>{when}</p>
      {detail.pending > 0 && <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>{t('sync.status.pending', { count: detail.pending })}</p>}
      {snapshot.economy && <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>{t('sync.detail.economy')}</p>}
      {detail.refused > 0 && <p style={{ margin: 0, color: colors.text, fontSize: 14 }}>{t('sync.detail.refused', { count: detail.refused })}</p>}
      {detail.kept > 0 && <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>{t('sync.detail.kept', { count: detail.kept })}</p>}
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        {detail.canRetryNow && (
          <button type="button" style={button} onClick={tryNow}>
            {t('sync.detail.tryNow')}
          </button>
        )}
        {detail.refused > 0 && (
          <button type="button" style={button} onClick={retryRefused}>
            {t('sync.detail.tryRefused')}
          </button>
        )}
      </div>
    </section>
  );
}
