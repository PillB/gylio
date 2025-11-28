import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  // Create a new task if the title is non-empty
  const addTask = () => {
    if (!newTitle.trim()) return;
    const task = { title: newTitle.trim(), steps: [], completed: false };
    setTasks([...tasks, task]);
    setNewTitle('');
  };

  // Prompt the user to add a sub-step to an existing task
  const breakIntoSteps = (index) => {
    const stepTitle = window.prompt(t('stepPrompt') || 'Enter a step');
    if (stepTitle) {
      const copy = [...tasks];
      copy[index].steps.push(stepTitle.trim());
      setTasks(copy);
    }
  };

  return (
    <SectionCard
      ariaLabel={`${t('tasks')} module`}
      title={t('tasks')}
      subtitle={t('tasksDescription') || ''}
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
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task, idx) => (
          <li
            key={idx}
            style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '0.5rem',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{task.title}</span>
            {task.steps.length > 0 && (
              <ul style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                {task.steps.map((step, i) => (
                  <li key={i} style={{ listStyle: 'disc' }}>
                    {step}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => breakIntoSteps(idx)}
              style={{ marginTop: '0.5rem', padding: '0.35rem 0.6rem' }}
            >
              {t('breakIntoSteps')}
            </button>
          </li>
        ))}
      </ul>
      {/* Placeholder for Pomodoro timer and progress bars */}
      <p>{t('pomodoroSection') || 'Pomodoro timers and checklist progress bars will appear here.'}</p>
    </SectionCard>
  );
};

export default TaskList;
