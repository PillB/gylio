import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { TOUR_STEPS } from '../../features/tour/tourSteps';

const STORAGE_KEY = 'gylio_tour';

export const TOTAL_TOUR_STEPS = TOUR_STEPS.length;

export interface TourState {
  active: boolean;
  stepIndex: number;
  completed: boolean;
}

const DEFAULT_STATE: TourState = { active: false, stepIndex: 0, completed: false };

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

  const update = useCallback((patch: Partial<TourState>) => {
    setTourState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const startTour = useCallback(() => update({ active: true }), [update]);
  const pauseTour = useCallback(() => update({ active: false }), [update]);

  const nextStep = useCallback(() => {
    setTourState((prev) => {
      const next = { ...prev, stepIndex: Math.min(prev.stepIndex + 1, TOTAL_TOUR_STEPS - 1) };
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

  const goToStep = useCallback((index: number) => {
    update({ stepIndex: Math.max(0, Math.min(index, TOTAL_TOUR_STEPS - 1)) });
  }, [update]);

  const completeTour = useCallback(() => {
    update({ active: false, completed: true });
  }, [update]);

  const resetTour = useCallback(() => {
    const next: TourState = { active: true, stepIndex: 0, completed: false };
    saveState(next);
    setTourState(next);
  }, []);

  const value = useMemo<GuidedTourContextValue>(
    () => ({
      tourState,
      startTour,
      pauseTour,
      nextStep,
      prevStep,
      goToStep,
      completeTour,
      resetTour,
      totalSteps: TOTAL_TOUR_STEPS,
    }),
    [tourState, startTour, pauseTour, nextStep, prevStep, goToStep, completeTour, resetTour]
  );

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>;
}

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour must be used inside GuidedTourProvider');
  return ctx;
}
