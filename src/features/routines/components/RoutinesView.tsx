import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Routine } from '../../../core/hooks/useDB';
import { StreakDots } from './StreakDots';
import RoutineTemplateGallery from './RoutineTemplateGallery';
import type { RoutineTemplate } from '../data/routineTemplateLibrary';
import WinCard from '../../../components/WinCard';
import EmptyStateAction from '../../../components/EmptyStateAction';
import { track, Events } from '../../../core/analytics';
import {
  createEmptyRoutineSteps,
  formatTriggerTime,
  isRoutineDueToday,
  normalizeRoutineSteps,
  validateRoutineForm,
} from '../utils/routineHelpers';
import useRoutines from '../hooks/useRoutines';

type FormState = {
  title: string;
  description: string;
  frequency: Routine['frequency'];
  triggerTime: string;
  steps: { label: string; done: boolean }[];
  anchorHabit: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  frequency: 'DAILY',
  triggerTime: '',
  steps: createEmptyRoutineSteps(),
  anchorHabit: '',
};

const RoutinesView: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { routines, loading, addRoutine, updateRoutine, removeRoutine, toggleStep, completeRoutine } =
    useRoutines();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showRoutineGallery, setShowRoutineGallery] = useState(false);
  const [showWinCard, setShowWinCard] = useState(false);
  const [lastCompletedTitle, setLastCompletedTitle] = useState('');

  const handleSelectRoutineTemplate = (template: RoutineTemplate) => {
    const keyParts = template.titleKey.split('.');
    const segment = keyParts[keyParts.length - 2] ?? template.id;
    const fallbackTitle = segment.replace(/([A-Z])/g, ' $1').trim();
    setForm({
      title: t(template.titleKey, fallbackTitle),
      description: t(template.whyKey, ''),
      frequency: template.frequency,
      triggerTime: template.triggerTime || '',
      steps: template.steps.map((label) => ({ label, done: false })),
      anchorHabit: template.anchorHabit || '',
    });
    setTouched(false);
    setShowRoutineGallery(false);
  };

  const errors = validateRoutineForm(form, t);
  const editErrors = validateRoutineForm(editForm, t);

  const handleAdd = async () => {
    setTouched(true);
    if (errors.title) return;
    await addRoutine({
      title: form.title,
      description: form.description || null,
      frequency: form.frequency,
      triggerTime: form.triggerTime || null,
      steps: normalizeRoutineSteps(form.steps),
      anchorHabit: form.anchorHabit || null,
    });
    setForm(EMPTY_FORM);
    setTouched(false);
  };

  const startEdit = (routine: Routine) => {
    setEditingId(routine.id);
    setEditForm({
      title: routine.title,
      description: routine.description ?? '',
      frequency: routine.frequency,
      triggerTime: formatTriggerTime(routine.triggerTime),
      steps: routine.steps.length > 0 ? routine.steps : createEmptyRoutineSteps(),
      anchorHabit: routine.anchorHabit ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || editErrors.title) return;
    await updateRoutine(editingId, {
      title: editForm.title,
      description: editForm.description || null,
      frequency: editForm.frequency,
      triggerTime: editForm.triggerTime || null,
      steps: normalizeRoutineSteps(editForm.steps),
      anchorHabit: editForm.anchorHabit || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await removeRoutine(id);
    setDeletingId(null);
  };

  const addFormStep = (setter: React.Dispatch<React.SetStateAction<FormState>>) =>
    setter((prev) => ({ ...prev, steps: [...prev.steps, { label: '', done: false }] }));

  const updateFormStep = (
    setter: React.Dispatch<React.SetStateAction<FormState>>,
    index: number,
    value: string
  ) =>
    setter((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, label: value } : s)),
    }));

  const removeFormStep = (
    setter: React.Dispatch<React.SetStateAction<FormState>>,
    index: number
  ) =>
    setter((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));

  const inputStyle = {
    padding: `${theme.spacing.sm}px`,
    borderRadius: theme.shape.radiusSm,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.typography.body.family,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const primaryBtnStyle = {
    minHeight: '44px',
    padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${theme.colors.primary}`,
    backgroundColor: theme.colors.primary,
    color: theme.colors.primaryForeground,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: theme.typography.body.family,
  };

  const ghostBtnStyle = {
    minHeight: '44px',
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.shape.radiusMd,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
    color: theme.colors.muted,
    cursor: 'pointer',
    fontFamily: theme.typography.body.family,
  };

  const renderStepFields = (
    steps: FormState['steps'],
    setter: React.Dispatch<React.SetStateAction<FormState>>,
    idPrefix: string
  ) => (
    <div style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
          <input
            id={`${idPrefix}-step-${i}`}
            type="text"
            value={step.label}
            onChange={(e) => updateFormStep(setter, i, e.target.value)}
            placeholder={t('routines.stepPlaceholder', { index: i + 1 })}
            aria-label={t('routines.stepPlaceholder', { index: i + 1 })}
            style={{ ...inputStyle }}
          />
          {steps.length > 1 && (
            <button
              type="button"
              onClick={() => removeFormStep(setter, i)}
              aria-label={t('routines.removeStep', { index: i + 1 })}
              style={{ ...ghostBtnStyle, minHeight: '44px' }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => addFormStep(setter)}
        style={{ ...ghostBtnStyle, justifySelf: 'start' }}
      >
        + {t('routines.addStep')}
      </button>
    </div>
  );

  return (
    <section aria-label={t('routines.title')}>
      <h2
        style={{
          margin: `0 0 ${theme.spacing.md}px`,
          fontFamily: theme.typography.heading.family,
          fontWeight: theme.typography.heading.weight,
          color: theme.colors.text,
        }}
      >
        {t('routines.title')}
      </h2>
      <p style={{ margin: `0 0 ${theme.spacing.lg}px`, color: theme.colors.muted }}>
        {t('routines.description')}
      </p>

      {/* Research-backed routine templates */}
      <div style={{ marginBottom: `${theme.spacing.md}px` }}>
        <button
          type="button"
          onClick={() => setShowRoutineGallery((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusFull,
            border: `1.5px solid ${showRoutineGallery ? theme.colors.primary : theme.colors.border}`,
            background: showRoutineGallery ? `${theme.colors.primary}12` : 'transparent',
            color: showRoutineGallery ? theme.colors.primary : theme.colors.muted,
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: theme.typography.body.family,
          }}
        >
          <span>🔬</span>
          {showRoutineGallery
            ? t('routines.tpl.hideGallery', 'Hide protocols')
            : t('routines.tpl.showGallery', 'Browse research-backed protocols')}
        </button>
        {showRoutineGallery && (
          <div style={{ marginTop: `${theme.spacing.sm}px` }}>
            <RoutineTemplateGallery theme={theme} onSelect={handleSelectRoutineTemplate} />
          </div>
        )}
      </div>

      {/* Add form */}
      <div
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.shape.radiusMd,
          padding: `${theme.spacing.md}px`,
          backgroundColor: theme.colors.surface,
          display: 'grid',
          gap: `${theme.spacing.sm}px`,
          marginBottom: `${theme.spacing.lg}px`,
        }}
      >
        <h3 style={{ margin: 0, color: theme.colors.text, fontFamily: theme.typography.heading.family }}>
          {t('routines.addHeading')}
        </h3>

        <label htmlFor="routine-title" style={{ color: theme.colors.text }}>
          {t('routines.titleLabel')}
          <input
            id="routine-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={t('routines.titlePlaceholder')}
            aria-required="true"
            aria-describedby={touched && errors.title ? 'routine-title-error' : undefined}
            style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
          />
        </label>
        {touched && errors.title && (
          <p id="routine-title-error" role="alert" style={{ margin: 0, color: theme.colors.accent }}>
            {errors.title}
          </p>
        )}

        <label htmlFor="routine-description" style={{ color: theme.colors.text }}>
          {t('routines.descriptionLabel')}
          <input
            id="routine-description"
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
          />
        </label>

        <label htmlFor="routine-frequency" style={{ color: theme.colors.text }}>
          {t('routines.frequencyLabel')}
          <select
            id="routine-frequency"
            value={form.frequency}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, frequency: e.target.value as Routine['frequency'] }))
            }
            style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
          >
            <option value="DAILY">{t('routines.frequencyDaily')}</option>
            <option value="WEEKLY">{t('routines.frequencyWeekly')}</option>
            <option value="CUSTOM">{t('routines.frequencyCustom')}</option>
          </select>
        </label>

        <label htmlFor="routine-trigger" style={{ color: theme.colors.text }}>
          {t('routines.triggerTimeLabel')}
          <input
            id="routine-trigger"
            type="time"
            value={form.triggerTime}
            onChange={(e) => setForm((prev) => ({ ...prev, triggerTime: e.target.value }))}
            style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
          />
        </label>

        <label htmlFor="routine-anchor" style={{ fontWeight: 600, display: 'block' }}>
          {t('routines.anchorLabel', 'Stack onto a habit (optional)')}
        </label>
        <input
          id="routine-anchor"
          type="text"
          value={form.anchorHabit}
          onChange={(e) => setForm((prev) => ({ ...prev, anchorHabit: e.target.value }))}
          placeholder={t('routines.anchorPlaceholder', 'e.g. After morning coffee')}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ margin: '2px 0 0', color: theme.colors.muted, fontSize: '0.8125rem' }}>
          {t('routines.anchorHelper', 'Anchoring to an existing habit makes this much more likely to stick.')}
        </p>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ color: theme.colors.text, marginBottom: `${theme.spacing.xs}px` }}>
            {t('routines.stepsLabel')}
          </legend>
          {renderStepFields(form.steps, setForm, 'new')}
        </fieldset>

        <button type="button" onClick={handleAdd} style={primaryBtnStyle}>
          {t('routines.addRoutine')}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: theme.colors.muted }}>{t('loading')}</p>
      ) : routines.length === 0 ? (
        <EmptyStateAction
          emoji="⚡"
          headline={t('routines.empty', 'No routines yet.')}
          body={t('routines.emptyBody', 'A single consistent routine — even 10 minutes — is more valuable than any app, book, or plan. Start with one thing you want to do every day.')}
          ctaLabel={t('routines.emptyCta', 'Build your first routine')}
          onCta={() => {
            const titleInput = document.getElementById('routine-title') as HTMLInputElement | null;
            titleInput?.focus();
          }}
          secondaryLabel={t('routines.tpl.showGallery', '🔬 Browse research-backed protocols')}
          onSecondary={() => setShowRoutineGallery(true)}
          accentColor="#8B5CF6"
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.md}px` }}>
          {routines.map((routine) => {
            const due = isRoutineDueToday(routine);
            const isEditing = editingId === routine.id;
            const isDeleting = deletingId === routine.id;

            return (
              <li
                key={routine.id}
                style={{
                  border: `1px solid ${due ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: theme.shape.radiusMd,
                  padding: `${theme.spacing.md}px`,
                  backgroundColor: theme.colors.surface,
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
                    <label htmlFor={`edit-title-${routine.id}`} style={{ color: theme.colors.text }}>
                      {t('routines.titleLabel')}
                      <input
                        id={`edit-title-${routine.id}`}
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
                      />
                    </label>
                    {editErrors.title && (
                      <p role="alert" style={{ margin: 0, color: theme.colors.accent }}>
                        {editErrors.title}
                      </p>
                    )}

                    <label htmlFor={`edit-desc-${routine.id}`} style={{ color: theme.colors.text }}>
                      {t('routines.descriptionLabel')}
                      <input
                        id={`edit-desc-${routine.id}`}
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
                      />
                    </label>

                    <label htmlFor={`edit-freq-${routine.id}`} style={{ color: theme.colors.text }}>
                      {t('routines.frequencyLabel')}
                      <select
                        id={`edit-freq-${routine.id}`}
                        value={editForm.frequency}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            frequency: e.target.value as Routine['frequency'],
                          }))
                        }
                        style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
                      >
                        <option value="DAILY">{t('routines.frequencyDaily')}</option>
                        <option value="WEEKLY">{t('routines.frequencyWeekly')}</option>
                        <option value="CUSTOM">{t('routines.frequencyCustom')}</option>
                      </select>
                    </label>

                    <label htmlFor={`edit-trigger-${routine.id}`} style={{ color: theme.colors.text }}>
                      {t('routines.triggerTimeLabel')}
                      <input
                        id={`edit-trigger-${routine.id}`}
                        type="time"
                        value={editForm.triggerTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, triggerTime: e.target.value }))}
                        style={{ ...inputStyle, display: 'block', marginTop: `${theme.spacing.xs}px` }}
                      />
                    </label>

                    <label htmlFor={`edit-anchor-${routine.id}`} style={{ fontWeight: 600, display: 'block' }}>
                      {t('routines.anchorLabel', 'Stack onto a habit (optional)')}
                    </label>
                    <input
                      id={`edit-anchor-${routine.id}`}
                      type="text"
                      value={editForm.anchorHabit}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, anchorHabit: e.target.value }))}
                      placeholder={t('routines.anchorPlaceholder', 'e.g. After morning coffee')}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <p style={{ margin: '2px 0 0', color: theme.colors.muted, fontSize: '0.8125rem' }}>
                      {t('routines.anchorHelper', 'Anchoring to an existing habit makes this much more likely to stick.')}
                    </p>

                    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                      <legend style={{ color: theme.colors.text, marginBottom: `${theme.spacing.xs}px` }}>
                        {t('routines.stepsLabel')}
                      </legend>
                      {renderStepFields(editForm.steps, setEditForm, `edit-${routine.id}`)}
                    </fieldset>

                    <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleSaveEdit} style={primaryBtnStyle}>
                        {t('routines.saveRoutine')}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} style={ghostBtnStyle}>
                        {t('routines.cancelEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: `${theme.spacing.xs}px` }}
                    >
                      <div>
                        <strong style={{ color: theme.colors.text, fontFamily: theme.typography.heading.family }}>
                          {routine.title}
                        </strong>
                        {routine.triggerTime && (
                          <span style={{ marginLeft: `${theme.spacing.sm}px`, color: theme.colors.muted, fontSize: '0.875rem' }}>
                            {routine.triggerTime}
                          </span>
                        )}
                        <span
                          style={{
                            marginLeft: `${theme.spacing.sm}px`,
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: due ? theme.colors.primary : theme.colors.border,
                            color: due ? theme.colors.primaryForeground : theme.colors.muted,
                          }}
                        >
                          {due ? t('routines.dueBadge') : t('routines.doneBadge')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, flexWrap: 'wrap' }}>
                        {isDeleting ? (
                          <>
                            <span style={{ color: theme.colors.text, alignSelf: 'center', fontSize: '0.875rem' }}>
                              {t('routines.confirmDelete', { title: routine.title })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(routine.id)}
                              style={{ ...primaryBtnStyle, backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }}
                            >
                              {t('yesLabel')}
                            </button>
                            <button type="button" onClick={() => setDeletingId(null)} style={ghostBtnStyle}>
                              {t('cancelLabel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(routine)}
                              aria-label={t('routines.editLabel', { title: routine.title })}
                              style={ghostBtnStyle}
                            >
                              {t('editLabel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(routine.id)}
                              aria-label={t('routines.deleteLabel', { title: routine.title })}
                              style={ghostBtnStyle}
                            >
                              {t('deleteLabel')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {routine.description && (
                      <p style={{ margin: `${theme.spacing.xs}px 0 0`, color: theme.colors.muted, fontSize: '0.875rem' }}>
                        {routine.description}
                      </p>
                    )}

                    {/* Anchor habit display */}
                    {routine.anchorHabit && (
                      <p style={{ margin: '4px 0 0', color: theme.colors.primary, fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {t('routines.anchorDisplay', { habit: routine.anchorHabit.replace(/^after\s+/i, ''), defaultValue: `After ${routine.anchorHabit.replace(/^after\s+/i, '')}, I will do this routine` })}
                      </p>
                    )}
                    {/* 21-day streak dots */}
                    <StreakDots completionLog={routine.completionLog ?? []} theme={theme} />

                    {routine.steps.length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: `${theme.spacing.sm}px 0 0`, display: 'grid', gap: '4px' }}>
                        {routine.steps.map((step, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: `${theme.spacing.xs}px` }}>
                            <input
                              type="checkbox"
                              id={`step-${routine.id}-${i}`}
                              checked={step.done}
                              onChange={() => toggleStep(routine.id, i)}
                              aria-label={t('routines.toggleStep', { label: step.label })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label
                              htmlFor={`step-${routine.id}-${i}`}
                              style={{
                                color: step.done ? theme.colors.muted : theme.colors.text,
                                textDecoration: step.done ? 'line-through' : 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {step.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}

                    {due && (
                      <button
                        type="button"
                        onClick={() => {
                          completeRoutine(routine.id);
                          track(Events.ROUTINE_COMPLETED, { routineId: routine.id });
                          setLastCompletedTitle(routine.title);
                          setShowWinCard(true);
                        }}
                        style={{ ...primaryBtnStyle, marginTop: `${theme.spacing.sm}px` }}
                      >
                        {t('routines.completeButton')}
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {showWinCard && (
        <WinCard
          type="routine_complete"
          label={lastCompletedTitle || 'Routine complete'}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </section>
  );
};

export default RoutinesView;
