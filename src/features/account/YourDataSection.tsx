/**
 * YourDataSection — Settings block: where your data is saved, save now,
 * download everything as a file, restore from a file, and undo a restore.
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { useAppAuth } from '../../core/context/AuthContext';
import { useAccountSync } from './AccountSyncContext';
import { applySnapshot, backupsFor, collectSnapshot, dropBackup, type Snapshot } from './accountSync';
import { buildDataFile, parseDataFile } from './dataFile';

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Tells other open tabs to reload so they don't write their stale copy back. */
function markReplaced() {
  try {
    localStorage.setItem('gylio:sync:replacedAt', new Date().toISOString());
  } catch {
    // storage full: this tab reloads anyway
  }
}

function useButtonStyle() {
  const { theme } = useTheme();
  return {
    minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull,
    border: `1.5px solid ${theme.colors.primary}`, background: 'transparent', color: theme.colors.primary,
    fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties;
}

function StatusLine() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { userId } = useAppAuth();
  const { status, lastSavedAt } = useAccountSync();
  const key = userId ? `account.status.${status}` : 'account.status.signedOut';
  const when = lastSavedAt ? new Date(lastSavedAt).toLocaleString(i18n.language) : '';
  return <p role="status" style={{ margin: 0, color: theme.colors.muted }}>{t(key, { when })}</p>;
}

function RestoreFromFile() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { userId } = useAppAuth();
  const button = useButtonStyle();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ exportedAt: string; data: Snapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    try {
      setPending(parseDataFile(await file.text()));
    } catch (e) {
      setError(t(`account.restore.error.${e instanceof Error ? e.message : 'not_gylio'}`));
    }
  };
  const confirm = () => {
    if (!pending) return;
    applySnapshot(localStorage, pending.data, new Date().toISOString(), userId);
    markReplaced();
    window.location.reload();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: theme.spacing.xs }}>
      <label htmlFor="gylio-restore-file" style={{ fontWeight: 600 }}>{t('account.restore.label')}</label>
      <input id="gylio-restore-file" ref={inputRef} type="file" accept="application/json,.json"
        onChange={(e) => void onFile(e.target.files?.[0])} style={{ minHeight: 44, width: '100%', maxWidth: '100%', minWidth: 0 }} />
      {error && <p role="alert" style={{ margin: 0, color: theme.colors.errorStrong }}>{error}</p>}
      {pending && (
        <div role="alertdialog" aria-labelledby="restore-confirm" style={{ display: 'grid', gap: theme.spacing.xs }}>
          <p id="restore-confirm" style={{ margin: 0 }}>
            {t('account.restore.confirm', { date: new Date(pending.exportedAt).toLocaleString(i18n.language), count: Object.keys(pending.data).length })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <button type="button" style={button} onClick={confirm}>{t('account.restore.replace')}</button>
            <button type="button" style={button} onClick={() => { setPending(null); if (inputRef.current) inputRef.current.value = ''; }}>
              {t('account.restore.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function YourDataSection() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { userId } = useAppAuth();
  const { saveNow, status } = useAccountSync();
  const button = useButtonStyle();
  // Only this person's own backups (or data made before anyone signed in), newest first.
  const backup = backupsFor(localStorage, userId)[0] ?? null;

  const download = () => {
    const stamp = new Date().toISOString();
    downloadText(`gylio-data-${stamp.slice(0, 10)}.json`, buildDataFile(collectSnapshot(localStorage), stamp));
  };
  const undo = () => {
    if (!backup) return;
    applySnapshot(localStorage, backup.data, new Date().toISOString(), userId);
    dropBackup(localStorage, backup.savedAt);
    markReplaced();
    window.location.reload();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: theme.spacing.md }}>
      <StatusLine />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {userId && <button type="button" style={button} onClick={() => void saveNow()} disabled={status === 'saving'}>{t('account.saveNow')}</button>}
        <button type="button" style={button} onClick={download}>{t('account.download')}</button>
        {backup && (
          <button type="button" style={button} onClick={undo}>
            {t('account.undoRestore', { date: new Date(backup.savedAt).toLocaleString(i18n.language) })}
          </button>
        )}
      </div>
      <RestoreFromFile />
    </div>
  );
}

export default YourDataSection;
