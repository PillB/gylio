import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AccessibilityPrefs from './AccessibilityPrefs';
import NeurodivergencePresets from './NeurodivergencePresets';
import GoalBudgetSetup from './GoalBudgetSetup';
import MiniTour from './MiniTour';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';

/**
 * Renders the multi-step onboarding wizard. Steps are intentionally compact to
 * reduce friction while still capturing the design requirements.
 */
export default function OnboardingFlow({ onComplete }) {
  const { t } = useTranslation();
  const { state, updateSection, nextStep, previousStep, markComplete } = useOnboardingFlow();

  // Reduces onboarding overwhelm for autism per research: Predictable steps
  const steps = useMemo(
    () => [
      {
        key: 'accessibility',
        label: t('onboarding.accessibility.title'),
        component: (
          <AccessibilityPrefs
            data={state.accessibility}
            onUpdate={(updates) => updateSection('accessibility', updates)}
          />
        )
      },
      {
        key: 'neuro',
        label: t('onboarding.neuro.title'),
        component: (
          <NeurodivergencePresets
            data={state.neurodivergence}
            onUpdate={(updates) => updateSection('neurodivergence', updates)}
          />
        )
      },
      {
        key: 'goals',
        label: t('onboarding.goals.title'),
        component: (
          <GoalBudgetSetup
            data={state.goals}
            onUpdate={(updates) => updateSection('goals', updates)}
          />
        )
      },
      {
        key: 'tour',
        label: t('onboarding.tour.title'),
        component: (
          <MiniTour
            data={state.tour}
            onUpdate={(updates) => updateSection('tour', updates)}
          />
        )
      }
    ],
    [state, t, updateSection]
  );

  const currentStep = steps[state.step] || steps[0];
  const isLastStep = state.step >= steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      markComplete();
      onComplete?.();
    } else {
      nextStep();
    }
  };

  return (
    <section
      aria-label={t('onboarding.title')}
      style={{
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '1rem',
        maxWidth: '900px',
        margin: '0 auto',
        background: '#fafafa'
      }}
    >
      <header style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: '#333', fontWeight: 600 }}>{t('welcome')}</p>
        <p style={{ margin: 0, color: '#555' }}>{t('onboarding.badge')}</p>
        <h2 style={{ margin: '0.25rem 0 0.5rem 0' }}>{t('onboarding.title')}</h2>
        <p style={{ margin: 0 }}>{t('onboarding.subtitle')}</p>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {steps.map((step, index) => (
            <span
              key={step.key}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '16px',
                border: '1px solid #ccc',
                backgroundColor: index === state.step ? '#4b6bfb' : '#fff',
                color: index === state.step ? '#fff' : '#222',
                fontWeight: index === state.step ? 'bold' : 'normal'
              }}
            >
              {index + 1}. {step.label}
            </span>
          ))}
        </div>
      </header>
      <div style={{ marginBottom: '1.5rem' }}>{currentStep.component}</div>
      <footer style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" onClick={previousStep} disabled={state.step === 0}>
          {t('onboarding.previous')}
        </button>
        <button type="button" onClick={handleNext}>
          {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
        </button>
      </footer>
    </section>
  );
}
