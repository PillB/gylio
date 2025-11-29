import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import SectionCard from './SectionCard.jsx';

/**
 * TaskList component
 *
 * Allows users to create tasks and break them into smaller steps. It keeps
 * everything in local state for now. In future iterations tasks will be persisted
 * via API calls and synchronised with a backend. Buttons and inputs use
 * clear labels for screen readers and large hit areas to aid dyspraxia. A
 * placeholder callout indicates where Pomodoro timers and checklist progress
 * bars will appear.
 */
const TaskList = () => {
  const { t } = useTranslation();
  const { ready, getTasks, insertTask, updateTask, deleteTask } = useDB();
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const parseSteps = useMemo(
    () => (description) => {
      if (!description) return [];
      try {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.steps)) return parsed.steps;
      } catch (error) {
        // Fallback to newline-delimited notes
      }
      return description
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean);
    },
    []
  );

  const serializeSteps = (steps) => JSON.stringify(steps);

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    getTasks()
      .then(setTasks)
      .catch((error) => {
        console.error('Failed to load tasks', error);
      })
      .finally(() => setLoading(false));
  }, [getTasks, ready]);

  // Create a new task if the title is non-empty
  const addTask = () => {
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    insertTask(title, 'pending', serializeSteps([]))
      .then((created) => {
        setTasks((prev) => (prev.length ? [created, ...prev] : [created]));
        setNewTitle('');
      })
      .catch((error) => {
        console.error('Failed to insert task', error);
      });
  };

  // Prompt the user to add a sub-step to an existing task
  const breakIntoSteps = (task) => {
    const stepTitle = window.prompt(t('stepPrompt') || 'Enter a step');
    if (!stepTitle) return;

    const steps = [...parseSteps(task.description), stepTitle.trim()];
    updateTask(task.id, { description: serializeSteps(steps) })
      .then((updated) => {
        if (!updated) return;
        setTasks((prev) => prev.map((entry) => (entry.id === task.id ? updated : entry)));
      })
      .catch((error) => {
        console.error('Failed to update task steps', error);
      });
  };

  const removeTask = (taskId) => {
    deleteTask(taskId)
      .then((deleted) => {
        if (deleted) {
          setTasks((prev) => prev.filter((entry) => entry.id !== taskId));
        }
      })
      .catch((error) => {
        console.error('Failed to delete task', error);
      });
  };

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description') || ''}
    >
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="taskTitle" style={{ display: 'block' }}>
          {t('addTask')}
        </label>
        <input
          id="taskTitle"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t('taskPlaceholder')}
          style={{ padding: '0.5rem', width: '100%', maxWidth: '300px' }}
        />
        <button
          type="button"
          onClick={addTask}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 0.75rem' }}
        >
          {t('addTask')}
        </button>
      </div>
      {loading ? (
        <p>{t('loading') || 'Loading tasks…'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => {
            const steps = parseSteps(task.description);
            return (
              <li
                key={task.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{task.title}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    style={{ padding: '0.35rem 0.6rem' }}
                  >
                    {t('deleteLabel') || 'Delete'}
                  </button>
                </div>
                {steps.length > 0 && (
                  <ul style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                    {steps.map((step, i) => (
                      <li key={i} style={{ listStyle: 'disc' }}>
                        {step}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => breakIntoSteps(task)}
                  style={{ marginTop: '0.5rem', padding: '0.35rem 0.6rem' }}
                >
                  {t('breakIntoSteps')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* Placeholder for Pomodoro timer and progress bars */}
      <p>{t('pomodoroSection') || 'Pomodoro timers and checklist progress bars will appear here.'}</p>
    </SectionCard>
  );
};

export default TaskList;
