import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import useAccessibility from '../../../core/hooks/useAccessibility';
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

const focusButtonStyle: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '72px',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: '1px solid #d0d0d0',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '1rem',
};

const TaskList: React.FC = () => {
  const { t } = useTranslation();
  const { speak } = useAccessibility();
  const { tasks, loading, toggleTaskStatus, addTask, startPomodoro } = useTasks();
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const chunks = useMemo(() => chunkTasks(tasks), [tasks]);

  const handleStartFocus = useCallback(() => {
    startPomodoro({ durationMinutes: selectedDuration });
  }, [selectedDuration, startPomodoro]);

  const handleAddTask = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const created = await addTask(newTaskTitle, selectedDuration);
      if (created) {
        setNewTaskTitle('');
      }
    },
    [addTask, newTaskTitle, selectedDuration]
  );

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description') || ''}
    >
      <form onSubmit={handleAddTask} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <label htmlFor="new-task" style={{ display: 'none' }}>
          {t('addTask')}
        </label>
        <input
          id="new-task"
          type="text"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
          placeholder={t('taskPlaceholder')}
          style={{
            flex: '1 1 240px',
            minHeight: '44px',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid #d0d0d0',
          }}
        />
        <button
          type="submit"
          aria-label={t('addTask')}
          style={{
            minHeight: '44px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid #5b7cfa',
            backgroundColor: '#5b7cfa',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('addTask')}
        </button>
      </form>
      <div
        style={{
          display: 'grid',
          gap: '1rem',
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
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  backgroundColor: '#fff',
                }}
              >
                <p style={{ margin: '0 0 0.5rem', color: '#444', fontWeight: 600 }}>
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
                          <ul style={{ margin: '0 0 0 2.25rem', padding: 0, listStyle: 'disc', color: '#444' }}>
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
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '1rem',
            backgroundColor: '#f7f7f7',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>{t('tasks.focusHeading')}</p>
          <p style={{ margin: '0 0 1rem', color: '#555' }}>{t('tasks.focusHelper')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[5, 10, 25, 45].map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={selectedDuration === minutes}
                aria-label={t('tasks.focusDuration', { minutes })}
                onClick={() => setSelectedDuration(minutes)}
                style={{
                  ...focusButtonStyle,
                  backgroundColor: selectedDuration === minutes ? '#e8f0ff' : '#fff',
                  borderColor: selectedDuration === minutes ? '#5b7cfa' : '#d0d0d0',
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
              backgroundColor: '#5b7cfa',
              color: '#fff',
              borderColor: '#5b7cfa',
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
