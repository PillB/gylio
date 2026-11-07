import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { ThemeTokens } from '../../../core/themes';
import { track, Events } from '../../../core/analytics';
import { LESSONS, SOURCES, findLesson, type ChoiceId, type PracticeLesson, type PracticeTurn } from '../data/lessons';
import { beginPractice, nextTurn, selectChoice, type PracticeState } from '../model/practice';

const FOCUS_MINUTES = [5, 10, 25, 45] as const;
type FocusMinutes = (typeof FOCUS_MINUTES)[number];

const panelStyle = (theme: ThemeTokens): React.CSSProperties => ({
  padding: theme.spacing.md,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.shape.radiusMd,
  backgroundColor: theme.colors.surface,
  color: theme.colors.text
});

const buttonStyle = (theme: ThemeTokens): React.CSSProperties => ({
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  minHeight: 44,
  borderRadius: theme.shape.radiusMd,
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
  cursor: 'pointer',
  textAlign: 'left'
});

/** Lesson selector: no skill is locked behind a prerequisite or premium subscription. */
function LessonPicker({ onStart }: { onStart: (lesson: PracticeLesson) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div style={{ display: 'grid', gap: theme.spacing.sm }}>
      <h3>{t('connectionLab.choose')}</h3>
      {LESSONS.map((lesson) => (
        <button
          type="button"
          key={lesson.id}
          onClick={() => onStart(lesson)}
          style={buttonStyle(theme)}
          title={t(`connectionLab.lessons.${lesson.id}.goal`)}
        >
          <strong>{t(`connectionLab.lessons.${lesson.id}.title`)}</strong>
          <span style={{ display: 'block', marginTop: 4, color: theme.colors.muted }}>
            {t(`connectionLab.lessons.${lesson.id}.goal`)}
          </span>
        </button>
      ))}
    </div>
  );
}

type TurnProps = {
  lesson: PracticeLesson;
  turn: PracticeTurn;
  practice: PracticeState;
  onChoose: (choice: ChoiceId) => void;
  onMove: (skip: boolean) => void;
};

/** Each choice branches to a *possible* response and behavioral feedback, not a predicted outcome. */
function TurnPanel({ lesson, turn, practice, onChoose, onMove }: TurnProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const base = `connectionLab.lessons.${lesson.id}.turns.${turn.id}`;
  const selected = practice.selected;
  return (
    <div style={panelStyle(theme)}>
      <p style={{ color: theme.colors.muted }}>
        {t('connectionLab.step', { current: practice.turnIndex + 1, total: lesson.turns.length })}
      </p>
      <h3>{t(`${base}.prompt`)}</h3>
      <p>{t('connectionLab.chooseResponse')}</p>
      <div style={{ display: 'grid', gap: theme.spacing.sm }}>
        {(Object.keys(turn.choices) as ChoiceId[]).map((id) => (
          <button
            type="button"
            key={id}
            disabled={selected !== null}
            aria-pressed={selected === id}
            onClick={() => onChoose(id)}
            style={{
              ...buttonStyle(theme),
              opacity: selected !== null && selected !== id ? 0.65 : 1,
              borderColor: selected === id ? theme.colors.primary : theme.colors.border
            }}
          >
            {t(`${base}.options.${id}.text`)}
          </button>
        ))}
      </div>
      {selected && (
        <div role="status" aria-live="polite" style={{ marginTop: theme.spacing.md }}>
          <h4>{t('connectionLab.possibleResponse')}</h4>
          <p>{t(`${base}.options.${selected}.response`)}</p>
          <p><strong>{t(`connectionLab.feedback.${turn.choices[selected]}`)}</strong></p>
          <p>{t(`${base}.tip`)}</p>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {selected && (
          <button type="button" onClick={() => onMove(false)} style={buttonStyle(theme)}>
            {t(practice.turnIndex === lesson.turns.length - 1 ? 'connectionLab.finish' : 'connectionLab.next')}
          </button>
        )}
        <button type="button" onClick={() => onMove(true)} style={buttonStyle(theme)}>
          {t('connectionLab.skip')}
        </button>
      </div>
    </div>
  );
}

function FinishedPanel({ lesson, practice, onRestart }: {
  lesson: PracticeLesson;
  practice: PracticeState;
  onRestart: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div role="status" style={panelStyle(theme)}>
      <h3>{t('connectionLab.finished')}</h3>
      <p>{t('connectionLab.practiced', { done: practice.practiced, total: lesson.turns.length })}</p>
      <p>{t(`connectionLab.lessons.${lesson.id}.transfer`)}</p>
      <button type="button" style={buttonStyle(theme)} onClick={onRestart}>{t('connectionLab.repeat')}</button>
    </div>
  );
}

type SessionProps = {
  lesson: PracticeLesson;
  practice: PracticeState;
  minutes: FocusMinutes;
  onMinutes: (duration: FocusMinutes) => void;
  onBack: () => void;
  onRestart: () => void;
  onChoose: (choice: ChoiceId) => void;
  onMove: (skip: boolean) => void;
};

function PracticeSession({ lesson, practice, minutes, onMinutes, onBack, onRestart, onChoose, onMove }: SessionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const base = `connectionLab.lessons.${lesson.id}`;
  const source = SOURCES[lesson.sourceId];
  return (
    <article style={{ display: 'grid', gap: theme.spacing.md }}>
      <button type="button" onClick={onBack} style={{ ...buttonStyle(theme), justifySelf: 'start' }}>
        {t('connectionLab.back')}
      </button>
      <div style={panelStyle(theme)}>
        <h3 style={{ marginTop: 0 }}>{t(`${base}.title`)}</h3>
        <p>{t(`${base}.goal`)}</p>
        <p style={{ color: theme.colors.muted }}>{t(`${base}.evidence`)}</p>
        <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary }}>
          {t('connectionLab.source')}: {source.title}
        </a>
      </div>
      <fieldset style={{ ...panelStyle(theme), minWidth: 0 }}>
        <legend>{t('connectionLab.timebox')}</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {FOCUS_MINUTES.map((duration) => (
            <button
              type="button"
              key={duration}
              aria-pressed={minutes === duration}
              onClick={() => onMinutes(duration)}
              style={{
                ...buttonStyle(theme),
                backgroundColor: minutes === duration ? theme.colors.primary : theme.colors.background,
                color: minutes === duration ? theme.colors.primaryForeground : theme.colors.text
              }}
            >
              {t('connectionLab.minutes', { count: duration })}
            </button>
          ))}
        </div>
        <p style={{ marginBottom: 0, color: theme.colors.muted }}>
          {t('connectionLab.timeboxHint', { count: minutes })}
        </p>
      </fieldset>
      {practice.finished ? (
        <FinishedPanel lesson={lesson} practice={practice} onRestart={onRestart} />
      ) : (
        <TurnPanel
          lesson={lesson}
          turn={lesson.turns[practice.turnIndex]}
          practice={practice}
          onChoose={onChoose}
          onMove={onMove}
        />
      )}
    </article>
  );
}

/** Controller: keeps only ephemeral practice state and non-identifying analytics. */
export default function ConnectionLabView() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [minutes, setMinutes] = useState<FocusMinutes>(5);
  const lesson = findLesson(lessonId ?? '');

  useEffect(() => { track(Events.CONNECTION_LAB_VIEWED); }, []);

  const start = (nextLesson: PracticeLesson) => {
    setLessonId(nextLesson.id);
    setPractice(beginPractice(nextLesson));
    setMinutes(nextLesson.minutes);
    track(Events.CONNECTION_LAB_STARTED, { lesson: nextLesson.id });
  };

  const choose = (choice: ChoiceId) => {
    if (!lesson || !practice) return;
    const next = selectChoice(practice, lesson, choice);
    if (next === practice) return;
    setPractice(next);
    track(Events.CONNECTION_LAB_CHOICE, { lesson: lesson.id, turn: practice.turnIndex });
  };

  const move = (skip: boolean) => {
    if (!lesson || !practice) return;
    const next = nextTurn(practice, lesson, skip);
    if (next === practice) return;
    setPractice(next);
    if (skip) track(Events.CONNECTION_LAB_SKIPPED, { lesson: lesson.id, turn: practice.turnIndex });
    if (next.finished) track(Events.CONNECTION_LAB_FINISHED, { lesson: lesson.id, practiced: next.practiced });
  };

  const returnToLessons = () => {
    setLessonId(null);
    setPractice(null);
  };

  return (
    <section aria-labelledby="connection-lab-title" style={{ display: 'grid', gap: theme.spacing.md, color: theme.colors.text }}>
      <header>
        <h2 id="connection-lab-title" style={{ margin: 0 }}>{t('connectionLab.title')}</h2>
        <p>{t('connectionLab.intro')}</p>
        <p style={{ color: theme.colors.muted }}>{t('connectionLab.privacy')}</p>
      </header>
      {lesson && practice ? (
        <PracticeSession
          lesson={lesson}
          practice={practice}
          minutes={minutes}
          onMinutes={setMinutes}
          onBack={returnToLessons}
          onRestart={() => start(lesson)}
          onChoose={choose}
          onMove={move}
        />
      ) : (
        <LessonPicker onStart={start} />
      )}
    </section>
  );
}
