import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'onboardingFlow';

const defaultState = {
  step: 0,
  completed: false,
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    dyslexiaFont: true,
    ttsEnabled: true,
    language: 'en'
  },
  neurodivergence: {
    preset: 'adhd'
  },
  goals: {
    primaryGoal: '',
    monthlyBudget: '',
    savingsTarget: ''
  },
  tour: {
    visited: []
  }
};

const OnboardingContext = createContext(null);

function readFromStorage() {
  if (typeof localStorage === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (err) {
    console.warn('Unable to read onboarding state from storage', err);
    return defaultState;
  }
}

function persistToStorage(state) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Unable to persist onboarding state', err);
  }
}

export function OnboardingProvider({ children }) {
  const [state, setState] = useState(() => readFromStorage());

  useEffect(() => {
    persistToStorage(state);
  }, [state]);

  const updateSection = (section, updates) => {
    setState((prev) => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          ...updates
        }
      };
      return next;
    });
  };

  const nextStep = () =>
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 3) }));

  const previousStep = () =>
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));

  const markComplete = () => setState((prev) => ({ ...prev, completed: true }));

  const value = useMemo(
    () => ({
      state,
      updateSection,
      nextStep,
      previousStep,
      markComplete
    }),
    [state]
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboardingFlow() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within an OnboardingProvider');
  }
  return context;
}
