import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Subtask } from '../../../core/hooks/useDB';
import type { EnergyLevel } from '../utils/energyTone';
import { createEmptySubtasks, getSubtaskError, normalizeSubtasks } from '../utils/taskForm';
import EnergyPicker from './EnergyPicker';
import SubtaskEditor from './SubtaskEditor';
import TaskHelp from './TaskHelp';
import type { ChecklistTask, TaskActions } from './taskActions';
import { controlStyle, primaryControlStyle, textInputStyle } from './taskStyles';

type Props = { task: ChecklistTask; actions: TaskActions };

/** Inline editor for one task; starts from the task's saved values. */
const TaskEditForm: React.FC<Props> = ({ task, actions }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [title, setTitle] = useState(task.title);
  const [plannedDate, setPlannedDate] = useState(task.plannedDate ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks.length ? task.subtasks : createEmptySubtasks());
  const [energy, setEnergy] = useState<EnergyLevel>(task.energyRequired ?? 'medium');
  const [touched, setTouched] = useState({ title: false, subtasks: false });
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmedTitle = title.trim();
    const hasStepText = subtasks.some((subtask) => subtask.label.trim());
    const errors = [
      trimmedTitle ? null : t('validation.titleRequired'),
      getSubtaskError(subtasks, touched.subtasks || hasStepText, t),
    ].filter(Boolean);
    setTouched({ title: true, subtasks: true });
    if (errors.length) {
      setError(errors.join(' '));
      return;
    }
    const saved = await actions.saveEdit(task.id, {
      title: trimmedTitle,
      plannedDate: plannedDate || null,
      subtasks: normalizeSubtasks(subtasks),
      energyRequired: energy,
      implementationIntention: task.implementationIntention?.trim() || null,
    });
    if (saved) setError(null);
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <label htmlFor={`edit-title-${task.id}`} style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {t('titleLabel')}
        <TaskHelp topic="title" />
      </label>
      <input
        id={`edit-title-${task.id}`}
        type="text"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setTouched((prev) => ({ ...prev, title: true }));
          setError(null);
        }}
        style={textInputStyle(theme)}
      />
      {touched.title && !title.trim() ? <span style={{ color: theme.colors.primary }}>{t('validation.titleRequired')}</span> : null}
      <label htmlFor={`edit-planned-${task.id}`} style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {t('tasks.plannedDateLabel')}
        <TaskHelp topic="plannedDate" />
      </label>
      <input
        id={`edit-planned-${task.id}`}
        type="date"
        value={plannedDate}
        onChange={(event) => {
          setPlannedDate(event.target.value);
          setError(null);
        }}
        style={textInputStyle(theme)}
      />
      <div>
        <EnergyPicker value={energy} onChange={setEnergy} />
      </div>
      <SubtaskEditor
        subtasks={subtasks}
        onChange={setSubtasks}
        onTouch={() => setTouched((prev) => ({ ...prev, subtasks: true }))}
        label={t('tasks.subtasksLabel')}
        helper={t('tasks.subtasksHelper')}
        placeholder={t('tasks.subtaskPlaceholder')}
        addLabel={t('tasks.addSubtask')}
        removeLabel={t('tasks.removeSubtask')}
        error={getSubtaskError(subtasks, touched.subtasks, t)}
        theme={theme}
        idPrefix={`edit-task-${task.id}`}
        tooltip={<TaskHelp topic="subtasks" />}
      />
      {error ? <p style={{ color: theme.colors.accent }}>{error}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={save} style={primaryControlStyle(theme, { fontWeight: 600 })}>
          {t('saveLabel')}
        </button>
        <button type="button" onClick={actions.cancelEdit} style={controlStyle(theme)}>
          {t('cancelLabel')}
        </button>
      </div>
    </div>
  );
};

export default TaskEditForm;
