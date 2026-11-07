import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';
import { LESSONS, SOURCES, findLesson, type ChoiceId, type PracticeLesson } from '../data/lessons';
import { beginPractice, nextTurn, selectChoice, type PracticeState } from '../model/practice';

const FOCUS_MINUTES = [5, 10, 25, 45] as const;
type FocusMinutes = (typeof FOCUS_MINUTES)[number];

/** View: deterministic offline role-play. The model owns state transitions. */
export default function ConnectionLabView() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [minutes, setMinutes] = useState<FocusMinutes>(5);
  const lesson = findLesson(lessonId ?? '');

  // Only non-identifying event metadata. No scenario responses or personal text.
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

  const base = lesson ? `connectionLab.lessons.${lesson.id}` : '';
  const turn = lesson?.turns[practice?.turnIndex ?? 0];
  const source = lesson ? SOURCES[lesson.sourceId] : null;
  const selected = practice?.selected;

  const panel = {
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.shape.radiusMd,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text
  };
  const action = {
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    minHeight: 44,
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    cursor: 'pointer' as const,
    textAlign: 'left' as const
  };

  return (
    <section aria-labelledby="connection-lab-title" style={{ display: 'grid', gap: theme.spacing.md, color: theme.colors.text }}>
      <header>
        <h2 id="connection-lab-title" style={{ margin: 0 }}>{t('connectionLab.title')}</h2>
        <p>{t('connectionLab.intro')}</p>
        <p style={{ color: theme.colors.muted }}>{t('connectionLab.privacy')}</p>
      </header>

      {!lesson || !practice ? (
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <h3>{t('connectionLab.choose')}</h3>
          {LESSONS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => start(item)}
              style={action}
              title={t(`connectionLab.lessons.${item.id}.goal`)}
            >
              <strong>{t(`connectionLab.lessons.${item.id}.title`)}</strong>
              <span style={{ display: 'block', marginTop: 4, color: theme.colors.muted }}>
                {t(`connectionLab.lessons.${item.id}.goal`)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <article style={{ display: 'grid', gap: theme.spacing.md }}>
          <button type="button" onClick={returnToLessons} style={{ ...action, justifySelf: 'start' }}>
            {t('connectionLab.back')}
          </button>
          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>{t(`${base}.title`)}</h3>
            <p>{t(`${base}.goal`)}</p>
            <p style={{ color: theme.colors.muted }}>{t(`${base}.evidence`)}</p>
            {source && (
              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary }}>
                {t('connectionLab.source')}: {source.title}
              </a>
            )}
          </div>
          <fieldset style={{ ...panel, minWidth: 0 }}>
            <legend>{t('connectionLab.timebox')}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {FOCUS_MINUTES.map((duration) => (
                <button
                  type="button"
                  key={duration}
                  aria-pressed={minutes === duration}
                  onClick={() => setMinutes(duration)}
                  style={{
                    ...action,
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
            <div role="status" style={panel}>
              <h3>{t('connectionLab.finished')}</h3>
              <p>{t('connectionLab.practiced', { done: practice.practiced, total: lesson.turns.length })}</p>
              <p>{t(`${base}.transfer`)}</p>
              <button type="button" style={action} onClick={() => start(lesson)}>{t('connectionLab.repeat')}</button>
            </div>
          ) : turn && (
            <div style={panel}>
              <p style={{ color: theme.colors.muted }}>
                {t('connectionLab.step', { current: practice.turnIndex + 1, total: lesson.turns.length })}
              </p>
              <h3>{t(`${base}.turns.${turn.id}.prompt`)}</h3>
              <p>{t('connectionLab.chooseResponse')}</p>
              <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                {(Object.keys(turn.choices) as ChoiceId[]).map((id) => (
                  <button
                    type="button"
                    key={id}
                    disabled={selected !== null}
                    aria-pressed={selected === id}
                    onClick={() => choose(id)}
                    style={{
                      ...action,
                      cursor: selected !== null ? 'default' : 'pointer',
                      opacity: selected !== null && selected !== id ? 0.65 : 1,
                      borderColor: selected === id ? theme.colors.primary : theme.colors.border
                    }}
                  >
                    {t(`${base}.turns.${turn.id}.options.${id}.text`)}
                  </button>
                ))}
              </div>
              {selected && (
                <div role="status" aria-live="polite" style={{ marginTop: theme.spacing.md }}>
                  <h4>{t('connectionLab.possibleResponse')}</h4>
                  <p>{t(`${base}.turns.${turn.id}.options.${selected}.response`)}</p>
                  <p><strong>{t(`connectionLab.feedback.${turn.choices[selected]}`)}</strong></p>
                  <p>{t(`${base}.turns.${turn.id}.tip`)}</p>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                {selected && (
                  <button type="button" onClick={() => move(false)} style={action}>
                    {t(practice.turnIndex === lesson.turns.length - 1 ? 'connectionLab.finish' : 'connectionLab.next')}
                  </button>
                )}
                <button type="button" onClick={() => move(true)} style={action}>
                  {t('connectionLab.skip')}
                </button>
              </div>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
