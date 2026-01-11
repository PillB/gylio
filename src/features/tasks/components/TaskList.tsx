import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Subtask } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';
import useTasks from '../hooks/useTasks';

type ViewFilter = 'today' | 'week' | 'backlog';

type SubtaskEditorProps = {
  subtasks: Subtask[];
  onChange: (next: Subtask[]) => void;
  onTouch: () => void;
  label: string;
  helper: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  error?: string | null;
  theme: ThemeTokens;
  idPrefix: string;
};

const MIN_SUBTASKS = 3;
const MAX_SUBTASKS = 7;

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

const createEmptySubtasks = (count = MIN_SUBTASKS): Subtask[] =>
  Array.from({ length: count }, () => ({ label: '', done: false }));

const normalizeSubtasks = (subtasks: Subtask[]) =>
  subtasks
    .map((subtask) => ({ ...subtask, label: subtask.label.trim() }))
    .filter((subtask) => subtask.label.length > 0);

const getSubtaskError = (
  subtasks: Subtask[],
  shouldValidate: boolean,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  if (!shouldValidate) return null;
  const normalized = normalizeSubtasks(subtasks);
  if (normalized.length === 0) return null;
  if (normalized.length < MIN_SUBTASKS || normalized.length > MAX_SUBTASKS) {
    return t('validation.subtasksRange', { min: MIN_SUBTASKS, max: MAX_SUBTASKS });
  }
  return null;
};

const parsePlannedDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const SubtaskEditor: React.FC<SubtaskEditorProps> = ({
  subtasks,
  onChange,
  onTouch,
  label,
  helper,
  placeholder,
  addLabel,
  removeLabel,
  error,
  theme,
  idPrefix,
}) => (
  <fieldset
    style={{
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.shape.radiusMd,
      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
      margin: 0,
    }}
  >
    <legend style={{ padding: `0 ${theme.spacing.xs}px`, fontWeight: 600 }}>{label}</legend>
    <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted }}>{helper}</p>
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {subtasks.map((subtask, index) => (
        <div key={`${idPrefix}-subtask-${index.toString()}`} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id={`${idPrefix}-subtask-${index.toString()}`}
            type="text"
            value={subtask.label}
            placeholder={placeholder}
            onChange={(event) => {
              const next = subtasks.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, label: event.target.value } : entry
              );
              onChange(next);
              onTouch();
            }}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusMd,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.typography.body.family,
            }}
          />
          <button
            type="button"
            onClick={() => {
              const next = subtasks.filter((_, entryIndex) => entryIndex !== index);
              onChange(next);
              onTouch();
            }}
            aria-label={removeLabel}
            style={{
              minHeight: '44px',
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusMd,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              fontFamily: theme.typography.body.family,
            }}
          >
            {removeLabel}
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => {
        if (subtasks.length >= MAX_SUBTASKS) return;
        onChange([...subtasks, { label: '', done: false }]);
        onTouch();
      }}
      style={{
        marginTop: '0.5rem',
        minHeight: '44px',
        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        fontFamily: theme.typography.body.family,
      }}
    >
      {addLabel}
    </button>
    {error ? <p style={{ margin: '0.5rem 0 0', color: theme.colors.accent }}>{error}</p> : null}
  </fieldset>
);

const TaskList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    tasks,
    loading,
    toggleTaskStatus,
    toggleSubtask,
    addTask,
    updateTaskDetails,
    removeTask,
    startPomodoro,
  } = useTasks();
  const { theme } = useTheme();
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<Subtask[]>(createEmptySubtasks());
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [subtasksTouched, setSubtasksTouched] = useState(false);
  const [showSubtaskEditor, setShowSubtaskEditor] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('today');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editSubtasks, setEditSubtasks] = useState<Subtask[]>(createEmptySubtasks());
  const [editTouched, setEditTouched] = useState({ title: false, subtasks: false });
  const [editErrors, setEditErrors] = useState<string | null>(null);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' }), [i18n.language]);

  const filteredTasks = useMemo(() => {
    const todayDate = parsePlannedDate(todayKey);
    if (!todayDate) return tasks;
    const startOfToday = new Date(todayDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return tasks.filter((task) => {
      const planned = parsePlannedDate(task.plannedDate ?? null);
      if (viewFilter === 'today') {
        return planned ? task.plannedDate === todayKey : false;
      }
      if (viewFilter === 'week') {
        return planned ? planned >= startOfToday && planned <= endOfWeek : false;
      }
      return !planned || planned < startOfToday || planned > endOfWeek;
    });
  }, [tasks, todayKey, viewFilter]);

  const chunks = useMemo(() => chunkTasks(filteredTasks), [filteredTasks]);

  const handleStartFocus = useCallback(() => {
    startPomodoro({ durationMinutes: selectedDuration });
  }, [selectedDuration, startPomodoro]);

  const handleAddTask = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedTitle = newTaskTitle.trim();
      const errors: string[] = [];
      const shouldValidateSubtasks = subtasksTouched || showSubtaskEditor || newTaskSubtasks.some((subtask) => subtask.label.trim());
      const subtaskError = getSubtaskError(newTaskSubtasks, shouldValidateSubtasks, t);

      if (!trimmedTitle) {
        errors.push(t('validation.titleRequired'));
      }
      if (selectedDuration <= 0) {
        errors.push(t('validation.durationPositive'));
      }
      if (subtaskError) {
        errors.push(subtaskError);
      }

      setTitleTouched(true);
      setSubtasksTouched(true);

      if (errors.length) {
        setFormErrors(errors.join(' '));
        return;
      }

      const normalizedSubtasks = normalizeSubtasks(newTaskSubtasks);
      const created = await addTask({
        title: trimmedTitle,
        durationMinutes: selectedDuration,
        subtasks: normalizedSubtasks,
        plannedDate: plannedDate || null,
      });
      if (created) {
        setNewTaskTitle('');
        setPlannedDate('');
        setNewTaskSubtasks(createEmptySubtasks());
        setFormErrors(null);
        setTitleTouched(false);
        setSubtasksTouched(false);
        setShowSubtaskEditor(false);
      }
    },
    [addTask, newTaskSubtasks, newTaskTitle, plannedDate, selectedDuration, showSubtaskEditor, subtasksTouched, t]
  );

  const startEditingTask = useCallback((taskId: number) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    setEditingTaskId(taskId);
    setEditTitle(target.title);
    setEditPlannedDate(target.plannedDate ?? '');
    setEditSubtasks(target.subtasks.length ? target.subtasks : createEmptySubtasks());
    setEditTouched({ title: false, subtasks: false });
    setEditErrors(null);
  }, [tasks]);

  const handleSaveEdit = useCallback(async () => {
    if (editingTaskId == null) return;
    const trimmedTitle = editTitle.trim();
    const errors: string[] = [];
    const shouldValidateSubtasks = editTouched.subtasks || editSubtasks.some((subtask) => subtask.label.trim());
    const subtaskError = getSubtaskError(editSubtasks, shouldValidateSubtasks, t);

    if (!trimmedTitle) {
      errors.push(t('validation.titleRequired'));
    }
    if (subtaskError) {
      errors.push(subtaskError);
    }

    setEditTouched((prev) => ({ ...prev, title: true, subtasks: true }));

    if (errors.length) {
      setEditErrors(errors.join(' '));
      return;
    }

    const normalizedSubtasks = normalizeSubtasks(editSubtasks);
    const updated = await updateTaskDetails(editingTaskId, {
      title: trimmedTitle,
      plannedDate: editPlannedDate || null,
      subtasks: normalizedSubtasks,
    });
    if (updated) {
      setEditingTaskId(null);
      setEditErrors(null);
    }
  }, [editPlannedDate, editSubtasks, editTitle, editTouched.subtasks, editingTaskId, t, updateTaskDetails]);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditErrors(null);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: number, title: string) => {
    const confirmed = window.confirm(t('tasks.confirmDelete', { title }));
    if (!confirmed) return;
    await removeTask(taskId);
  }, [removeTask, t]);

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

  const newSubtaskError = getSubtaskError(
    newTaskSubtasks,
    subtasksTouched || showSubtaskEditor,
    t
  );

  const editSubtaskError = getSubtaskError(
    editSubtasks,
    editTouched.subtasks,
    t
  );

  const viewOptions = [
    { id: 'today', label: t('tasks.viewToday') },
    { id: 'week', label: t('tasks.viewWeek') },
    { id: 'backlog', label: t('tasks.viewBacklog') },
  ] as const;

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description') || ''}
    >
      <form
        onSubmit={handleAddTask}
        style={{ marginBottom: '1rem', display: 'grid', gap: `${theme.spacing.sm}px` }}
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
        <label htmlFor="planned-date" style={{ fontWeight: 600 }}>
          {t('tasks.plannedDateLabel')}
        </label>
        <input
          id="planned-date"
          type="date"
          value={plannedDate}
          onChange={(event) => {
            setPlannedDate(event.target.value);
            setFormErrors(null);
          }}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            fontFamily: theme.typography.body.family,
          }}
        />
        <p style={{ margin: 0, color: theme.colors.muted }}>{t('tasks.plannedDateHelper')}</p>
        <button
          type="button"
          onClick={() => {
            setShowSubtaskEditor((prev) => !prev);
            setSubtasksTouched(true);
          }}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusMd,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('breakIntoSteps')}
        </button>
        {showSubtaskEditor ? (
          <SubtaskEditor
            subtasks={newTaskSubtasks}
            onChange={setNewTaskSubtasks}
            onTouch={() => setSubtasksTouched(true)}
            label={t('tasks.subtasksLabel')}
            helper={t('tasks.subtasksHelper')}
            placeholder={t('tasks.subtaskPlaceholder')}
            addLabel={t('tasks.addSubtask')}
            removeLabel={t('tasks.removeSubtask')}
            error={newSubtaskError}
            theme={theme}
            idPrefix="new-task"
          />
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
        <div role="tablist" aria-label={t('tasks.viewLabel')} style={{ display: 'flex', gap: '0.5rem' }}>
          {viewOptions.map((option) => (
            <button
              key={option.id}
              role="tab"
              type="button"
              aria-selected={viewFilter === option.id}
              onClick={() => setViewFilter(option.id)}
              style={{
                minHeight: '44px',
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusMd,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: viewFilter === option.id ? theme.colors.background : theme.colors.surface,
                color: theme.colors.text,
                fontFamily: theme.typography.body.family,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div role="list" aria-label={t('tasks.chunkedListAria')} style={{ display: 'grid', gap: '1rem' }}>
          {loading ? (
            <p>{t('loading')}</p>
          ) : filteredTasks.length === 0 ? (
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
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {group.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const actionLabel = isCompleted
                      ? t('tasks.uncomplete', { title: task.title })
                      : t('tasks.complete', { title: task.title });
                    const planned = parsePlannedDate(task.plannedDate ?? null);
                    const completedSteps = task.completedSteps;
                    const totalSteps = task.totalSteps;

                    return (
                      <div key={task.id} role="listitem">
                        {editingTaskId === task.id ? (
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <label htmlFor={`edit-title-${task.id}`} style={{ fontWeight: 600 }}>
                              {t('titleLabel')}
                            </label>
                            <input
                              id={`edit-title-${task.id}`}
                              type="text"
                              value={editTitle}
                              onChange={(event) => {
                                setEditTitle(event.target.value);
                                setEditTouched((prev) => ({ ...prev, title: true }));
                                setEditErrors(null);
                              }}
                              style={{
                                minHeight: '44px',
                                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                                borderRadius: theme.shape.radiusMd,
                                border: `1px solid ${theme.colors.border}`,
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                fontFamily: theme.typography.body.family,
                              }}
                            />
                            {editTouched.title && !editTitle.trim() ? (
                              <span style={{ color: theme.colors.primary }}>{t('validation.titleRequired')}</span>
                            ) : null}
                            <label htmlFor={`edit-planned-${task.id}`} style={{ fontWeight: 600 }}>
                              {t('tasks.plannedDateLabel')}
                            </label>
                            <input
                              id={`edit-planned-${task.id}`}
                              type="date"
                              value={editPlannedDate}
                              onChange={(event) => {
                                setEditPlannedDate(event.target.value);
                                setEditErrors(null);
                              }}
                              style={{
                                minHeight: '44px',
                                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                                borderRadius: theme.shape.radiusMd,
                                border: `1px solid ${theme.colors.border}`,
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                fontFamily: theme.typography.body.family,
                              }}
                            />
                            <SubtaskEditor
                              subtasks={editSubtasks}
                              onChange={setEditSubtasks}
                              onTouch={() => setEditTouched((prev) => ({ ...prev, subtasks: true }))}
                              label={t('tasks.subtasksLabel')}
                              helper={t('tasks.subtasksHelper')}
                              placeholder={t('tasks.subtaskPlaceholder')}
                              addLabel={t('tasks.addSubtask')}
                              removeLabel={t('tasks.removeSubtask')}
                              error={editSubtaskError}
                              theme={theme}
                              idPrefix={`edit-task-${task.id}`}
                            />
                            {editErrors ? <p style={{ color: theme.colors.accent }}>{editErrors}</p> : null}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                style={{
                                  minHeight: '44px',
                                  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                                  borderRadius: theme.shape.radiusMd,
                                  border: `1px solid ${theme.colors.primary}`,
                                  backgroundColor: theme.colors.primary,
                                  color: theme.colors.background,
                                  fontFamily: theme.typography.body.family,
                                  fontWeight: 600,
                                }}
                              >
                                {t('saveLabel')}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{
                                  minHeight: '44px',
                                  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                                  borderRadius: theme.shape.radiusMd,
                                  border: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.surface,
                                  color: theme.colors.text,
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('cancelLabel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <Checkbox
                              id={`task-${task.id}`}
                              label={task.title}
                              helperText={task.subtasks.length ? t('tasks.stepCount', { count: task.subtasks.length }) : undefined}
                              ariaLabel={actionLabel}
                              checked={isCompleted}
                              checkedAnnouncement={t('tasks.complete', { title: task.title })}
                              uncheckedAnnouncement={t('tasks.uncomplete', { title: task.title })}
                              onChange={() => toggleTaskStatus(task.id)}
                            />
                            {planned ? (
                              <p style={{ margin: 0, color: theme.colors.muted }}>
                                {t('tasks.plannedDateLabel')}: {formatter.format(planned)}
                              </p>
                            ) : null}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => startEditingTask(task.id)}
                                style={{
                                  minHeight: '40px',
                                  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                                  borderRadius: theme.shape.radiusMd,
                                  border: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.surface,
                                  color: theme.colors.text,
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('editLabel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                style={{
                                  minHeight: '40px',
                                  padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                                  borderRadius: theme.shape.radiusMd,
                                  border: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.surface,
                                  color: theme.colors.text,
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('deleteLabel')}
                              </button>
                            </div>
                            {totalSteps > 0 ? (
                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <progress
                                  value={completedSteps}
                                  max={totalSteps}
                                  aria-label={t('tasks.progressAria', { title: task.title })}
                                  style={{ width: '100%' }}
                                />
                                <span style={{ color: theme.colors.muted }}>
                                  {t('tasks.progressLabel', { completed: completedSteps, total: totalSteps })}
                                </span>
                              </div>
                            ) : null}
                            {task.subtasks.length > 0 && (
                              <ul
                                style={{
                                  margin: '0 0 0 2.25rem',
                                  padding: 0,
                                  listStyle: 'none',
                                  display: 'grid',
                                  gap: '0.25rem',
                                }}
                              >
                                {task.subtasks.map((subtask, idx) => (
                                  <li key={`${task.id}-subtask-${idx.toString()}`}>
                                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <input
                                        type="checkbox"
                                        checked={subtask.done}
                                        onChange={() => toggleSubtask(task.id, idx)}
                                      />
                                      <span style={{ color: subtask.done ? theme.colors.muted : theme.colors.text }}>
                                        {subtask.label}
                                      </span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
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
