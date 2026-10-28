import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import useDB from '../core/hooks/useDB';
import { requestBackgroundSync } from '../core/utils/backgroundSync';
import { enqueueSyncAction, listSyncConflicts, removeSyncConflict } from '../core/utils/offlineSync';

const normalizeSubtasks = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return { label: entry, done: false };
      if (entry && typeof entry === 'object') {
        const label = typeof entry.label === 'string' ? entry.label : '';
        if (!label) return null;
        return { label, done: Boolean(entry.done) };
      }
      return null;
    })
    .filter(Boolean);
};

/** What to store locally for the server's copy of each kind of record. */
const REMOTE_FIELDS = {
  task: (remote) => ({
    title: String(remote.title ?? ''),
    status: String(remote.status ?? 'pending'),
    subtasks: normalizeSubtasks(remote.subtasks),
    plannedDate: remote.plannedDate ?? null,
    calendarEventId: remote.calendarEventId ?? null,
    focusPresetMinutes: remote.focusPresetMinutes ?? null,
  }),
  event: (remote) => ({
    title: String(remote.title ?? ''),
    description: remote.description ?? null,
    startDate: String(remote.startDate ?? ''),
    endDate: remote.endDate ?? null,
    location: remote.location ?? null,
    taskId: remote.taskId ?? null,
    reminderMinutesBefore: remote.reminderMinutesBefore ?? null,
  }),
  transaction: (remote) => ({
    budgetMonth: String(remote.budgetMonth ?? ''),
    amount: Number(remote.amount ?? 0),
    categoryName: String(remote.categoryName ?? ''),
    isNeed: Boolean(remote.isNeed),
    date: String(remote.date ?? ''),
    note: remote.note ?? null,
  }),
};

/**
 * The review list for the older offline queue (src/core/utils/offlineSync.ts). It exists only in builds that
 * talk to a separate API origin (see legacySyncEnabled); builds with account sync use SyncSettingsSection.
 */
const LegacySyncReview = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { updateTask, deleteTask, updateEvent, deleteEvent, updateTransaction, deleteTransaction } = useDB();
  const [syncConflicts, setSyncConflicts] = useState([]);
  const [isResolving, setIsResolving] = useState(null);

  const loadSyncConflicts = useCallback(() => {
    listSyncConflicts()
      .then((entries) => setSyncConflicts(entries))
      .catch((error) => {
        console.warn('Unable to load sync conflicts', error);
      });
  }, []);

  useEffect(() => {
    loadSyncConflicts();
    const intervalId = window.setInterval(loadSyncConflicts, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadSyncConflicts]);

  const syncEntityLabels = useMemo(
    () => ({
      task: t('sync.entity.task'),
      event: t('sync.entity.event'),
      transaction: t('sync.entity.transaction')
    }),
    [t]
  );

  const applyRemoteConflict = useCallback(
    async (conflict) => {
      const remote = conflict.remoteData ?? null;
      const entityId = Number(remote?.id ?? conflict.localData?.id);
      const actions = { task: { update: updateTask, remove: deleteTask }, event: { update: updateEvent, remove: deleteEvent }, transaction: { update: updateTransaction, remove: deleteTransaction } }[conflict.entityType];
      if (!Number.isFinite(entityId) || !actions) return;
      if (!remote) await actions.remove(entityId, { skipSync: true });
      else await actions.update(entityId, REMOTE_FIELDS[conflict.entityType](remote), { skipSync: true });
    },
    [deleteEvent, deleteTask, deleteTransaction, updateEvent, updateTask, updateTransaction]
  );

  const handleResolveConflict = useCallback(
    async (conflict, resolution) => {
      setIsResolving(conflict.id);
      try {
        if (resolution === 'local') {
          await enqueueSyncAction({
            entityType: conflict.entityType,
            action: conflict.action,
            payload: conflict.localData ?? {},
            clientUpdatedAt: new Date().toISOString(),
          });
          await requestBackgroundSync();
        } else {
          await applyRemoteConflict(conflict);
        }
        await removeSyncConflict(conflict.id);
        loadSyncConflicts();
      } catch (error) {
        console.warn('Failed to resolve conflict', error);
      } finally {
        setIsResolving(null);
      }
    },
    [applyRemoteConflict, loadSyncConflicts]
  );

  return (
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{t('sync.reviewTitle')}</p>
              <small style={{ color: theme.colors.muted }}>{t('sync.reviewHelper')}</small>
            </div>
          </div>
          <div style={{ display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {syncConflicts.length === 0 ? (
              <p style={{ margin: 0, color: theme.colors.muted }}>{t('sync.reviewEmpty')}</p>
            ) : (
              syncConflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: theme.spacing.sm,
                    background: theme.colors.background
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {t('sync.reviewConflictLabel', {
                      entity: syncEntityLabels[conflict.entityType] ?? conflict.entityType
                    })}
                  </p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('sync.reviewDetected', {
                      timestamp: new Date(conflict.detectedAt).toLocaleString()
                    })}
                  </small>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(conflict, 'local')}
                      disabled={isResolving === conflict.id}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('sync.reviewKeepLocal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveConflict(conflict, 'remote')}
                      disabled={isResolving === conflict.id}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        background: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('sync.reviewUseRemote')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
  );
};

export default LegacySyncReview;
