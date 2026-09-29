import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import type { Subtask } from '../../../core/hooks/useDB';
import type { TaskTemplate } from '../data/taskTemplateLibrary';
import type { EnergyLevel } from '../utils/energyTone';
import { createEmptySubtasks, getSubtaskError, normalizeSubtasks } from '../utils/taskForm';
import type { ViewFilter } from '../utils/taskViews';


export type NewTaskInput = {
  title: string;
  subtasks: Subtask[];
  plannedDate: string | null;
  energyRequired: EnergyLevel;
  implementationIntention: string | null;
};

type DraftOptions = {
  t: TFunction;
  viewFilter: ViewFilter;
  todayKey: string;
};

/** Human-readable title for a template whose key has no translation, e.g. `tasks.tpl.laundryRun.title` → "laundry Run". */
const templateFallbackTitle = (template: TaskTemplate): string => {
  const keyParts = template.titleKey.split('.');
  return (keyParts[keyParts.length - 2] ?? template.id).replace(/([A-Z])/g, ' $1').trim();
};

/**
 * State for the "add task" form. A new task inherits today's date while the
 * Today view is open, unless the person picks a date or "No date" themselves.
 */
export const useTaskDraft = ({ t, viewFilter, todayKey }: DraftOptions) => {
  const [title, setTitle] = useState('');
  const [plannedDate, setPlannedDateState] = useState('');
  const [inheritViewDate, setInheritViewDate] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>(createEmptySubtasks());
  const [subtaskEditorOpen, setSubtaskEditorOpen] = useState(false);
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [intention, setIntention] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [subtasksTouched, setSubtasksTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inheritedDate = inheritViewDate && viewFilter === 'today' ? todayKey : '';
  /** The date the task will get if saved now ('' for none). */
  const effectiveDate = plannedDate || inheritedDate;
  const validateSubtasks = subtasksTouched || subtaskEditorOpen;

  const changeTitle = (value: string) => {
    setTitle(value);
    setTitleTouched(true);
    setFormError(null);
  };

  /** Sets an explicit date ('' means "No date"); stops inheriting the view's date. */
  const setPlannedDate = useCallback((value: string) => {
    setPlannedDateState(value);
    setInheritViewDate(false);
    setFormError(null);
  }, []);

  const toggleSubtaskEditor = () => {
    setSubtaskEditorOpen((prev) => !prev);
    setSubtasksTouched(true);
  };

  const applyTemplate = (template: TaskTemplate) => {
    setTitle(t(template.titleKey, templateFallbackTitle(template)));
    setSubtasks(template.subtaskKeys.map((key) => ({ label: t(key), done: false })));
    setEnergy(template.energyRequired);
    setSubtaskEditorOpen(template.subtaskKeys.length > 0);
    setDetailsOpen(true);
    setFormError(null);
    setTitleTouched(false);
  };

  const reset = () => {
    setTitle('');
    setPlannedDateState('');
    setInheritViewDate(true);
    setDetailsOpen(false);
    setSubtasks(createEmptySubtasks());
    setFormError(null);
    setTitleTouched(false);
    setSubtasksTouched(false);
    setSubtaskEditorOpen(false);
    setEnergy('medium');
    setIntention('');
  };

  /** Validates and returns the task to create, or null after showing the errors. */
  const submit = (): NewTaskInput | null => {
    const trimmedTitle = title.trim();
    const hasStepText = subtasks.some((subtask) => subtask.label.trim());
    const errors = [
      trimmedTitle ? null : t('validation.titleRequired'),
      getSubtaskError(subtasks, validateSubtasks || hasStepText, t),
    ].filter(Boolean);
    setTitleTouched(true);
    setSubtasksTouched(true);
    if (errors.length) {
      setFormError(errors.join(' '));
      return null;
    }
    return {
      title: trimmedTitle,
      subtasks: normalizeSubtasks(subtasks),
      plannedDate: effectiveDate || null,
      energyRequired: energy,
      implementationIntention: intention.trim() || null,
    };
  };

  return {
    title,
    changeTitle,
    titleError: titleTouched && !title.trim() ? t('validation.titleRequired') : '',
    plannedDate,
    setPlannedDate,
    inheritViewDate,
    effectiveDate,
    detailsOpen,
    toggleDetails: () => setDetailsOpen((prev) => !prev),
    subtasks,
    setSubtasks,
    touchSubtasks: () => setSubtasksTouched(true),
    subtaskError: getSubtaskError(subtasks, validateSubtasks, t),
    subtaskEditorOpen,
    toggleSubtaskEditor,
    energy,
    setEnergy,
    intention,
    setIntention,
    formError,
    applyTemplate,
    submit,
    reset,
  };
};

export type TaskDraft = ReturnType<typeof useTaskDraft>;
