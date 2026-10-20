import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ALL_FLOWS, FLOW_MAP, OVERVIEW_FLOW } from '../../features/tour/tourSteps';
import type { TourStep } from '../../features/tour/tourSteps';

const STORAGE_KEY = 'gylio_tour';

export interface TourState {
  active: boolean;
  stepIndex: number;
  completed: boolean;
  flowId: string;
}

const DEFAULT_STATE: TourState = {
  active: false,
  stepIndex: 0,
  completed: false,
  flowId: 'overview',
};

function loadState(): TourState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TourState>;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

function saveState(s: TourState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface GuidedTourContextValue {
  tourState: TourState;
  showSelector: boolean;
  currentSteps: TourStep[];
  openSelector: () => void;
  closeSelector: () => void;
  startFlow: (flowId: string) => void;
  startTour: () => void;
  pauseTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  completeTour: () => void;
  resetTour: () => void;
  totalSteps: number;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [tourState, setTourState] = useState<TourState>(loadState);
  const [showSelector, setShowSelector] = useState(false);

  const update = useCallback((patch: Partial<TourState>) => {
    setTourState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const currentSteps = useMemo(
    () => FLOW_MAP[tourState.flowId]?.steps ?? OVERVIEW_FLOW.steps,
    [tourState.flowId]
  );

  const totalSteps = currentSteps.length;

  const openSelector = useCallback(() => {
    setShowSelector(true);
    update({ active: false });
  }, [update]);

  const closeSelector = useCallback(() => {
    setShowSelector(false);
  }, []);

  const startFlow = useCallback(
    (flowId: string) => {
      const validId = FLOW_MAP[flowId] ? flowId : 'overview';
      const next: TourState = {
        active: true,
        stepIndex: 0,
        completed: false,
        flowId: validId,
      };
      saveState(next);
      setTourState(next);
      setShowSelector(false);
    },
    []
  );

  const startTour = useCallback(
    () => update({ active: true }),
    [update]
  );

  const pauseTour = useCallback(() => update({ active: false }), [update]);

  const nextStep = useCallback(() => {
    setTourState((prev) => {
      const steps = FLOW_MAP[prev.flowId]?.steps ?? OVERVIEW_FLOW.steps;
      const next = { ...prev, stepIndex: Math.min(prev.stepIndex + 1, steps.length - 1) };
      saveState(next);
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setTourState((prev) => {
      const next = { ...prev, stepIndex: Math.max(prev.stepIndex - 1, 0) };
      saveState(next);
      return next;
    });
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      update({ stepIndex: Math.max(0, Math.min(index, totalSteps - 1)) });
    },
    [update, totalSteps]
  );

  const completeTour = useCallback(() => {
    update({ active: false, completed: true });
  }, [update]);

  /** Opens the flow selector so the user can choose which guide to run. */
  const resetTour = useCallback(() => {
    openSelector();
  }, [openSelector]);

  const value = useMemo<GuidedTourContextValue>(
    () => ({
      tourState,
      showSelector,
      currentSteps,
      openSelector,
      closeSelector,
      startFlow,
      startTour,
      pauseTour,
      nextStep,
      prevStep,
      goToStep,
      completeTour,
      resetTour,
      totalSteps,
    }),
    [
      tourState,
      showSelector,
      currentSteps,
      openSelector,
      closeSelector,
      startFlow,
      startTour,
      pauseTour,
      nextStep,
      prevStep,
      goToStep,
      completeTour,
      resetTour,
      totalSteps,
    ]
  );

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used inside GuidedTourProvider');
  return ctx;
}

/** Total steps in the overview flow — kept for backward compat */
export const TOTAL_TOUR_STEPS = OVERVIEW_FLOW.steps.length;

/** All available flows — for display in the selector */
export { ALL_FLOWS };
