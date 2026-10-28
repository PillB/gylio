import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { controlStyle, primaryControlStyle, textInputStyle } from '../../tasks/components/taskStyles';
import { useTimeTracker } from '../TimeTrackerContext';
import { actualChoices, formatMinutes, parseMinutes, secondsToMinutes, trackedEntries, workedSeconds } from '../trackedTime';

type TaskLike = {
  id: number;
  title: string;
  status: string;
  estimateMin: number | null;
  timeLog: ReadonlyArray<{ type: string; actualSeconds: number; startedAt: string; endedAt: string }>;
};

/** Start or stop tracking this task, plus the running total against the estimate. */
export const TrackButton: React.FC<{ task: TaskLike }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tracker = useTimeTracker();
  const running = tracker.run?.taskId === task.id;
  const total = secondsToMinutes(workedSeconds(task.timeLog));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
      {running ? (
        <button type="button" style={primaryControlStyle(theme)} onClick={() => void tracker.stop()} aria-label={t('timeTracker.stopAria', { title: task.title })}>
          ⏹ {t('timeTracker.stop')}
        </button>
      ) : (
        <button type="button" style={controlStyle(theme)} onClick={() => void tracker.start(task)} aria-label={t('timeTracker.startAria', { title: task.title })}>
          ▶ {t('timeTracker.start')}
        </button>
      )}
      {total > 0 || task.estimateMin ? (
        <span style={{ fontSize: '0.8rem', color: theme.colors.muted }}>
          {total > 0 ? t('timeTracker.tracked', { duration: formatMinutes(total) }) : null}
          {total > 0 && task.estimateMin ? ' · ' : null}
          {task.estimateMin ? t('timeTracker.estimated', { duration: formatMinutes(task.estimateMin) }) : null}
        </span>
      ) : null}
    </div>
  );
};

const AddTime: React.FC<{ taskId: number }> = ({ taskId }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tracker = useTimeTracker();
  const [text, setText] = useState('');
  const minutes = parseMinutes(text);
  const invalid = text.trim() !== '' && minutes === null;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (minutes === null) return;
        void tracker.addManual(taskId, minutes).then(() => setText(''));
      }}
      style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <label htmlFor={`add-time-${taskId}`}>{t('timeTracker.addLabel')}</label>
      <input id={`add-time-${taskId}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="25, 1h30" aria-invalid={invalid} style={textInputStyle(theme, { width: 110 })} />
      <button type="submit" style={controlStyle(theme)} disabled={minutes === null}>
        {t('timeTracker.addSave')}
      </button>
      {invalid ? <span role="alert" style={{ color: theme.colors.accent }}>{t('timeTracker.fixInvalid')}</span> : null}
    </form>
  );
};

const EntryRow: React.FC<{ taskId: number; index: number; actualSeconds: number; startedAt: string }> = ({ taskId, index, actualSeconds, startedAt }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const tracker = useTimeTracker();
  const [text, setText] = useState(String(Math.max(1, secondsToMinutes(actualSeconds))));
  const minutes = parseMinutes(text);
  const when = new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(startedAt));
  return (
    <li style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: theme.colors.muted, fontSize: '0.8rem', minWidth: 110 }}>{when}</span>
      <label htmlFor={`entry-${taskId}-${index}`} style={{ position: 'absolute', left: -9999 }}>
        {t('timeTracker.entryLabel', { when })}
      </label>
      <input id={`entry-${taskId}-${index}`} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={minutes === null} style={textInputStyle(theme, { width: 90 })} />
      <button type="button" style={controlStyle(theme)} disabled={minutes === null} onClick={() => minutes !== null && void tracker.editEntry(taskId, index, minutes)}>
        {t('timeTracker.fixSave')}
      </button>
      <button type="button" style={controlStyle(theme)} onClick={() => void tracker.removeEntry(taskId, index)} aria-label={t('timeTracker.removeEntryAria', { when })}>
        {t('deleteLabel')}
      </button>
    </li>
  );
};

/** All recorded time for a task, each stretch fixable or removable, plus a way to add time that was never timed. */
export const TimeLogEditor: React.FC<{ task: TaskLike }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const entries = trackedEntries(task.timeLog);
  return (
    <details>
      <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', color: theme.colors.muted, fontSize: '0.8rem' }}>
        {t('timeTracker.logSummary', { count: entries.length })}
      </summary>
      <div style={{ display: 'grid', gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
        {entries.length === 0 ? <p style={{ margin: 0, color: theme.colors.muted }}>{t('timeTracker.logEmpty')}</p> : null}
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: theme.spacing.xs }}>
          {entries.map(({ index, entry }) => (
            <EntryRow key={`${entry.startedAt}-${index.toString()}-${entry.actualSeconds.toString()}`} taskId={task.id} index={index} actualSeconds={entry.actualSeconds} startedAt={entry.startedAt} />
          ))}
        </ul>
        <AddTime taskId={task.id} />
      </div>
    </details>
  );
};

const ANSWERED_KEY = 'gylio:actualAnswered';

const readAnswered = (): number[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ANSWERED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

const rememberAnswered = (taskId: number): void => {
  try {
    localStorage.setItem(ANSWERED_KEY, JSON.stringify([...readAnswered(), taskId].slice(-200)));
  } catch {
    /* Without storage the question may come back once; it never blocks anything. */
  }
};

/** One optional tap after finishing a task that had an estimate but no timed work: "about how long did it take?" */
export const ActualPrompt: React.FC<{ task: TaskLike }> = ({ task }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tracker = useTimeTracker();
  const [hidden, setHidden] = useState(() => readAnswered().includes(task.id));
  const needs = task.status === 'completed' && Boolean(task.estimateMin) && workedSeconds(task.timeLog) < 30;
  if (!needs || hidden || !task.estimateMin) return null;
  const done = () => {
    rememberAnswered(task.id);
    setHidden(true);
  };
  return (
    <div role="group" aria-label={t('timeTracker.actualAria', { title: task.title })} style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem' }}>{t('timeTracker.actualQuestion')}</span>
      {actualChoices(task.estimateMin).map((minutes) => (
        <button key={minutes} type="button" style={controlStyle(theme)} onClick={() => void tracker.addManual(task.id, minutes).then(done)}>
          {formatMinutes(minutes)}
        </button>
      ))}
      <button type="button" style={controlStyle(theme, { color: theme.colors.muted })} onClick={done}>
        {t('timeTracker.actualSkip')}
      </button>
    </div>
  );
};
