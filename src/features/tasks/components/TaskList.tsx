import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Subtask } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';
import useTasks from '../hooks/useTasks';
import usePomodoroTimer from '../hooks/usePomodoroTimer';
import PomodoroTimer from './PomodoroTimer';
import { TaskTemplateGallery } from './TaskTemplateGallery';
import type { TaskTemplate } from '../data/taskTemplateLibrary';
import WinCard from '../../../components/WinCard';
import EmptyStateAction from '../../../components/EmptyStateAction';
import { track, Events } from '../../../core/analytics';
import {
  MAX_SUBTASKS,
  chunkTasks,
  createEmptySubtasks,
  getSubtaskError,
  normalizeSubtasks,
  parsePlannedDate,
} from '../utils/taskForm';
import { useClock, getLocalDateKey } from '../../../core/hooks/useClock';

type ViewFilter = 'today' | 'week' | 'backlog' | 'upcoming';

type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  tiny: '#22C55E',
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
};

const ENERGY_LEVELS: EnergyLevel[] = ['tiny', 'low', 'medium', 'high'];

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
  const pomodoro = usePomodoroTimer();
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
  const [newTaskEnergy, setNewTaskEnergy] = useState<EnergyLevel>('medium');
  const [newTaskIntention, setNewTaskIntention] = useState('');
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel | 'all'>('all');
  const [editEnergy, setEditEnergy] = useState<EnergyLevel>('medium');
  const [editIntention, setEditIntention] = useState('');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showWinCard, setShowWinCard] = useState(false);
  const [focusModeExpanded, setFocusModeExpanded] = useState(false);

  const handleSelectTemplate = useCallback((template: TaskTemplate) => {
    const keyParts = template.titleKey.split('.');
    const segment = keyParts[keyParts.length - 2] ?? template.id;
    const fallbackTitle = segment.replace(/([A-Z])/g, ' $1').trim();
    setNewTaskTitle(t(template.titleKey, fallbackTitle));
    setNewTaskSubtasks(template.subtasks.map((label) => ({ label, done: false })));
    setNewTaskEnergy(template.energyRequired);
    setShowSubtaskEditor(template.subtasks.length > 0);
    setShowTemplateGallery(false);
    setFormErrors(null);
    setTitleTouched(false);
  }, [t]);

  const { dateKey: todayKey } = useClock(i18n.language);
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
      let passesDateFilter: boolean;
      if (viewFilter === 'today') {
        passesDateFilter = planned ? task.plannedDate === todayKey : false;
      } else if (viewFilter === 'week') {
        passesDateFilter = planned ? planned >= startOfToday && planned <= endOfWeek : false;
      } else if (viewFilter === 'upcoming') {
        passesDateFilter = true; // upcoming shows all, sectioned below
      } else {
        passesDateFilter = !planned || planned < startOfToday || planned > endOfWeek;
      }
      const passesEnergyFilter = energyFilter === 'all' || task.energyRequired === energyFilter;
      return passesDateFilter && passesEnergyFilter;
    });
  }, [tasks, todayKey, viewFilter, energyFilter]);

  // Sectioned upcoming view
  const upcomingSections = useMemo(() => {
    if (viewFilter !== 'upcoming') return null;
    const todayDate = parsePlannedDate(todayKey);
    if (!todayDate) return null;
    const startOfToday = new Date(todayDate);
    startOfToday.setHours(0, 0, 0, 0);
    const tomorrowKey = (() => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const endOfThisWeek = new Date(startOfToday);
    endOfThisWeek.setDate(startOfToday.getDate() + 6);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const overdue: typeof tasks = [];
    const today: typeof tasks = [];
    const tomorrow: typeof tasks = [];
    const thisWeek: typeof tasks = [];
    const later: typeof tasks = [];
    const unscheduled: typeof tasks = [];

    for (const task of filteredTasks) {
      const planned = parsePlannedDate(task.plannedDate ?? null);
      if (!planned) {
        unscheduled.push(task);
      } else if (task.plannedDate === todayKey) {
        today.push(task);
      } else if (task.plannedDate === tomorrowKey) {
        tomorrow.push(task);
      } else if (planned < startOfToday) {
        overdue.push(task);
      } else if (planned <= endOfThisWeek) {
        thisWeek.push(task);
      } else {
        later.push(task);
      }
    }
    return { overdue, today, tomorrow, thisWeek, later, unscheduled };
  }, [filteredTasks, todayKey, viewFilter]);

  // Focus mode: in today view, show max 3 tasks by default
  const FOCUS_MODE_LIMIT = 3;
  const isFocusMode = viewFilter === 'today' && filteredTasks.length > FOCUS_MODE_LIMIT;
  const visibleTasks = isFocusMode && !focusModeExpanded
    ? filteredTasks.slice(0, FOCUS_MODE_LIMIT)
    : filteredTasks;
  const hiddenCount = filteredTasks.length - FOCUS_MODE_LIMIT;

  const chunks = useMemo(() => chunkTasks(visibleTasks), [visibleTasks]);

  const handleStartFocus = useCallback(() => {
    pomodoro.start(selectedDuration * 60);
    startPomodoro({ durationMinutes: selectedDuration });
  }, [pomodoro, selectedDuration, startPomodoro]);

  const handlePomodoroComplete = useCallback(() => {
    // XP is awarded via startPomodoro (notification) — nothing extra needed here
  }, []);

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
        energyRequired: newTaskEnergy,
        implementationIntention: newTaskIntention.trim() || null,
      });
      if (created) {
        track(Events.TASK_CREATED, {
          withSubtasks: normalizedSubtasks.length > 0,
          energy: newTaskEnergy,
          hasDate: Boolean(plannedDate),
          isFirstTask: tasks.length === 0,
        });
        setNewTaskTitle('');
        setPlannedDate('');
        setNewTaskSubtasks(createEmptySubtasks());
        setFormErrors(null);
        setTitleTouched(false);
        setSubtasksTouched(false);
        setShowSubtaskEditor(false);
        setNewTaskEnergy('medium');
        setNewTaskIntention('');
      }
    },
    [addTask, newTaskEnergy, newTaskIntention, newTaskSubtasks, newTaskTitle, plannedDate, selectedDuration, showSubtaskEditor, subtasksTouched, t]
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
    setEditEnergy(target.energyRequired ?? 'medium');
    setEditIntention(target.implementationIntention ?? '');
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
      energyRequired: editEnergy,
      implementationIntention: editIntention.trim() || null,
    });
    if (updated) {
      setEditingTaskId(null);
      setEditErrors(null);
    }
  }, [editEnergy, editIntention, editPlannedDate, editSubtasks, editTitle, editTouched.subtasks, editingTaskId, t, updateTaskDetails]);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditErrors(null);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: number, title: string) => {
    const confirmed = window.confirm(t('tasks.confirmDelete', { title }));
    if (!confirmed) return;
    await removeTask(taskId);
  }, [removeTask, t]);

  // Wrap toggleTaskStatus to detect "all today tasks done" milestone
  const handleToggleTask = useCallback(async (taskId: number) => {
    await toggleTaskStatus(taskId);
    // Check after state settles via setTimeout to read updated tasks
    setTimeout(() => {
      const todayISO = getLocalDateKey();
      const todayTasks = tasks.filter((t) => t.plannedDate === todayISO);
      if (todayTasks.length > 0) {
        const completingTask = tasks.find((t) => t.id === taskId);
        // Only trigger if this task is being completed (not uncompleted)
        if (completingTask && completingTask.status !== 'completed') {
          const othersDone = todayTasks
            .filter((t) => t.id !== taskId)
            .every((t) => t.status === 'completed');
          if (othersDone) {
            track(Events.ALL_TODAY_TASKS_DONE, { count: todayTasks.length });
            setShowWinCard(true);
          }
        }
      }
      track(Events.TASK_COMPLETED, { taskId });
    }, 100);
  }, [toggleTaskStatus, tasks]);

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
    { id: 'upcoming', label: t('tasks.viewUpcoming') },
    { id: 'backlog', label: t('tasks.viewBacklog') },
  ] as const;

  return (
    <SectionCard
      ariaLabel={`${t('tasks.title')} module`}
      title={t('tasks.title')}
      subtitle={t('tasks.description') || ''}
    >
      {/* Research-backed task templates */}
      <div style={{ marginBottom: `${theme.spacing.md}px` }}>
        <button
          type="button"
          onClick={() => setShowTemplateGallery((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusFull,
            border: `1.5px solid ${showTemplateGallery ? theme.colors.primary : theme.colors.border}`,
            background: showTemplateGallery ? `${theme.colors.primary}12` : 'transparent',
            color: showTemplateGallery ? theme.colors.primary : theme.colors.muted,
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: theme.typography.body.family,
          }}
        >
          <span>⚡</span>
          {showTemplateGallery
            ? t('tasks.tpl.hideGallery', 'Hide quick-start tasks')
            : t('tasks.tpl.showGallery', 'Quick-start from proven tasks')}
        </button>
        {showTemplateGallery && (
          <div style={{ marginTop: `${theme.spacing.sm}px` }}>
            <TaskTemplateGallery theme={theme} onSelect={handleSelectTemplate} />
          </div>
        )}
      </div>

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
        {/* Energy level selector */}
        <div>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
            {t('tasks.energyLabel', 'Energy required')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {ENERGY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={newTaskEnergy === level}
                onClick={() => setNewTaskEnergy(level)}
                style={{
                  padding: '4px 12px',
                  borderRadius: theme.shape.radiusFull,
                  border: `2px solid ${newTaskEnergy === level ? ENERGY_COLORS[level] : theme.colors.border}`,
                  backgroundColor: newTaskEnergy === level ? ENERGY_COLORS[level] : 'transparent',
                  color: newTaskEnergy === level ? '#fff' : theme.colors.text,
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: newTaskEnergy === level ? 700 : 400,
                  fontFamily: theme.typography.body.family,
                  transition: 'all 0.15s',
                }}
              >
                {t(`tasks.energy${level.charAt(0).toUpperCase()}${level.slice(1)}`, level)}
              </button>
            ))}
          </div>
        </div>
        {newTaskTitle.trim() && !plannedDate && (
          <div>
            <label htmlFor="new-task-intention" style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>
              {t('tasks.intentionLabel', 'When / where')}
            </label>
            <textarea
              id="new-task-intention"
              rows={2}
              value={newTaskIntention}
              onChange={(e) => setNewTaskIntention(e.target.value)}
              placeholder={t('tasks.intentionPlaceholder', 'When I finish breakfast, I will...')}
              style={{
                width: '100%',
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusMd,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                fontFamily: theme.typography.body.family,
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '2px 0 0', color: theme.colors.muted, fontSize: '0.8rem' }}>
              {t('tasks.intentionHelper', 'Adding when/where doubles follow-through.')}
            </p>
          </div>
        )}
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
        {/* Energy filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: theme.colors.muted, fontWeight: 600 }}>
            {t('tasks.filterByEnergy', 'Energy:')}
          </span>
          <button
            type="button"
            aria-pressed={energyFilter === 'all'}
            onClick={() => setEnergyFilter('all')}
            style={{
              padding: '2px 10px',
              borderRadius: theme.shape.radiusFull,
              border: `1.5px solid ${energyFilter === 'all' ? theme.colors.primary : theme.colors.border}`,
              background: energyFilter === 'all' ? theme.colors.primary : 'transparent',
              color: energyFilter === 'all' ? '#fff' : theme.colors.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: theme.typography.body.family,
            }}
          >
            {t('tasks.energyFilterAll', 'All')}
          </button>
          {ENERGY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={energyFilter === level}
              onClick={() => setEnergyFilter(level)}
              style={{
                padding: '2px 10px',
                borderRadius: theme.shape.radiusFull,
                border: `1.5px solid ${energyFilter === level ? ENERGY_COLORS[level] : theme.colors.border}`,
                background: energyFilter === level ? ENERGY_COLORS[level] : 'transparent',
                color: energyFilter === level ? '#fff' : theme.colors.text,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: theme.typography.body.family,
              }}
            >
              {t(`tasks.energy${level.charAt(0).toUpperCase()}${level.slice(1)}`, level)}
            </button>
          ))}
        </div>
        {/* Focus mode banner */}
        {isFocusMode && (
          <div
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusMd,
              background: `${theme.colors.primary}10`,
              border: `1px solid ${theme.colors.primary}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
              flexWrap: 'wrap',
              fontSize: 13,
              fontFamily: theme.typography.body.family,
            }}
          >
            <span style={{ color: theme.colors.muted }}>
              🎯 <strong style={{ color: theme.colors.text }}>Focus mode:</strong> showing your top {FOCUS_MODE_LIMIT} tasks.
              Research shows fewer visible tasks = more completed.
            </span>
            <button
              type="button"
              onClick={() => setFocusModeExpanded((p) => !p)}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusFull,
                padding: '2px 10px',
                fontSize: 12,
                color: theme.colors.muted,
                cursor: 'pointer',
                fontFamily: theme.typography.body.family,
                flexShrink: 0,
              }}
            >
              {focusModeExpanded ? 'Show less' : `Show all ${filteredTasks.length}`}
            </button>
          </div>
        )}
        <div role="list" aria-label={t('tasks.chunkedListAria')} style={{ display: 'grid', gap: '1rem' }}>
          {loading ? (
            <p>{t('loading')}</p>
          ) : filteredTasks.length === 0 ? (
            viewFilter === 'today' ? (
              <EmptyStateAction
                emoji="✅"
                headline={t('tasks.emptyTodayHeadline', 'Nothing scheduled for today.')}
                body={t('tasks.emptyTodayBody', "That's a clean slate. Add one task you want to get done today — even one small win moves the needle.")}
                ctaLabel={t('tasks.emptyTodayCta', '+ Add a task for today')}
                onCta={() => {
                  const titleInput = document.getElementById('new-task') as HTMLInputElement | null;
                  titleInput?.focus();
                  setPlannedDate(getLocalDateKey());
                }}
              />
            ) : (
              <EmptyStateAction
                emoji="📋"
                headline={t('tasks.empty', 'No tasks yet.')}
                body={t('tasks.emptyBody', "Start with the one thing that would make today feel like a win. Break it into steps if it feels big.")}
                ctaLabel={t('tasks.emptyCta', '+ Add your first task')}
                onCta={() => {
                  const titleInput = document.getElementById('new-task') as HTMLInputElement | null;
                  titleInput?.focus();
                }}
              />
            )
          ) : viewFilter === 'upcoming' && upcomingSections ? (
            // Upcoming view: sections grouped by time horizon
            (() => {
              const sections = [
                { key: 'overdue', label: t('tasks.sectionOverdue'), tasks: upcomingSections.overdue, accent: theme.colors.accent },
                { key: 'today', label: t('tasks.sectionToday'), tasks: upcomingSections.today, accent: theme.colors.primary },
                { key: 'tomorrow', label: t('tasks.sectionTomorrow'), tasks: upcomingSections.tomorrow, accent: theme.colors.text },
                { key: 'thisWeek', label: t('tasks.sectionThisWeek'), tasks: upcomingSections.thisWeek, accent: theme.colors.text },
                { key: 'later', label: t('tasks.sectionLater'), tasks: upcomingSections.later, accent: theme.colors.muted },
                { key: 'unscheduled', label: t('tasks.sectionUnscheduled'), tasks: upcomingSections.unscheduled, accent: theme.colors.muted },
              ].filter((s) => s.tasks.length > 0);

              if (sections.length === 0) {
                return (
                  <EmptyStateAction
                    emoji="🌤"
                    headline={t('tasks.upcomingEmpty', 'All clear!')}
                    body={t('tasks.upcomingEmptyBody', 'No tasks scheduled. Add one to see your week at a glance.')}
                    ctaLabel={t('tasks.emptyCta', '+ Add your first task')}
                    onCta={() => {
                      const titleInput = document.getElementById('new-task') as HTMLInputElement | null;
                      titleInput?.focus();
                    }}
                  />
                );
              }

              return (
                <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
                  {sections.map((section) => (
                    <div key={section.key}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        marginBottom: `${theme.spacing.xs}px`,
                        paddingBottom: `${theme.spacing.xs}px`,
                        borderBottom: `2px solid ${section.accent}30`,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: section.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {section.label}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: theme.colors.muted, marginLeft: 'auto' }}>
                          {section.tasks.length}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: '0.375rem' }}>
                        {section.tasks.map((task) => {
                          const isCompleted = task.status === 'completed';
                          const planned = parsePlannedDate(task.plannedDate ?? null);
                          return (
                            <div
                              key={task.id}
                              role="listitem"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                                borderRadius: theme.shape.radiusMd,
                                border: `1px solid ${theme.colors.border}`,
                                backgroundColor: theme.colors.surface,
                                opacity: isCompleted ? 0.6 : 1,
                              }}
                            >
                              <input
                                type="checkbox"
                                id={`upcoming-${task.id}`}
                                checked={isCompleted}
                                onChange={() => handleToggleTask(task.id)}
                                aria-label={isCompleted ? t('tasks.uncomplete', { title: task.title }) : t('tasks.complete', { title: task.title })}
                                style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer', accentColor: theme.colors.primary }}
                              />
                              <span style={{
                                flex: 1,
                                fontFamily: theme.typography.body.family,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isCompleted ? theme.colors.muted : theme.colors.text,
                                fontSize: '0.9375rem',
                              }}>
                                {task.title}
                              </span>
                              {planned && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: section.key === 'overdue' ? theme.colors.accent : theme.colors.muted,
                                  whiteSpace: 'nowrap',
                                  fontWeight: section.key === 'overdue' ? 600 : 400,
                                }}>
                                  {formatter.format(planned)}
                                </span>
                              )}
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: ENERGY_COLORS[task.energyRequired as EnergyLevel ?? 'medium'] ?? ENERGY_COLORS.medium,
                                flexShrink: 0,
                              }} />
                              <button
                                type="button"
                                onClick={() => startEditingTask(task.id)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: theme.shape.radiusSm,
                                  border: `1px solid ${theme.colors.border}`,
                                  backgroundColor: 'transparent',
                                  color: theme.colors.muted,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('editLabel')}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
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
                            <div>
                              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                                {t('tasks.energyLabel', 'Energy required')}
                              </p>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {ENERGY_LEVELS.map((level) => (
                                  <button
                                    key={level}
                                    type="button"
                                    aria-pressed={editEnergy === level}
                                    onClick={() => setEditEnergy(level)}
                                    style={{
                                      padding: '4px 12px',
                                      borderRadius: theme.shape.radiusFull,
                                      border: `2px solid ${editEnergy === level ? ENERGY_COLORS[level] : theme.colors.border}`,
                                      backgroundColor: editEnergy === level ? ENERGY_COLORS[level] : 'transparent',
                                      color: editEnergy === level ? '#fff' : theme.colors.text,
                                      cursor: 'pointer',
                                      fontSize: '0.8125rem',
                                      fontWeight: editEnergy === level ? 700 : 400,
                                      fontFamily: theme.typography.body.family,
                                    }}
                                  >
                                    {t(`tasks.energy${level.charAt(0).toUpperCase()}${level.slice(1)}`, level)}
                                  </button>
                                ))}
                              </div>
                            </div>
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
                              onChange={() => handleToggleTask(task.id)}
                            />
                            {/* Energy pill */}
                            <span
                              style={{
                                display: 'inline-block',
                                justifySelf: 'start',
                                padding: '2px 8px',
                                borderRadius: theme.shape.radiusFull,
                                backgroundColor: ENERGY_COLORS[task.energyRequired as EnergyLevel] ?? ENERGY_COLORS.medium,
                                color: '#fff',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                letterSpacing: '0.03em',
                              }}
                            >
                              {t(`tasks.energy${(task.energyRequired ?? 'medium').charAt(0).toUpperCase()}${(task.energyRequired ?? 'medium').slice(1)}`, task.energyRequired ?? 'medium')}
                            </span>
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
                                {(() => {
                                  const nextSubtaskIdx = task.subtasks.findIndex((s) => !s.done);
                                  return task.subtasks.map((subtask, idx) => (
                                    <li key={`${task.id}-subtask-${idx.toString()}`}>
                                      {idx === nextSubtaskIdx && !subtask.done && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.colors.primary, display: 'block', marginBottom: 2 }}>
                                          → {t('tasks.startHere', 'Start here')}
                                        </span>
                                      )}
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
                                  ));
                                })()}
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

        {pomodoro.status !== 'idle' ? (
          <PomodoroTimer
            status={pomodoro.status}
            remainingSeconds={pomodoro.remainingSeconds}
            totalSeconds={pomodoro.totalSeconds}
            onPause={pomodoro.pause}
            onResume={pomodoro.resume}
            onCancel={pomodoro.cancel}
            onComplete={handlePomodoroComplete}
          />
        ) : (
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
        )}
      </div>
      {showWinCard && (
        <WinCard
          type="all_tasks_done"
          label={`All ${filteredTasks.length} tasks done today`}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </SectionCard>
  );
};

export default TaskList;
