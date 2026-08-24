import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_SCHEMA_VERSION = 2;
export const stepOrder = ['accessibility', 'quickSetup', 'tour'];

const defaultSelections = {
  accessibility: {
    textStyle: 'standard',
    contrast: 'balanced',
    motion: 'system',
    animations: true,
    tts: false
  },
  quickSetup: {
    starterGoal: '',
    monthlyIncome: ''
  },
  tour: {}
};

const STORAGE_KEY = 'onboardingFlowState';
const OnboardingFlowContext = createContext(undefined);

const cloneSelections = () => JSON.parse(JSON.stringify(defaultSelections));

const createInitialState = () => ({
  schemaVersion: ONBOARDING_SCHEMA_VERSION,
  currentStep: 0,
  selections: cloneSelections(),
  isOnboardingComplete: false
});

const normalizeAccessibility = (value = {}) => ({
  textStyle: value.textStyle === 'large' ? 'large' : 'standard',
  contrast: value.contrast === 'high' ? 'high' : 'balanced',
  motion: ['system', 'reduced', 'standard'].includes(value.motion) ? value.motion : 'system',
  animations: value.animations !== false,
  tts: Boolean(value.tts)
});

const migratePersistedState = (persistedState) => {
  if (!persistedState || typeof persistedState !== 'object') return null;

  const selections = persistedState.selections ?? {};
  const legacyQuickSetup = selections.quickSetup ?? {};
  const schemaVersion = Number(persistedState.schemaVersion ?? 1);
  const isOnboardingComplete = Boolean(persistedState.isOnboardingComplete);

  // Schema v1 had a diagnosis-based screen at index 1. Collapse it into the
  // optional quick-start step without re-onboarding users who already finished.
  const legacyStep = Number.isFinite(Number(persistedState.currentStep))
    ? Number(persistedState.currentStep)
    : 0;
  const migratedStep = schemaVersion >= ONBOARDING_SCHEMA_VERSION
    ? Math.min(Math.max(legacyStep, 0), stepOrder.length - 1)
    : legacyStep <= 0
      ? 0
      : legacyStep <= 2
        ? 1
        : 2;

  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    currentStep: migratedStep,
    selections: {
      accessibility: normalizeAccessibility(selections.accessibility),
      quickSetup: {
        starterGoal: String(legacyQuickSetup.starterGoal ?? ''),
        monthlyIncome: legacyQuickSetup.monthlyIncome ?? legacyQuickSetup.monthlyBudget ?? ''
      },
      tour: {}
    },
    isOnboardingComplete
  };
};

const getStorage = () => {
  if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
    return AsyncStorage;
  }

  if (typeof window !== 'undefined' && window?.localStorage) {
    return {
      getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key, value) => Promise.resolve(window.localStorage.setItem(key, value)),
      removeItem: (key) => Promise.resolve(window.localStorage.removeItem(key))
    };
  }

  return null;
};

const loadPersistedState = async () => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const stored = await storage.getItem(STORAGE_KEY);
    return stored ? migratePersistedState(JSON.parse(stored)) : null;
  } catch (error) {
    console.warn('Failed to parse onboarding flow state from storage', error);
    return null;
  }
};

const persistStateToStorage = async (payload) => {
  const storage = getStorage();
  if (!storage) return;

  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Unable to persist onboarding flow state to storage', error);
  }
};

export function OnboardingFlowProvider({ children }) {
  const [state, setState] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);

  const persistState = useCallback((nextState) => {
    persistStateToStorage(nextState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const persistedState = await loadPersistedState();
      if (!isMounted) return;

      if (persistedState) setState(persistedState);
      setHydrated(true);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState(state);
  }, [state, hydrated, persistState]);

  const updateSelections = useCallback((stepKey, payload) => {
    setState((prev) => {
      const mergedSelections = {
        ...prev.selections,
        [stepKey]: {
          ...prev.selections[stepKey],
          ...payload
        }
      };
      const nextState = { ...prev, selections: mergedSelections };
      persistState(nextState);
      return nextState;
    });
  }, [persistState]);

  const completeStep = useCallback(() => {
    setState((prev) => {
      const isLastStep = prev.currentStep >= stepOrder.length - 1;
      const nextState = {
        ...prev,
        currentStep: isLastStep ? prev.currentStep : prev.currentStep + 1,
        isOnboardingComplete: isLastStep ? true : prev.isOnboardingComplete
      };
      persistState(nextState);
      return nextState;
    });
  }, [persistState]);

  const goToPreviousStep = useCallback(() => {
    setState((prev) => {
      const nextState = { ...prev, currentStep: Math.max(0, prev.currentStep - 1) };
      persistState(nextState);
      return nextState;
    });
  }, [persistState]);

  const reset = useCallback(() => {
    const freshState = createInitialState();
    setState(freshState);
    persistState(freshState);
  }, [persistState]);

  const value = useMemo(
    () => ({
      currentStep: state.currentStep,
      currentStepKey: stepOrder[state.currentStep] ?? stepOrder[0],
      isOnboardingComplete: state.isOnboardingComplete,
      selections: state.selections,
      hydrated,
      updateSelections,
      completeStep,
      goToPreviousStep,
      reset
    }),
    [state, hydrated, updateSelections, completeStep, goToPreviousStep, reset]
  );

  return <OnboardingFlowContext.Provider value={value}>{children}</OnboardingFlowContext.Provider>;
}

export default function useOnboardingFlow() {
  const context = useContext(OnboardingFlowContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within an OnboardingFlowProvider');
  }
  return context;
}
