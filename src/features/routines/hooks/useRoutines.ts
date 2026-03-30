import { useCallback, useEffect, useMemo, useState } from 'react';
import useDB, { type Routine, type RoutineStep } from '../../../core/hooks/useDB';
import { normalizeRoutineSteps } from '../utils/routineHelpers';

type UseRoutinesResult = {
  routines: Routine[];
  loading: boolean;
  refreshRoutines: () => Promise<void>;
  addRoutine: (payload: {
    title: string;
    description?: string | null;
    frequency?: Routine['frequency'];
    triggerTime?: string | null;
    steps?: RoutineStep[];
    anchorHabit?: string | null;
    completionLog?: string[];
  }) => Promise<Routine | null>;
  updateRoutine: (id: number, updates: Partial<Omit<Routine, 'id'>>) => Promise<Routine | null>;
  removeRoutine: (id: number) => Promise<boolean>;
  toggleStep: (id: number, stepIndex: number) => Promise<void>;
  completeRoutine: (id: number) => Promise<void>;
};

const useRoutines = (): UseRoutinesResult => {
  const { ready, getRoutines, insertRoutine, updateRoutine, deleteRoutine } = useDB();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);

  const refreshRoutines = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const fetched = await getRoutines();
      setRoutines(fetched);
    } catch (error) {
      console.error('Failed to load routines', error);
    } finally {
      setLoading(false);
    }
  }, [getRoutines, ready]);

  useEffect(() => {
    refreshRoutines();
  }, [refreshRoutines]);

  const addRoutine = useCallback(
    async ({
      title,
      description = null,
      frequency = 'DAILY',
      triggerTime = null,
      steps = [],
      anchorHabit = null,
      completionLog = [],
    }: {
      title: string;
      description?: string | null;
      frequency?: Routine['frequency'];
      triggerTime?: string | null;
      steps?: RoutineStep[];
      anchorHabit?: string | null;
      completionLog?: string[];
    }) => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      try {
        const created = await insertRoutine({ title: trimmed, description, frequency, triggerTime, steps: normalizeRoutineSteps(steps), anchorHabit, completionLog });
        await refreshRoutines();
        return created;
      } catch (error) {
        console.error('Failed to create routine', error);
        return null;
      }
    },
    [insertRoutine, refreshRoutines]
  );

  const editRoutine = useCallback(
    async (id: number, updates: Partial<Omit<Routine, 'id'>>) => {
      try {
        const updated = await updateRoutine(id, updates);
        if (!updated) return null;
        setRoutines((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
      } catch (error) {
        console.error('Failed to update routine', error);
        return null;
      }
    },
    [updateRoutine]
  );

  const removeRoutine = useCallback(
    async (id: number) => {
      try {
        const removed = await deleteRoutine(id);
        if (removed) setRoutines((prev) => prev.filter((r) => r.id !== id));
        return removed;
      } catch (error) {
        console.error('Failed to delete routine', error);
        return false;
      }
    },
    [deleteRoutine]
  );

  const toggleStep = useCallback(
    async (id: number, stepIndex: number) => {
      const target = routines.find((r) => r.id === id);
      if (!target) return;
      const updatedSteps = target.steps.map((step, i) =>
        i === stepIndex ? { ...step, done: !step.done } : step
      );
      await editRoutine(id, { steps: updatedSteps });
    },
    [editRoutine, routines]
  );

  const completeRoutine = useCallback(
    async (id: number) => {
      const target = routines.find((r) => r.id === id);
      const todayKey = new Date().toISOString().slice(0, 10);
      const nextLog = target && !target.completionLog.includes(todayKey)
        ? [...target.completionLog, todayKey]
        : (target?.completionLog ?? [todayKey]);
      await editRoutine(id, { lastCompletedAt: new Date().toISOString(), completionLog: nextLog });
    },
    [editRoutine, routines]
  );

  const sortedRoutines = useMemo(
    () =>
      [...routines].sort((a, b) =>
        a.createdAt && b.createdAt ? b.createdAt.localeCompare(a.createdAt) : b.id - a.id
      ),
    [routines]
  );

  return {
    routines: sortedRoutines,
    loading,
    refreshRoutines,
    addRoutine,
    updateRoutine: editRoutine,
    removeRoutine,
    toggleStep,
    completeRoutine
  };
};

export default useRoutines;
