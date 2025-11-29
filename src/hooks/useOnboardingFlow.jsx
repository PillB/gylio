import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

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

const persistLocalState = (payload) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Unable to persist onboarding flow state to localStorage', error);
  }
};

const persistSqliteState = (payload) => {
  if (typeof window === 'undefined' || typeof window.openDatabase !== 'function') return;

  const db = window.openDatabase('onboardingFlow', '1.0', 'Onboarding flow cache', 2 * 1024 * 1024);
  db.transaction((tx) => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS onboarding_state (id INTEGER PRIMARY KEY, state TEXT)');
    tx.executeSql('DELETE FROM onboarding_state WHERE id = 1');
    tx.executeSql('INSERT INTO onboarding_state (id, state) VALUES (1, ?)', [JSON.stringify(payload)]);
  });
};

const readSqliteState = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.openDatabase !== 'function') {
      resolve(null);
      return;
    }

    const db = window.openDatabase('onboardingFlow', '1.0', 'Onboarding flow cache', 2 * 1024 * 1024);
    db.transaction((tx) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS onboarding_state (id INTEGER PRIMARY KEY, state TEXT)',
        [],
        () => {
          tx.executeSql('SELECT state FROM onboarding_state WHERE id = 1', [], (_tx, result) => {
            if (result.rows.length === 0) {
              resolve(null);
              return;
            }

            resolve(JSON.parse(result.rows.item(0).state));
          });
        },
        () => resolve(null)
      );
    });
  });

export function OnboardingFlowProvider({ children }) {
  const [state, setState] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);

  const persistState = useCallback((nextState) => {
    persistLocalState(nextState);
    persistSqliteState(nextState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHydrated(true);
      return;
    }

    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          currentStep: parsed.currentStep ?? 0,
          selections: parsed.selections ?? cloneSelections(),
          isOnboardingComplete: Boolean(parsed.isOnboardingComplete)
        });
        setHydrated(true);
        return;
      } catch (error) {
        console.warn('Failed to parse onboarding flow state from localStorage', error);
      }
    }

    readSqliteState().then((sqliteState) => {
      if (sqliteState) {
        setState({
          currentStep: sqliteState.currentStep ?? 0,
          selections: sqliteState.selections ?? cloneSelections(),
          isOnboardingComplete: Boolean(sqliteState.isOnboardingComplete)
        });
      }
      setHydrated(true);
    });
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
