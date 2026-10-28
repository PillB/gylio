import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { controlStyle, primaryControlStyle, textInputStyle } from '../../tasks/components/taskStyles';
import { useTimeTracker } from '../TimeTrackerContext';
import { formatClock, formatMinutes, parseMinutes, secondsToMinutes } from '../trackedTime';

const STOPPED_VISIBLE_MS = 15_000;

const useBarStyles = () => {
  const { theme } = useTheme();
  return {
    theme,
    bar: {
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'grid',
      gap: theme.spacing.sm,
      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
      backgroundColor: theme.colors.surface,
      borderBottom: `2px solid ${theme.colors.primary}`,
      color: theme.colors.text,
      fontFamily: theme.typography.body.family,
    } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' } as React.CSSProperties,
  };
};

const AwayQuestion: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tracker = useTimeTracker();
  const { theme } = useTheme();
  if (tracker.attention.kind !== 'away' || !tracker.run) return null;
  const since = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }).format(new Date(tracker.attention.stopAt));
  const minutes = Math.round(tracker.attention.awaySeconds / 60);
  return (
    <div role="group" aria-live="polite" aria-label={t('timeTracker.awayAria')} style={{ display: 'grid', gap: theme.spacing.xs }}>
      <p style={{ margin: 0 }}>{t('timeTracker.awayQuestion', { since, minutes, title: tracker.run.title })}</p>
      <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <button type="button" style={primaryControlStyle(theme)} onClick={tracker.confirmStillWorking}>
          {t('timeTracker.awayKeep')}
        </button>
        <button type="button" style={controlStyle(theme)} onClick={() => void tracker.stopRemovingAway()}>
          {t('timeTracker.awayRemoveStop')}
        </button>
        <button type="button" style={controlStyle(theme)} onClick={() => void tracker.continueRemovingAway()}>
          {t('timeTracker.awayRemoveContinue')}
        </button>
      </div>
    </div>
  );
};

const OverQuestion: React.FC = () => {
  const { t } = useTranslation();
  const tracker = useTimeTracker();
  const { theme } = useTheme();
  if (tracker.attention.kind !== 'over' || !tracker.run) return null;
  const { estimateMin, elapsedSeconds } = tracker.attention;
  const elapsed = formatMinutes(Math.max(1, secondsToMinutes(elapsedSeconds)));
  const text = estimateMin
    ? t('timeTracker.overEstimate', { title: tracker.run.title, estimate: formatMinutes(estimateMin), elapsed })
    : t('timeTracker.overNoEstimate', { title: tracker.run.title, elapsed });
  return (
    <div role="group" aria-live="polite" aria-label={t('timeTracker.overAria')} style={{ display: 'grid', gap: theme.spacing.xs }}>
      <p style={{ margin: 0 }}>{text}</p>
      <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <button type="button" style={primaryControlStyle(theme)} onClick={tracker.keepGoing}>
          {t('timeTracker.overKeepGoing')}
        </button>
        <button type="button" style={controlStyle(theme)} onClick={() => void tracker.stop()}>
          {t('timeTracker.stop')}
        </button>
      </div>
    </div>
  );
};

const RunningBar: React.FC = () => {
  const { t } = useTranslation();
  const tracker = useTimeTracker();
  const { bar, row, theme } = useBarStyles();
  if (!tracker.run) return null;
  const clock = formatClock(tracker.elapsed);
  return (
    <section aria-label={t('timeTracker.barAria')} style={bar}>
      <div style={row}>
        <span aria-hidden="true">⏱</span>
        <time aria-label={t('timeTracker.elapsedAria', { clock })} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>
          {clock}
        </time>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracker.run.title}</span>
        <button type="button" style={primaryControlStyle(theme)} onClick={() => void tracker.stop()} aria-label={t('timeTracker.stopAria', { title: tracker.run.title })}>
          ⏹ {t('timeTracker.stop')}
        </button>
      </div>
      <AwayQuestion />
      <OverQuestion />
    </section>
  );
};

const FixMinutes: React.FC<{ initial: number; onDone: () => void }> = ({ initial, onDone }) => {
  const { t } = useTranslation();
  const tracker = useTimeTracker();
  const { theme } = useTheme();
  const [text, setText] = useState(String(initial));
  const minutes = parseMinutes(text);
  const save = () => {
    if (minutes === null) return;
    void tracker.setStoppedMinutes(minutes).then(onDone);
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <label htmlFor="fix-minutes">{t('timeTracker.fixLabel')}</label>
      <input id="fix-minutes" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={minutes === null} aria-describedby="fix-minutes-hint" style={textInputStyle(theme, { width: 96 })} />
      <button type="submit" style={primaryControlStyle(theme)} disabled={minutes === null}>
        {t('timeTracker.fixSave')}
      </button>
      <span id="fix-minutes-hint" style={{ color: theme.colors.muted, fontSize: '0.8rem' }}>
        {minutes === null ? t('timeTracker.fixInvalid') : t('timeTracker.fixHint')}
      </span>
    </form>
  );
};

/** After a stop: what was saved, with undo and a quick fix. Fades away on its own; stays while being fixed. */
const StoppedBar: React.FC = () => {
  const { t } = useTranslation();
  const tracker = useTimeTracker();
  const { bar, row, theme } = useBarStyles();
  const [fixing, setFixing] = useState(false);
  const { stopped, dismissStopped } = tracker;
  useEffect(() => {
    if (!stopped || fixing) return undefined;
    const id = setTimeout(dismissStopped, STOPPED_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [stopped, fixing, dismissStopped]);
  if (!stopped) return null;
  const minutes = Math.max(1, secondsToMinutes(stopped.entry.actualSeconds));
  return (
    <section role="status" aria-label={t('timeTracker.savedAria')} style={{ ...bar, borderBottomColor: theme.colors.success }}>
      <div style={row}>
        <span style={{ flex: 1, minWidth: 0 }}>{t('timeTracker.saved', { duration: formatMinutes(minutes), title: stopped.title })}</span>
        <button type="button" style={controlStyle(theme)} onClick={() => void tracker.undoStop()}>
          {t('timeTracker.undo')}
        </button>
        <button type="button" style={controlStyle(theme)} onClick={() => setFixing((v) => !v)} aria-expanded={fixing}>
          {t('timeTracker.fix')}
        </button>
        <button type="button" style={controlStyle(theme)} onClick={dismissStopped} aria-label={t('timeTracker.dismissAria')}>
          ✕
        </button>
      </div>
      {fixing ? <FixMinutes initial={minutes} onDone={() => setFixing(false)} /> : null}
    </section>
  );
};

/** Sticky strip at the top of every screen: the running timer, or the last stop. Renders nothing when idle. */
const TimeTrackerBar: React.FC = () => {
  const { run, stopped } = useTimeTracker();
  if (run) return <RunningBar />;
  return stopped ? <StoppedBar /> : null;
};

export default TimeTrackerBar;
