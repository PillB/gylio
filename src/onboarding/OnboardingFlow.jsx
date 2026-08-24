import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import useOnboardingFlow, { stepOrder } from '../hooks/useOnboardingFlow.jsx';
import AccessibilityPrefs from './steps/AccessibilityPrefs.jsx';
import QuickSetup from './steps/QuickSetup.jsx';
import MiniTour from './steps/MiniTour.jsx';
import { useTheme } from '../core/context/ThemeContext';

const validators = {
  accessibility: (state) =>
    ['standard', 'large', 'spaced'].includes(state.textStyle) &&
    ['balanced', 'high'].includes(state.contrast) &&
    ['system', 'reduced', 'standard'].includes(state.motion),
  quickSetup: (state) => {
    if (String(state.monthlyIncome ?? '').trim() === '') return true;
    const income = Number(state.monthlyIncome);
    return Number.isFinite(income) && income >= 0;
  },
  tour: () => true
};

const stepComponents = {
  accessibility: AccessibilityPrefs,
  quickSetup: QuickSetup,
  tour: MiniTour
};

function OnboardingFlow({ onComplete }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { currentStep, currentStepKey, selections, updateSelections, completeStep, goToPreviousStep } =
    useOnboardingFlow();

  const stepKey = currentStepKey;
  const CurrentStepComponent = useMemo(() => stepComponents[stepKey], [stepKey]);
  const stepPredictableNote = t(`onboarding.predictableSteps.${stepKey}`);

  const handleNext = () => {
    if (!validators[stepKey](selections[stepKey])) return;

    const isFinalStep = currentStep >= stepOrder.length - 1;
    completeStep();
    if (isFinalStep) onComplete(selections);
  };

  const progressLabel = t('onboarding.progress', {
    current: currentStep + 1,
    total: stepOrder.length
  });
  const canProceed = validators[stepKey](selections[stepKey]);

  return (
    <section
      aria-label={t('onboarding.stepSection')}
      style={{
        width: 'min(100%, 760px)',
        margin: '0 auto',
        background: theme.colors.surface,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: theme.spacing.lg,
        boxShadow: theme.shadow.sm,
        boxSizing: 'border-box',
        minWidth: 0
      }}
    >
      <header>
        <p style={{ margin: 0, color: theme.colors.primary, fontWeight: 600 }}>{progressLabel}</p>
        <h2 style={{ margin: '0.25rem 0', lineHeight: 1.25 }}>{t(`onboarding.${stepKey}.title`)}</h2>
        <p style={{ margin: 0, color: theme.colors.muted }}>{t(`onboarding.${stepKey}.subtitle`)}</p>
      </header>

      <div style={{ margin: '0.6rem 0 1rem', color: theme.colors.muted }}>
        <p style={{ margin: 0 }}>{t('onboarding.flow.autosave')}</p>
        <p style={{ margin: '0.25rem 0 0' }}>{t('onboarding.flow.resume')}</p>
        <p style={{ margin: '0.25rem 0 0' }}>{stepPredictableNote}</p>
      </div>

      <CurrentStepComponent
        data={selections[stepKey]}
        onUpdate={(payload) => updateSelections(stepKey, payload)}
        t={t}
      />

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.lg,
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStep === 0}
          style={{
            minHeight: 44,
            padding: '0.6rem 1rem',
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.border}`,
            background: currentStep === 0 ? theme.colors.background : theme.colors.surface,
            color: currentStep === 0 ? theme.colors.muted : theme.colors.text,
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {t('onboarding.back')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          style={{
            minHeight: 44,
            padding: '0.6rem 1rem',
            borderRadius: theme.shape.radiusSm,
            border: 'none',
            background: canProceed ? theme.colors.primary : theme.colors.borderStrong,
            color: theme.colors.primaryForeground,
            cursor: canProceed ? 'pointer' : 'not-allowed'
          }}
          aria-disabled={!canProceed}
        >
          {currentStep === stepOrder.length - 1
            ? t('onboarding.finish')
            : t('onboarding.next')}
        </button>
      </footer>

      {!canProceed && (
        <p role="status" style={{ margin: '0.5rem 0 0', color: theme.colors.error }}>
          {t('onboarding.flow.validationReminder')}
        </p>
      )}
    </section>
  );
}

OnboardingFlow.propTypes = {
  onComplete: PropTypes.func.isRequired
};

export default OnboardingFlow;
