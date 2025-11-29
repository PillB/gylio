import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const stepOrder = ['accessibility', 'neurodivergence', 'quickSetup', 'tour'];

const defaultSelections = {
  accessibility: {
    textStyle: '',
    contrast: '',
    motion: '',
    tts: false
  },
  neurodivergence: {
    preset: '',
    supports: []
  },
  quickSetup: {
    starterGoal: '',
    monthlyBudget: ''
  },
  tour: {
    acknowledged: false,
    reminders: false
  }
};

const STORAGE_KEY = 'onboardingFlowState';
const OnboardingFlowContext = createContext(undefined);

const cloneSelections = () => JSON.parse(JSON.stringify(defaultSelections));

const createInitialState = () => ({
  currentStep: 0,
  selections: cloneSelections(),
  isOnboardingComplete: false
});

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
    return stored ? JSON.parse(stored) : null;
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

      if (persistedState) {
        setState({
          currentStep: persistedState.currentStep ?? 0,
          selections: persistedState.selections ?? cloneSelections(),
          isOnboardingComplete: Boolean(persistedState.isOnboardingComplete)
        });
      }

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
