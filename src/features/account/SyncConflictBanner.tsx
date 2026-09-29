/**
 * SyncConflictBanner — shown only when this device and the account both hold
 * different data. Nothing is overwritten until the person picks one; picking
 * the account copy keeps this device's data as an undoable backup.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { useAccountSync } from './AccountSyncContext';

export function SyncConflictBanner() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { status, conflict, chooseAccountCopy, chooseDeviceCopy } = useAccountSync();
  if (status !== 'conflict' || !conflict) return null;
  const button: React.CSSProperties = {
    minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull,
    border: `1.5px solid ${theme.colors.primary}`, background: 'transparent', color: theme.colors.primary, fontWeight: 600, cursor: 'pointer',
  };
  return (
    <section role="alert" aria-labelledby="sync-conflict-title" style={{
      display: 'grid', gap: theme.spacing.sm, padding: theme.spacing.md, marginBottom: theme.spacing.md,
      borderRadius: theme.shape.radiusLg, border: `1px solid ${theme.colors.borderStrong}`, background: theme.colors.surface,
    }}>
      <h2 id="sync-conflict-title" style={{ margin: 0, fontSize: '1.05rem' }}>{t('account.conflict.title')}</h2>
      <p style={{ margin: 0 }}>
        {t('account.conflict.body', { date: new Date(conflict.updatedAt).toLocaleString(i18n.language) })}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <button type="button" style={button} onClick={chooseAccountCopy}>{t('account.conflict.useAccount')}</button>
        <button type="button" style={button} onClick={() => void chooseDeviceCopy()}>{t('account.conflict.keepDevice')}</button>
      </div>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: theme.colors.muted }}>{t('account.conflict.undoHint')}</p>
    </section>
  );
}

export default SyncConflictBanner;
