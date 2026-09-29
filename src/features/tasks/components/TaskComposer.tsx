import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { TaskTemplate } from '../data/taskTemplateLibrary';
import type { TaskDraft } from '../hooks/useTaskDraft';
import EnergyPicker from './EnergyPicker';
import ScheduleChoices from './ScheduleChoices';
import SubtaskEditor from './SubtaskEditor';
import { TaskTemplateGallery } from './TaskTemplateGallery';
import TaskHelp from './TaskHelp';
import { controlStyle, primaryControlStyle, textInputStyle } from './taskStyles';

type Props = {
  draft: TaskDraft;
  todayKey: string;
  tomorrowKey: string;
  titleRef: React.RefObject<HTMLInputElement>;
  onSubmit: () => void;
  /** Rendered between the quick-start toggle and the form. */
  children?: React.ReactNode;
};

const TemplateToggle: React.FC<{ onSelect: (template: TaskTemplate) => void }> = ({ onSelect }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: `${theme.spacing.md}px` }}>
      <button
        type="button"
        data-tour="task-template-btn"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusFull,
          border: `1.5px solid ${open ? theme.colors.primary : theme.colors.border}`,
          background: open ? `${theme.colors.primary}12` : 'transparent',
          color: open ? theme.colors.primary : theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: theme.typography.body.family,
        }}
      >
        <span aria-hidden="true">⚡</span>
        {open ? t('tasks.tpl.hideGallery', 'Hide quick-start tasks') : t('tasks.tpl.showGallery', 'Browse quick-start tasks')}
      </button>
      {open && (
        <div style={{ marginTop: `${theme.spacing.sm}px` }}>
          <TaskTemplateGallery
            theme={theme}
            onSelect={(template) => {
              onSelect(template);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

/** Implementation-intention prompt ("When I finish breakfast, I will…"), offered for undated tasks. */
const IntentionField: React.FC<{ draft: TaskDraft }> = ({ draft }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div>
      <label htmlFor="new-task-intention" style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {t('tasks.intentionLabel', 'When / where')}
        <TaskHelp topic="intention" />
      </label>
      <textarea
        id="new-task-intention"
        rows={2}
        value={draft.intention}
        onChange={(event) => draft.setIntention(event.target.value)}
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
        {t('tasks.intentionHelper', 'A specific when/where cue can make the next action clearer.')}
      </p>
    </div>
  );
};

/** Optional details: schedule, energy, when/where cue and micro-steps. */
const DraftDetails: React.FC<Omit<Props, 'titleRef' | 'onSubmit' | 'children'>> = ({ draft, todayKey, tomorrowKey }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <>
      <ScheduleChoices draft={draft} todayKey={todayKey} tomorrowKey={tomorrowKey} />
      <div data-tour="task-energy">
        <EnergyPicker value={draft.energy} onChange={draft.setEnergy} />
      </div>
      {draft.title.trim() && !draft.plannedDate ? <IntentionField draft={draft} /> : null}
      <button type="button" data-tour="task-steps-btn" onClick={draft.toggleSubtaskEditor} style={controlStyle(theme)}>
        {t('breakIntoSteps')}
      </button>
      {draft.subtaskEditorOpen ? (
        <SubtaskEditor
          subtasks={draft.subtasks}
          onChange={draft.setSubtasks}
          onTouch={draft.touchSubtasks}
          label={t('tasks.subtasksLabel')}
          helper={t('tasks.subtasksHelper')}
          placeholder={t('tasks.subtaskPlaceholder')}
          addLabel={t('tasks.addSubtask')}
          removeLabel={t('tasks.removeSubtask')}
          error={draft.subtaskError}
          theme={theme}
          idPrefix="new-task"
          tooltip={<TaskHelp topic="subtasks" />}
        />
      ) : null}
    </>
  );
};

/** Quick-capture form: a title is enough; everything else sits behind "Add details". */
const TaskComposer: React.FC<Props> = ({ draft, todayKey, tomorrowKey, titleRef, onSubmit, children }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <>
      <TemplateToggle
        onSelect={(template) => {
          draft.applyTemplate(template);
          // Bring the filled-in form into view so the title and steps are visible without hunting.
          setTimeout(() => {
            titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            titleRef.current?.focus();
          }, 80);
        }}
      />
      {children}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        style={{ marginBottom: '1rem', display: 'grid', gap: `${theme.spacing.sm}px` }}
      >
        <label htmlFor="new-task" style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          {t('addTask')}
          <TaskHelp topic="title" />
        </label>
        <input
          id="new-task"
          ref={titleRef}
          data-tour="task-input"
          type="text"
          value={draft.title}
          onChange={(event) => draft.changeTitle(event.target.value)}
          placeholder={t('taskPlaceholder')}
          style={textInputStyle(theme)}
        />
        {draft.titleError ? <span style={{ color: theme.colors.primary, alignSelf: 'center' }}>{draft.titleError}</span> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: `${theme.spacing.sm}px` }}>
          <button
            type="button"
            aria-expanded={draft.detailsOpen}
            onClick={draft.toggleDetails}
            style={controlStyle(theme, { fontWeight: 600, cursor: 'pointer' })}
          >
            {draft.detailsOpen ? t('tasks.hideDetails', 'Hide details') : t('tasks.addDetails', 'Add details')}
          </button>
          <button
            type="submit"
            data-tour="task-submit"
            aria-label={t('addTask')}
            style={primaryControlStyle(theme, { padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`, fontWeight: 700, cursor: 'pointer' })}
          >
            {t('addTask')}
          </button>
        </div>
        {draft.detailsOpen ? <DraftDetails draft={draft} todayKey={todayKey} tomorrowKey={tomorrowKey} /> : null}
      </form>
      {draft.formError ? <p style={{ color: theme.colors.accent, marginTop: 0 }}>{draft.formError}</p> : null}
    </>
  );
};

export default TaskComposer;
