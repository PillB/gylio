import type { SocialTemplate } from './socialTemplates';
import type { SocialPlanEnergyLevel, SocialPlanType, SocialStep } from './socialTypes';

export type { SocialPlanEnergyLevel, SocialPlanType, SocialStep };

export type SocialPlanFormState = {
  title: string;
  type: SocialPlanType;
  energyLevel: SocialPlanEnergyLevel;
  dateTime: string;
  reminderMinutesBefore: string;
  notes: string;
  steps: SocialStep[];
  templateId: SocialTemplate['id'] | '';
};

export type SocialPlanValidationState = {
  title: string;
  dateTime: string;
  reminderMinutesBefore: string;
};

const DEFAULT_STEPS_COUNT = 3;

export const createEmptySocialSteps = (count = DEFAULT_STEPS_COUNT): SocialStep[] =>
  Array.from({ length: count }, () => ({ label: '', done: false }));

export const parseSocialPlanDateTime = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatSocialPlanDateTime = (value: string, language: string) => {
  const parsed = parseSocialPlanDateTime(value);
  if (!parsed) return null;

  return new Intl.DateTimeFormat(language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
};

export const normalizeSocialPlanSteps = (steps: SocialStep[]) =>
  steps
    .map((step) => ({ ...step, label: step.label.trim() }))
    .filter((step) => step.label.length > 0);

export const buildSocialPlanValidation = (
  fields: SocialPlanFormState,
  t: (key: string, options?: Record<string, unknown>) => string
): SocialPlanValidationState => {
  const validation: SocialPlanValidationState = {
    title: '',
    dateTime: '',
    reminderMinutesBefore: ''
  };

  if (!fields.title.trim()) {
    validation.title = t('validation.titleRequired');
  }

  if (fields.dateTime && !parseSocialPlanDateTime(fields.dateTime)) {
    validation.dateTime = t('validation.invalidDateTime');
  }

  if (fields.reminderMinutesBefore) {
    const reminder = Number(fields.reminderMinutesBefore);
    if (Number.isNaN(reminder) || reminder < 0 || !Number.isInteger(reminder)) {
      validation.reminderMinutesBefore = t('validation.nonNegativeInteger');
    }
  }

  return validation;
};

export const hasSocialPlanErrors = (validation: SocialPlanValidationState) =>
  Object.values(validation).some(Boolean);
