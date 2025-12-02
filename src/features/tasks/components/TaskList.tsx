import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import useAccessibility from '../../../core/hooks/useAccessibility';
import { useTheme } from '../../../core/context/ThemeContext';
import useTasks from '../hooks/useTasks';

const chunkTasks = (items: ReturnType<typeof useTasks>['tasks']) => {
  const MAX = 7;
  const MIN = 3;
  const chunks: typeof items[] = [];
  let index = 0;

  while (index < items.length) {
    const remaining = items.length - index;

    if (remaining < MIN && chunks.length) {
      chunks[chunks.length - 1].push(...items.slice(index));
      break;
    }

    let size = Math.min(MAX, remaining);
    if (remaining - size < MIN && remaining > size) {
      size = Math.max(MIN, Math.ceil(remaining / 2));
    }

    chunks.push(items.slice(index, index + size));
    index += size;
  }

  return chunks.length ? chunks : [items];
};

const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const { speak } = useAccessibility();
  const { tasks, loading, toggleTaskStatus, addTask, startPomodoro } = useTasks();
  const { theme } = useTheme();
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);

  const chunks = useMemo(() => chunkTasks(tasks), [tasks]);

  const handleStartFocus = useCallback(() => {
    startPomodoro({ durationMinutes: selectedDuration });
  }, [selectedDuration, startPomodoro]);

  const handleAddTask = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedTitle = newTaskTitle.trim();
      const errors: string[] = [];

      if (!trimmedTitle) {
        errors.push(t('validation.titleRequired'));
      }
      if (selectedDuration <= 0) {
        errors.push(t('validation.durationPositive'));
      }

      setTitleTouched(true);

      if (errors.length) {
        setFormErrors(errors.join(' '));
        return;
      }

      const created = await addTask(trimmedTitle, selectedDuration);
      if (created) {
        setNewTaskTitle('');
        setFormErrors(null);
        setTitleTouched(false);
      }
    },
    [addTask, newTaskTitle, selectedDuration, t]
  );

  const focusButtonStyle: React.CSSProperties = useMemo(
    () => ({
      minHeight: '44px',
      minWidth: '72px',
      padding: '0.75rem 1rem',
      borderRadius: theme.shape.radiusMd,
      border: `1px solid ${theme.colors.border}`,
      backgroundColor: theme.colors.surface,
      cursor: 'pointer',
      fontSize: '1rem',
      color: theme.colors.text,
      fontFamily: theme.typography.body.family,
    }),
    [theme]
  );

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description') || ''}
    >
      <form
        onSubmit={handleAddTask}
        style={{ marginBottom: '1rem', display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}
      >
        <label htmlFor="new-task" style={{ display: 'none' }}>
          {t('addTask')}
        </label>
        <input
          id="new-task"
          type="text"
          value={newTaskTitle}
          onChange={(event) => {
            setNewTaskTitle(event.target.value);
            setTitleTouched(true);
            setFormErrors(null);
          }}
          placeholder={t('taskPlaceholder')}
          style={{
            flex: '1 1 240px',
            minHeight: '44px',
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            fontFamily: theme.typography.body.family,
          }}
        />
        {titleTouched && !newTaskTitle.trim() ? (
          <span style={{ color: theme.colors.primary, alignSelf: 'center' }}>
            {t('validation.titleRequired')}
          </span>
        ) : null}
        <button
          type="submit"
          aria-label={t('addTask')}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.primary}`,
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('addTask')}
        </button>
      </form>
      {formErrors ? (
        <p style={{ color: theme.colors.accent, marginTop: 0 }}>{formErrors}</p>
      ) : null}
      <div
        style={{
          display: 'grid',
          gap: `${theme.spacing.lg}px`,
        }}
      >
        <div role="list" aria-label={t('tasks.chunkedListAria')} style={{ display: 'grid', gap: '1rem' }}>
          {loading ? (
            <p>{t('loading')}</p>
          ) : tasks.length === 0 ? (
            <p>{t('tasks.empty')}</p>
          ) : (
            chunks.map((group, index) => (
              <div
                key={`chunk-${index.toString()}`}
                role="group"
                aria-label={t('tasks.chunkLabel', { index: index + 1 })}
                style={{
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.shape.radiusMd,
                  padding: `${theme.spacing.md}px`,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted, fontWeight: 600 }}>
                  {t('tasks.chunkLabel', { index: index + 1 })}
                </p>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {group.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const actionLabel = isCompleted
                      ? t('tasks.uncomplete', { title: task.title })
                      : t('tasks.complete', { title: task.title });

                    return (
                      <div key={task.id} role="listitem">
                        <Checkbox
                          id={`task-${task.id}`}
                          label={task.title}
                          helperText={task.steps.length ? t('tasks.stepCount', { count: task.steps.length }) : undefined}
                          ariaLabel={actionLabel}
                          checked={isCompleted}
                          checkedAnnouncement={t('tasks.complete', { title: task.title })}
                          uncheckedAnnouncement={t('tasks.uncomplete', { title: task.title })}
                          onChange={() => toggleTaskStatus(task.id)}
                        />
                        {task.steps.length > 0 && (
                          <ul
                            style={{
                              margin: '0 0 0 2.25rem',
                              padding: 0,
                              listStyle: 'disc',
                              color: theme.colors.muted,
                            }}
                          >
                            {task.steps.map((step, idx) => (
                              <li key={`${task.id}-step-${idx.toString()}`} style={{ marginBottom: '0.25rem' }}>
                                {step}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div
          aria-label={t('tasks.focusAreaAria')}
          role="region"
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: `${theme.spacing.md}px`,
            backgroundColor: theme.colors.surface,
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>{t('tasks.focusHeading')}</p>
          <p style={{ margin: '0 0 1rem', color: theme.colors.muted }}>{t('tasks.focusHelper')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[5, 10, 25, 45].map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={selectedDuration === minutes}
                aria-label={t('tasks.focusDuration', { minutes })}
                onClick={() => {
                  setSelectedDuration(minutes);
                  setFormErrors(null);
                }}
                style={{
                  ...focusButtonStyle,
                  backgroundColor: selectedDuration === minutes ? theme.colors.background : theme.colors.surface,
                  borderColor: selectedDuration === minutes ? theme.colors.primary : theme.colors.border,
                }}
              >
                {t('tasks.focusDuration', { minutes })}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={t('tasks.startFocus', { minutes: selectedDuration })}
            onClick={handleStartFocus}
            style={{
              ...focusButtonStyle,
              width: '100%',
              marginTop: '1rem',
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
              borderColor: theme.colors.primary,
              fontWeight: 700,
            }}
          >
            {t('tasks.startFocus', { minutes: selectedDuration })}
          </button>
        </div>
      </div>
    </SectionCard>
  );
};

export default TaskList;
