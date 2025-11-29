import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import useOnboardingFlow, { stepOrder } from '../hooks/useOnboardingFlow.jsx';
import AccessibilityPrefs from './steps/AccessibilityPrefs.jsx';
import NeurodivergencePresets from './steps/NeurodivergencePresets.jsx';
import QuickSetup from './steps/QuickSetup.jsx';
import MiniTour from './steps/MiniTour.jsx';
import OnboardingSummary from './OnboardingSummary.jsx';

const validators = {
  accessibility: (state) =>
    Boolean(state.textStyle && state.contrast && state.motion),
  neurodivergence: (state) => Boolean(state.preset),
  quickSetup: (state) =>
    Boolean(state.starterGoal.trim() && state.monthlyBudget.toString().trim() !== ''),
  tour: (state) => Boolean(state.acknowledged)
};

const stepComponents = {
  accessibility: AccessibilityPrefs,
  neurodivergence: NeurodivergencePresets,
  quickSetup: QuickSetup,
  tour: MiniTour
};

function OnboardingFlow({ onComplete, onToggleLanguage, languageLabel }) {
  const { t } = useTranslation();
  const { currentStep, currentStepKey, selections, updateSelections, completeStep, goToPreviousStep } =
    useOnboardingFlow();

  const stepKey = currentStepKey;
  const CurrentStepComponent = useMemo(() => stepComponents[stepKey], [stepKey]);
  const stepPredictableNote = t(`onboarding.predictableSteps.${stepKey}`);
  const languageAriaLabel = t('onboarding.languageToggle.aria', { language: languageLabel });

  const handleNext = () => {
    if (!validators[stepKey](selections[stepKey])) {
      return;
    }

    const isFinalStep = currentStep >= stepOrder.length - 1;
    completeStep();

    if (isFinalStep) {
      onComplete(selections);
    }
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  const progressLabel = t('onboarding.progress', {
    current: currentStep + 1,
    total: stepOrder.length
  });

  const canProceed = validators[stepKey](selections[stepKey]);

  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: '2fr 1fr',
        alignItems: 'start'
      }}
    >
      <section
        aria-label={t('onboarding.stepSection')}
        style={{
          background: '#fff',
          border: '1px solid #e2e2e2',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <p style={{ margin: 0, color: '#4b6bfb', fontWeight: 600 }}>{progressLabel}</p>
            <h2 style={{ margin: '0.25rem 0' }}>{t(`onboarding.${stepKey}.title`)}</h2>
            <p style={{ margin: 0, color: '#555' }}>{t(`onboarding.${stepKey}.subtitle`)}</p>
          </div>
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={languageAriaLabel}
            title={t('onboarding.languageToggle.helper')}
            style={{
              alignSelf: 'flex-start',
              padding: '0.4rem 0.75rem',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {languageLabel}
          </button>
        </header>

        <div style={{ margin: '0.35rem 0 0.75rem', color: '#4a4a4a' }}>
          <p style={{ margin: 0 }}>{t('onboarding.flow.autosave')}</p>
          <p style={{ margin: '0.25rem 0 0' }}>{t('onboarding.flow.resume')}</p>
          <p style={{ margin: '0.25rem 0 0' }}>{stepPredictableNote}</p>
        </div>

        <CurrentStepComponent
          data={selections[stepKey]}
          onUpdate={(payload) => updateSelections(stepKey, payload)}
          t={t}
        />

        <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: currentStep === 0 ? '#f5f5f5' : '#fff',
              color: currentStep === 0 ? '#999' : '#222',
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
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: canProceed ? '#4b6bfb' : '#cdd6ff',
              color: '#fff',
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
          <p style={{ margin: '0.5rem 0 0', color: '#a33' }}>{t('onboarding.flow.validationReminder')}</p>
        )}
      </section>

      <OnboardingSummary selections={selections} t={t} />
    </div>
  );
}

OnboardingFlow.propTypes = {
  onComplete: PropTypes.func.isRequired,
  onToggleLanguage: PropTypes.func.isRequired,
  languageLabel: PropTypes.string.isRequired
};

export default OnboardingFlow;
