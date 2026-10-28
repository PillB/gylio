import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import HelpField from '../../../components/atoms/HelpField';
import { useAppAuth } from '../../../core/context/AuthContext';
import { useTheme } from '../../../core/context/ThemeContext';
import type { SocialPlan, SocialStep } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';
import useSocialPlans from '../hooks/useSocialPlans';
import { PostReflectionPrompt } from './PostReflectionPrompt';
import { RelationshipTypePicker } from './RelationshipTypePicker';
import { TemplateGallery } from './TemplateGallery';
import { fetchSocialSuggestions } from '../utils/openAiSocial';
import { serverFeaturesEnabled } from '../../../core/utils/serverFeatures';
import { getScheduleQuota } from '../../auth/useScheduleQuota';
import {
  buildSocialPlanValidation,
  createEmptySocialSteps,
  formatSocialPlanDateTime,
  hasSocialPlanErrors,
  normalizeSocialPlanSteps,
  type SocialPlanFormState,
  type SocialPlanValidationState
} from '../utils/socialPlanForm';
import type { RelationshipType, SocialTemplate as LibrarySocialTemplate } from '../data/socialTemplateLibrary';

/** The AI choice, only in a build that has the server for it (serverFeatures.ts); elsewhere the template is the plan. */
export function AiOptIn({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (!serverFeaturesEnabled()) return null;
  return (
    <>
      <label style={{ display: 'flex', gap: `${theme.spacing.xs}px`, alignItems: 'center' }}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{t('social.aiOptIn')}</span>
      </label>
      <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.8125rem' }}>{t('social.aiPrivacy')}</p>
    </>
  );
}

const SocialPlansView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { ttsEnabled } = useAccessibility();
  const { plans, loading, addPlan, updatePlan, removePlan, toggleStep, readPlan } = useSocialPlans();
  const { userId } = useAppAuth();

  const [form, setForm] = useState<SocialPlanFormState>({
    title: '',
    type: 'CALL',
    energyLevel: 'LOW',
    dateTime: '',
    reminderMinutesBefore: '',
    notes: '',
    steps: createEmptySocialSteps(),
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
    steps: createEmptySocialSteps(),
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

  // New relationship + template selection state
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType | null>(null);
  const [selectedLibraryTemplate, setSelectedLibraryTemplate] = useState<LibrarySocialTemplate | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  const [aiOptIn, setAiOptIn] = useState(false);
  const [aiStatus, setAiStatus] = useState({ loading: false, message: '' });

  const addValidation = useMemo(() => {
    if (!touched.title && !touched.dateTime && !touched.reminderMinutesBefore) {
      return { title: '', dateTime: '', reminderMinutesBefore: '' };
    }
    return buildSocialPlanValidation(form, t);
  }, [form, t, touched]);

  const editValidation = useMemo(() => {
    if (!editTouched.title && !editTouched.dateTime && !editTouched.reminderMinutesBefore) {
      return { title: '', dateTime: '', reminderMinutesBefore: '' };
    }
    return buildSocialPlanValidation(editForm, t);
  }, [editForm, editTouched, t]);

  // Apply a library template to the form
  const applyLibraryTemplate = useCallback(
    (template: LibrarySocialTemplate, starter: string | null) => {
      const steps = template.stepKeys.map((key) => ({ label: t(key, key.split('.').pop() ?? key), done: false }));
      const notes = starter ?? t(template.notesKey, '');
      setForm((prev) => ({
        ...prev,
        type: template.planType,
        title: prev.title || t(template.titleKey, template.id),
        energyLevel: template.energyLevel,
        notes: notes || prev.notes,
        steps,
        templateId: template.id
      }));
      setSelectedLibraryTemplate(template);
      setShowGallery(false);
      setAiStatus({ loading: false, message: '' });
    },
    [t]
  );

  const handleRelationshipSelect = (type: RelationshipType) => {
    setSelectedRelationshipType(type);
    setShowGallery(true);
  };

  const handleGenerateSuggestions = async () => {
    if (!selectedLibraryTemplate) {
      setAiStatus({ loading: false, message: t('social.aiSelectTemplate') });
      return;
    }

    setAiStatus({ loading: true, message: '' });

    const fallbackSteps = selectedLibraryTemplate.stepKeys.map((key) => t(key, key));
    const fallbackNotes = t(selectedLibraryTemplate.notesKey, '');

    // AI only when this build has the server for it and the person asked; otherwise the template is the plan.
    const askAi = aiOptIn && serverFeaturesEnabled();
    let suggestion = null;
    if (askAi) {
      const quota = getScheduleQuota(userId);
      if (quota.isExhausted) {
        setAiStatus({ loading: false, message: t('social.aiQuotaExhausted') });
        return;
      }
      suggestion = await fetchSocialSuggestions({
        templateSummary: t(selectedLibraryTemplate.descriptionKey, ''),
        energyLevel: form.energyLevel,
        locale: i18n.language
      });
      if (suggestion) {
        quota.consumeOne();
      }
    }

    const steps = (suggestion?.steps ?? fallbackSteps).map((label) => ({ label, done: false }));
    const notes = suggestion?.notes ?? fallbackNotes;

    setForm((prev) => ({
      ...prev,
      type: selectedLibraryTemplate.planType,
      title: prev.title || t(selectedLibraryTemplate.titleKey, selectedLibraryTemplate.id),
      notes: notes || prev.notes,
      steps,
      templateId: selectedLibraryTemplate.id
    }));

    setAiStatus({
      loading: false,
      message: suggestion || !askAi ? '' : t('social.aiFallbackUsed')
    });
  };

  const handleAddPlan = async () => {
    const validation = buildSocialPlanValidation(form, t);
    setTouched({ title: true, dateTime: true, reminderMinutesBefore: true });

    if (hasSocialPlanErrors(validation)) return;

    const created = await addPlan({
      title: form.title.trim(),
      type: form.type,
      dateTime: form.dateTime || null,
      steps: normalizeSocialPlanSteps(form.steps),
      reminderMinutesBefore: form.reminderMinutesBefore ? Number(form.reminderMinutesBefore) : null,
      energyLevel: form.energyLevel,
      notes: form.notes.trim() || null,
      relationshipType: selectedRelationshipType
    });

    if (created) {
      setForm({
        title: '',
        type: 'CALL',
        energyLevel: 'LOW',
        dateTime: '',
        reminderMinutesBefore: '',
        notes: '',
        steps: createEmptySocialSteps(),
        templateId: ''
      });
      setTouched({ title: false, dateTime: false, reminderMinutesBefore: false });
      setAiStatus({ loading: false, message: '' });
      setSelectedLibraryTemplate(null);
      setShowGallery(false);
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
      steps: plan.steps.length ? plan.steps : createEmptySocialSteps(),
      templateId: ''
    });
    setEditTouched({ title: false, dateTime: false, reminderMinutesBefore: false });
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const validation = buildSocialPlanValidation(editForm, t);
    setEditTouched({ title: true, dateTime: true, reminderMinutesBefore: true });

    if (hasSocialPlanErrors(validation)) return;

    const updated = await updatePlan(editingId, {
      title: editForm.title.trim(),
      type: editForm.type,
      dateTime: editForm.dateTime || null,
      steps: normalizeSocialPlanSteps(editForm.steps),
      reminderMinutesBefore: editForm.reminderMinutesBefore
        ? Number(editForm.reminderMinutesBefore)
        : null,
      energyLevel: editForm.energyLevel,
      notes: editForm.notes.trim() || null
    });

    if (updated) {
      setEditingId(null);
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
        margin: 0,
        // A fieldset is never narrower than its content by default, so a long step pushed it past the card.
        minWidth: 0
      }}
    >
      <legend style={{ padding: `0 ${theme.spacing.xs}px`, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {t('social.stepsLabel')}
        <BudgetTooltip content={t('tooltips.social.steps', "Break the connection plan into small actions: 'text to suggest a date', 'book the restaurant', 'confirm the day before'. Each step removes a reason to postpone.")} />
      </legend>
      <p style={{ margin: '0 0 0.5rem', color: theme.colors.muted }}>{t('social.stepsHelper')}</p>
      <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {steps.map((step, index) => (
          <div key={`${prefix}-${index.toString()}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={step.label}
              aria-label={t('social.stepAria', { n: index + 1 })}
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
                minWidth: 0,
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
              aria-label={t('social.removeStepAria', { n: index + 1 })}
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
    validation: SocialPlanValidationState,
    fieldTouched: { title: boolean; dateTime: boolean; reminderMinutesBefore: boolean },
    setFieldTouched: React.Dispatch<
      React.SetStateAction<{ title: boolean; dateTime: boolean; reminderMinutesBefore: boolean }>
    >
  ) => (
    <div style={{ display: 'grid', gap: `${theme.spacing.sm}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <HelpField
        label={t('titleLabel')}
        labelStyle={{ fontWeight: 600 }}
        style={{ gap: `${theme.spacing.xs}px` }}
        help={<BudgetTooltip content={t('tooltips.social.planTitle', "Give this connection plan a name. Keep it simple: 'Brunch with Sofia' or 'Call Mom weekly'. The clearer the plan, the easier it is to actually follow through.")} />}
        error={fieldTouched.title && validation.title ? validation.title : undefined}
      >
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
      </HelpField>

      <HelpField
        label={t('social.typeLabel')}
        labelStyle={{ fontWeight: 600 }}
        style={{ gap: `${theme.spacing.xs}px` }}
        help={<BudgetTooltip content={t('tooltips.social.planType', 'What kind of interaction is this? Call = phone/video; Meetup = in-person; Message = text/email; Event = shared experience. Each type has different friction — start with the lowest friction option.')} />}
      >
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
      </HelpField>

      <HelpField
        label={t('social.energyLabel')}
        labelStyle={{ fontWeight: 600 }}
        style={{ gap: `${theme.spacing.xs}px` }}
        help={<BudgetTooltip content={t('tooltips.social.energyLevel', 'How much social energy does this interaction require? Match this to your available energy — low-energy days are perfect for a quick message, high-energy days for a real meetup.')} />}
      >
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
      </HelpField>

      <HelpField
        label={t('social.dateTimeLabel')}
        labelStyle={{ fontWeight: 600 }}
        style={{ gap: `${theme.spacing.xs}px` }}
        help={<BudgetTooltip content={t('tooltips.social.dateTime', "When do you want this to happen? A specific date is easier to keep than 'sometime soon'.")} />}
        error={fieldTouched.dateTime && validation.dateTime ? validation.dateTime : undefined}
      >
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
      </HelpField>

      <HelpField
        label={t('social.reminderLabel')}
        style={{ gap: `${theme.spacing.xs}px` }}
        error={fieldTouched.reminderMinutesBefore && validation.reminderMinutesBefore ? validation.reminderMinutesBefore : undefined}
        hint={ttsEnabled ? t('social.reminderHelperTtsOn') : t('social.reminderHelperTtsOff')}
      >
        <input
          type="number"
          min="0"
          inputMode="numeric"
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
      </HelpField>

      {renderStepsEditor(fields.steps, (next) => setFields((prev) => ({ ...prev, steps: next })))}

      <label style={{ display: 'grid', gap: `${theme.spacing.xs}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {t('notesLabel')}
        <textarea
          rows={3}
          value={fields.notes}
          onChange={(event) => setFields((prev) => ({ ...prev, notes: event.target.value }))}
          style={{
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
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

  return (
    <SectionCard
      title={t('social.title')}
      subtitle={t('social.description')}
      badge={<BudgetTooltip content={t('tooltips.social.section', "Relationships drift without intentional effort. This tab helps you plan regular check-ins and activities with people who matter — before distance sets in.")} />}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.lg}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* ── Step 1: Who is this for? ─────────────────────────────────── */}
        <section data-tour="social-relationship" style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
          <RelationshipTypePicker
            selected={selectedRelationshipType}
            onSelect={handleRelationshipSelect}
            theme={theme}
          />

          {/* Step 2: Template gallery (appears when relationship is selected) */}
          {selectedRelationshipType && showGallery && (
            <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: `${theme.spacing.xs}px`
              }}>
                <p style={{ margin: 0, fontWeight: 600, color: theme.colors.text, fontSize: '0.9rem' }}>
                  {t('social.gallery.browsing', 'Pick a ready-made plan:')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowGallery(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.muted,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    minHeight: 44,
                    padding: 0,
                    fontFamily: theme.typography.body.family
                  }}
                >
                  {t('social.startFromScratch', 'Skip — start from scratch')}
                </button>
              </div>
              <TemplateGallery
                relationshipType={selectedRelationshipType}
                onSelect={applyLibraryTemplate}
                theme={theme}
              />
            </div>
          )}

          {/* Selected template indicator */}
          {selectedLibraryTemplate && !showGallery && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: `${theme.spacing.xs}px`,
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusMd,
              backgroundColor: `${theme.colors.primary}10`,
              border: `1px solid ${theme.colors.primary}30`,
            }}>
              <span style={{ fontSize: '0.8125rem', color: theme.colors.primary, flex: 1 }}>
                ✓ {t(selectedLibraryTemplate.titleKey, selectedLibraryTemplate.id)}
              </span>
              <button
                type="button"
                onClick={() => { setShowGallery(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.primary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0,
                  fontFamily: theme.typography.body.family
                }}
              >
                {t('social.changeTemplate', 'Change')}
              </button>
            </div>
          )}
        </section>

        {/* ── Step 3: Create plan form (always visible) ──────────────── */}
        {!showGallery && (
          <section data-tour="social-form" style={{ display: 'grid', gap: `${theme.spacing.sm}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <h3 style={{ margin: 0 }}>{t('social.addHeading')}</h3>
            {renderPlanForm(form, setForm, addValidation, touched, setTouched)}

            {/* AI enhancement */}
            {selectedLibraryTemplate && (
              <div style={{ display: 'grid', gap: `${theme.spacing.xs}px` }}>
                <AiOptIn checked={aiOptIn} onChange={setAiOptIn} />
                {aiStatus.message ? <p style={{ margin: 0, color: theme.colors.errorStrong, fontSize: '0.8125rem' }}>{aiStatus.message}</p> : null}
                <button
                  type="button"
                  onClick={handleGenerateSuggestions}
                  disabled={aiStatus.loading}
                  style={{
                    minHeight: '44px',
                    padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                    borderRadius: theme.shape.radiusSm,
                    border: `1px solid ${theme.colors.primary}`,
                    backgroundColor: 'transparent',
                    color: theme.colors.primary,
                    fontWeight: 500,
                    cursor: aiStatus.loading ? 'default' : 'pointer',
                    opacity: aiStatus.loading ? 0.7 : 1
                  }}
                >
                  {aiStatus.loading ? t('loading') : t('social.generateSuggestions')}
                </button>
              </div>
            )}

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
        )}

        {/* ── Plans list ─────────────────────────────────────────────── */}
        <section data-tour="social-plans-list">
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center' }}>
            {t('social.plansHeading')}
            <BudgetTooltip content={t('tooltips.social.plansList', 'Your saved connection plans. Edit or delete any plan, mark steps complete, and add reflection notes after the meetup — closing the loop makes future plans easier.')} />
          </h3>
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

              const dateLabel = plan.dateTime ? formatSocialPlanDateTime(plan.dateTime, i18n.language) : null;
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${theme.spacing.xs}px`, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: theme.typography.heading.weight }}>{plan.title}</div>
                      {plan.relationshipType && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: theme.shape.radiusFull,
                          background: `${theme.colors.primary}15`,
                          color: theme.colors.primary,
                          fontWeight: 600,
                        }}>
                          {t(`social.relationship.${plan.relationshipType}`, plan.relationshipType)}
                        </span>
                      )}
                    </div>
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
                  <PostReflectionPrompt
                    plan={plan}
                    theme={theme}
                    onSubmit={(energy, note) => updatePlan(plan.id, { postReflection: { energy, note } })}
                  />
                  <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, marginTop: `${theme.spacing.sm}px`, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => readPlan(plan)}
                      disabled={!ttsEnabled}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        minHeight: '44px',
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
                      aria-label={t('editNamed', { name: plan.title })}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        minHeight: '44px',
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
                      aria-label={t('deleteNamed', { name: plan.title })}
                      style={{
                        padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                        minHeight: '44px',
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
