import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import ValidationSummary from '../../../components/ValidationSummary.jsx';
import { useTheme } from '../../../core/context/ThemeContext';
import type { SocialPlan, SocialStep } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';
import useSocialPlans from '../hooks/useSocialPlans';
import { fetchSocialSuggestions } from '../utils/openAiSocial';
import { SOCIAL_TEMPLATES, type SocialTemplate } from '../utils/socialTemplates';
import {
  collectValidationMessages,
  hasValidationErrors,
  logValidationSummary
} from '../../../core/utils/validationSummary';

type SocialPlanFormState = {
  title: string;
  type: SocialPlan['type'];
  energyLevel: SocialPlan['energyLevel'];
  dateTime: string;
  reminderMinutesBefore: string;
  notes: string;
  steps: SocialStep[];
  templateId: SocialTemplate['id'] | '';
};

type ValidationState = {
  title: string;
  dateTime: string;
  reminderMinutesBefore: string;
};

const DEFAULT_STEPS_COUNT = 3;

const createEmptySteps = (count = DEFAULT_STEPS_COUNT): SocialStep[] =>
  Array.from({ length: count }, () => ({ label: '', done: false }));

const parseDateTime = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value: string, language: string) => {
  const parsed = parseDateTime(value);
  if (!parsed) return null;
  return new Intl.DateTimeFormat(language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
};

const normalizeSteps = (steps: SocialStep[]) =>
  steps
    .map((step) => ({ ...step, label: step.label.trim() }))
    .filter((step) => step.label.length > 0);

const buildValidation = (
  fields: SocialPlanFormState,
  t: (key: string, options?: Record<string, unknown>) => string
): ValidationState => {
  const validation: ValidationState = {
    title: '',
    dateTime: '',
    reminderMinutesBefore: ''
  };

  if (!fields.title.trim()) {
    validation.title = t('validation.titleRequired');
  }

  if (fields.dateTime && !parseDateTime(fields.dateTime)) {
    validation.dateTime = t('validation.invalidDateTime');
  }

  if (fields.reminderMinutesBefore) {
    const reminder = Number(fields.reminderMinutesBefore);
    if (Number.isNaN(reminder) || reminder < 0) {
      validation.reminderMinutesBefore = t('validation.nonNegativeNumber');
    }
  }

  return validation;
};

const SocialPlansView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { ttsEnabled } = useAccessibility();
  const { plans, loading, addPlan, updatePlan, removePlan, toggleStep, readPlan } = useSocialPlans();

  const [form, setForm] = useState<SocialPlanFormState>({
    title: '',
    type: 'CALL',
    energyLevel: 'LOW',
    dateTime: '',
    reminderMinutesBefore: '',
    notes: '',
    steps: createEmptySteps(),
    templateId: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SocialPlanFormState>({
    title: '',
    type: 'CALL',
    energyLevel: 'LOW',
    dateTime: '',
    reminderMinutesBefore: '',
    notes: '',
    steps: createEmptySteps(),
    templateId: ''
  });
  const [touched, setTouched] = useState({
    title: false,
    dateTime: false,
    reminderMinutesBefore: false
  });
  const [editTouched, setEditTouched] = useState({
    title: false,
    dateTime: false,
    reminderMinutesBefore: false
  });
  const [addSummary, setAddSummary] = useState<string[]>([]);
  const [editSummary, setEditSummary] = useState<string[]>([]);
  const [aiOptIn, setAiOptIn] = useState(false);
  const [aiStatus, setAiStatus] = useState({ loading: false, message: '' });

  const templateOptions = useMemo(() => SOCIAL_TEMPLATES, []);

  const addValidation = useMemo(() => {
    if (!touched.title && !touched.dateTime && !touched.reminderMinutesBefore) {
      return { title: '', dateTime: '', reminderMinutesBefore: '' };
    }
    return buildValidation(form, t);
  }, [form, t, touched]);

  const editValidation = useMemo(() => {
    if (!editTouched.title && !editTouched.dateTime && !editTouched.reminderMinutesBefore) {
      return { title: '', dateTime: '', reminderMinutesBefore: '' };
    }
    return buildValidation(editForm, t);
  }, [editForm, editTouched, t]);

  useEffect(() => {
    if (!hasValidationErrors(addValidation)) {
      setAddSummary([]);
    }
  }, [addValidation]);

  useEffect(() => {
    if (!hasValidationErrors(editValidation)) {
      setEditSummary([]);
    }
  }, [editValidation]);

  const selectedTemplate = templateOptions.find((template) => template.id === form.templateId);

  const applyTemplate = useCallback(
    (template: SocialTemplate, useFallbackNotes = true) => {
      const steps = template.stepKeys.map((key) => ({ label: t(key), done: false }));
      const notes = useFallbackNotes ? t(template.notesKey) : form.notes;
      setForm((prev) => ({
        ...prev,
        type: template.type,
        title: prev.title || t(template.titleKey),
        notes: notes || prev.notes,
        steps,
        templateId: template.id
      }));
      setAiStatus({ loading: false, message: '' });
    },
    [form.notes, t]
  );

  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      setAiStatus({ loading: false, message: t('social.aiSelectTemplate') });
      return;
    }
    applyTemplate(selectedTemplate);
  };

  const handleGenerateSuggestions = async () => {
    if (!selectedTemplate) {
      setAiStatus({ loading: false, message: t('social.aiSelectTemplate') });
      return;
    }

    setAiStatus({ loading: true, message: '' });

    const fallbackSteps = selectedTemplate.stepKeys.map((key) => t(key));
    const fallbackNotes = t(selectedTemplate.notesKey);

    const suggestion = aiOptIn
      ? await fetchSocialSuggestions({
          templateSummary: t(selectedTemplate.descriptionKey),
          energyLevel: form.energyLevel,
          locale: i18n.language
        })
      : null;

    const steps = (suggestion?.steps ?? fallbackSteps).map((label) => ({ label, done: false }));
    const notes = suggestion?.notes ?? fallbackNotes;

    setForm((prev) => ({
      ...prev,
      type: selectedTemplate.type,
      title: prev.title || t(selectedTemplate.titleKey),
      notes: notes || prev.notes,
      steps,
      templateId: selectedTemplate.id
    }));

    setAiStatus({
      loading: false,
      message: suggestion ? '' : t('social.aiFallbackUsed')
    });
  };

  const handleAddPlan = async () => {
    const validation = buildValidation(form, t);
    setTouched({ title: true, dateTime: true, reminderMinutesBefore: true });

    const messages = collectValidationMessages(validation);
    if (messages.length) {
      setAddSummary(messages);
      logValidationSummary('social-add', messages);
      return;
    }
    setAddSummary([]);

    const created = await addPlan({
      title: form.title.trim(),
      type: form.type,
      dateTime: form.dateTime || null,
      steps: normalizeSteps(form.steps),
      reminderMinutesBefore: form.reminderMinutesBefore ? Number(form.reminderMinutesBefore) : null,
      energyLevel: form.energyLevel,
      notes: form.notes.trim() || null
    });

    if (created) {
      setForm({
        title: '',
        type: 'CALL',
        energyLevel: 'LOW',
        dateTime: '',
        reminderMinutesBefore: '',
        notes: '',
        steps: createEmptySteps(),
        templateId: ''
      });
      setTouched({ title: false, dateTime: false, reminderMinutesBefore: false });
      setAiStatus({ loading: false, message: '' });
      setAddSummary([]);
    }
  };

  const startEdit = (plan: SocialPlan) => {
    setEditingId(plan.id);
    setEditForm({
      title: plan.title ?? '',
      type: plan.type,
      energyLevel: plan.energyLevel ?? 'LOW',
      dateTime: plan.dateTime ?? '',
      reminderMinutesBefore:
        plan.reminderMinutesBefore != null ? String(plan.reminderMinutesBefore) : '',
      notes: plan.notes ?? '',
      steps: plan.steps.length ? plan.steps : createEmptySteps(),
      templateId: ''
    });
    setEditTouched({ title: false, dateTime: false, reminderMinutesBefore: false });
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const validation = buildValidation(editForm, t);
    setEditTouched({ title: true, dateTime: true, reminderMinutesBefore: true });

    const messages = collectValidationMessages(validation);
    if (messages.length) {
      setEditSummary(messages);
      logValidationSummary('social-edit', messages);
      return;
    }
    setEditSummary([]);

    const updated = await updatePlan(editingId, {
      title: editForm.title.trim(),
      type: editForm.type,
      dateTime: editForm.dateTime || null,
      steps: normalizeSteps(editForm.steps),
      reminderMinutesBefore: editForm.reminderMinutesBefore
        ? Number(editForm.reminderMinutesBefore)
        : null,
      energyLevel: editForm.energyLevel,
      notes: editForm.notes.trim() || null
    });

    if (updated) {
      setEditingId(null);
      setEditSummary([]);
    }
  };

  const handleDelete = async (plan: SocialPlan) => {
    const confirmed = window.confirm(t('social.confirmDelete', { title: plan.title }));
    if (!confirmed) return;
    await removePlan(plan.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const renderStepsEditor = (
    steps: SocialStep[],
    onChange: (next: SocialStep[]) => void,
    onTouch?: () => void,
    prefix = 'steps'
  ) => (
    <fieldset
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        margin: 0
      }}
    >
      <legend style={{ padding: `0 ${theme.spacing.xs}px`, fontWeight: 600 }}>{t('social.stepsLabel')}</legend>
      <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted }}>{t('social.stepsHelper')}</p>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {steps.map((step, index) => (
          <div key={`${prefix}-${index.toString()}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={step.label}
              placeholder={t('social.stepPlaceholder')}
              onChange={(event) => {
                const next = steps.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, label: event.target.value } : entry
                );
                onChange(next);
                onTouch?.();
              }}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusMd,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.background,
                color: theme.colors.text
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = steps.filter((_, entryIndex) => entryIndex !== index);
                onChange(next);
                onTouch?.();
              }}
              aria-label={t('social.removeStep')}
              style={{
                minHeight: '44px',
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusMd,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              {t('social.removeStep')}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onChange([...steps, { label: '', done: false }]);
          onTouch?.();
        }}
        style={{
          marginTop: '0.5rem',
          minHeight: '44px',
          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusMd,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text
        }}
      >
        {t('social.addStep')}
      </button>
    </fieldset>
  );

  const renderPlanForm = (
    fields: SocialPlanFormState,
    setFields: React.Dispatch<React.SetStateAction<SocialPlanFormState>>,
    validation: ValidationState,
    fieldTouched: { title: boolean; dateTime: boolean; reminderMinutesBefore: boolean },
    setFieldTouched: React.Dispatch<
      React.SetStateAction<{ title: boolean; dateTime: boolean; reminderMinutesBefore: boolean }>
    >
  ) => (
    <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('titleLabel')}
        <input
          type="text"
          value={fields.title}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, title: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, title: true }));
          }}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.title && validation.title ? (
          <span style={{ color: theme.colors.accent }}>{validation.title}</span>
        ) : null}
      </label>

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('social.typeLabel')}
        <select
          value={fields.type}
          onChange={(event) => setFields((prev) => ({ ...prev, type: event.target.value as SocialPlan['type'] }))}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        >
          <option value="CALL">{t('social.type.call')}</option>
          <option value="MEETUP">{t('social.type.meetup')}</option>
          <option value="MESSAGE">{t('social.type.message')}</option>
          <option value="EVENT">{t('social.type.event')}</option>
        </select>
      </label>

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('social.energyLabel')}
        <select
          value={fields.energyLevel}
          onChange={(event) =>
            setFields((prev) => ({ ...prev, energyLevel: event.target.value as SocialPlan['energyLevel'] }))
          }
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        >
          <option value="LOW">{t('social.energy.low')}</option>
          <option value="MED">{t('social.energy.med')}</option>
          <option value="HIGH">{t('social.energy.high')}</option>
        </select>
      </label>

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('social.dateTimeLabel')}
        <input
          type="datetime-local"
          value={fields.dateTime}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, dateTime: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, dateTime: true }));
          }}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.dateTime && validation.dateTime ? (
          <span style={{ color: theme.colors.accent }}>{validation.dateTime}</span>
        ) : null}
      </label>

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('social.reminderLabel')}
        <input
          type="number"
          min="0"
          value={fields.reminderMinutesBefore}
          onChange={(event) => {
            setFields((prev) => ({ ...prev, reminderMinutesBefore: event.target.value }));
            setFieldTouched((prev) => ({ ...prev, reminderMinutesBefore: true }));
          }}
          style={{
            minHeight: '44px',
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text
          }}
        />
        {fieldTouched.reminderMinutesBefore && validation.reminderMinutesBefore ? (
          <span style={{ color: theme.colors.accent }}>{validation.reminderMinutesBefore}</span>
        ) : null}
        <span style={{ color: theme.colors.muted }}>{
          ttsEnabled ? t('social.reminderHelperTtsOn') : t('social.reminderHelperTtsOff')
        }</span>
      </label>

      {renderStepsEditor(fields.steps, (next) => setFields((prev) => ({ ...prev, steps: next })))}

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
        {t('notesLabel')}
        <textarea
          rows={3}
          value={fields.notes}
          onChange={(event) => setFields((prev) => ({ ...prev, notes: event.target.value }))}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            fontFamily: theme.typography.body.family
          }}
        />
      </label>
    </div>
  );

  const renderTemplateCard = (template: SocialTemplate) => (
    <div
      key={template.id}
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusSm,
        padding: `${theme.spacing.sm}px`,
        backgroundColor: theme.colors.surface,
        display: 'grid',
        gap: `${theme.spacing.xs}px`
      }}
    >
      <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
        <input
          type="radio"
          name="social-template"
          value={template.id}
          checked={form.templateId === template.id}
          onChange={() => setForm((prev) => ({ ...prev, templateId: template.id }))}
        />
        <span style={{ fontWeight: 600 }}>{t(template.labelKey)}</span>
      </label>
      <p style={{ margin: 0, color: theme.colors.muted }}>{t(template.descriptionKey)}</p>
    </div>
  );

  return (
    <SectionCard
      ariaLabel={`${t('social.title')} module`}
      title={t('social.title')}
      subtitle={t('social.description')}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.lg}px` }}>
        <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
          <h3 style={{ margin: 0 }}>{t('social.templatesHeading')}</h3>
          <p style={{ margin: 0, color: theme.colors.muted }}>{t('social.templatesHelper')}</p>
          <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            {templateOptions.map(renderTemplateCard)}
          </div>
          <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={aiOptIn}
              onChange={(event) => setAiOptIn(event.target.checked)}
            />
            <span>{t('social.aiOptIn')}</span>
          </label>
          <p style={{ margin: 0, color: theme.colors.muted }}>{t('social.aiPrivacy')}</p>
          {aiStatus.message ? <p style={{ margin: 0, color: theme.colors.accent }}>{aiStatus.message}</p> : null}
          <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleApplyTemplate}
              style={{
                minHeight: '44px',
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              {t('social.applyTemplate')}
            </button>
            <button
              type="button"
              onClick={handleGenerateSuggestions}
              disabled={aiStatus.loading}
              style={{
                minHeight: '44px',
                padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusSm,
                border: `1px solid ${theme.colors.primary}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.background,
                opacity: aiStatus.loading ? 0.7 : 1
              }}
            >
              {aiStatus.loading ? t('loading') : t('social.generateSuggestions')}
            </button>
          </div>
        </section>

        <section style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
          <h3 style={{ margin: 0 }}>{t('social.addHeading')}</h3>
          <ValidationSummary messages={addSummary} id="social-add-summary" />
          {renderPlanForm(form, setForm, addValidation, touched, setTouched)}
          <button
            type="button"
            onClick={handleAddPlan}
            style={{
              minHeight: '44px',
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
              fontWeight: 600
            }}
          >
            {t('social.addPlan')}
          </button>
        </section>

        <section>
          <h3 style={{ marginTop: 0 }}>{t('social.plansHeading')}</h3>
          {loading ? <p style={{ color: theme.colors.muted }}>{t('loading')}</p> : null}
          {!loading && plans.length === 0 ? (
            <p style={{ color: theme.colors.muted }}>{t('social.empty')}</p>
          ) : null}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: `${theme.spacing.md}px` }}>
            {plans.map((plan) => {
              if (editingId === plan.id) {
                return (
                  <li
                    key={plan.id}
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.shape.radiusSm,
                      padding: `${theme.spacing.md}px`,
                      backgroundColor: theme.colors.surface
                    }}
                  >
                    <ValidationSummary messages={editSummary} id={`social-edit-summary-${plan.id}`} />
                    {renderPlanForm(editForm, setEditForm, editValidation, editTouched, setEditTouched)}
                    <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        style={{
                          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                          borderRadius: theme.shape.radiusSm,
                          border: `1px solid ${theme.colors.primary}`,
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.background
                        }}
                      >
                        {t('saveLabel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                          borderRadius: theme.shape.radiusSm,
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text
                        }}
                      >
                        {t('cancelLabel')}
                      </button>
                    </div>
                  </li>
                );
              }

              const dateLabel = plan.dateTime ? formatDateTime(plan.dateTime, i18n.language) : null;
              const reminderLabel =
                plan.reminderMinutesBefore != null
                  ? t('social.reminderSummary', { minutes: plan.reminderMinutesBefore })
                  : t('social.reminderNone');

              return (
                <li
                  key={plan.id}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.shape.radiusSm,
                    padding: `${theme.spacing.md}px`,
                    backgroundColor: theme.colors.surface
                  }}
                >
                  <div style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
                    <div style={{ fontWeight: theme.typography.heading.weight }}>{plan.title}</div>
                    <div style={{ color: theme.colors.muted }}>
                      {t('social.typeSummary', { type: t(`social.type.${plan.type.toLowerCase()}`) })}
                    </div>
                    <div style={{ color: theme.colors.muted }}>
                      {t('social.energySummary', { energy: t(`social.energy.${plan.energyLevel.toLowerCase()}`) })}
                    </div>
                    {dateLabel ? <div>{dateLabel}</div> : <div>{t('social.dateTimeOptional')}</div>}
                    <div style={{ color: theme.colors.muted }}>{reminderLabel}</div>
                    {plan.notes ? <div>{plan.notes}</div> : null}
                  </div>
                  {plan.steps.length ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: `${theme.spacing.sm}px 0 0` }}>
                      {plan.steps.map((step, index) => (
                        <li key={`${plan.id}-step-${index.toString()}`} style={{ marginBottom: '0.25rem' }}>
                          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={step.done}
                              onChange={() => toggleStep(plan.id, index)}
                            />
                            <span style={{ color: step.done ? theme.colors.muted : theme.colors.text }}>
                              {step.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px` }}>
                    <button
                      type="button"
                      onClick={() => readPlan(plan)}
                      disabled={!ttsEnabled}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text,
                        opacity: ttsEnabled ? 1 : 0.6
                      }}
                    >
                      {t('social.readPlan')}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('editLabel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        borderRadius: theme.shape.radiusSm,
                        border: `1px solid ${theme.colors.accent}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                    >
                      {t('deleteLabel')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </SectionCard>
  );
};

export default SocialPlansView;
