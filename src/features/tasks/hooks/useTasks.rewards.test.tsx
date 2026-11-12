import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = { tasks: [] as Array<Record<string, unknown>>, points: 0 };
  const api = {
    ready: true,
    getTasks: async () => state.tasks.map((t) => ({ ...t })),
    updateTask: async (id: number, patch: Record<string, unknown>) => {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i < 0) return null;
      state.tasks[i] = { ...state.tasks[i], ...patch };
      return { ...state.tasks[i] };
    },
    insertTask: vi.fn(),
    deleteTask: vi.fn(),
  };
  return { state, api };
});
const gamification = vi.hoisted(() => ({ on: true }));
const award = vi.hoisted(() => vi.fn(async ({ points }: { points: number }) => { db.state.points += points; }));
vi.mock('../../../core/hooks/useDB', () => ({ default: () => db.api }));
vi.mock('../../../core/hooks/useRewards', () => ({ default: () => ({ applyRewardsProgress: award, rewardsOn: async () => gamification.on }) }));
vi.mock('../../../core/hooks/useAccessibility', () => ({ default: () => ({ speak: async () => undefined }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import useTasks from './useTasks';

beforeEach(() => {
  localStorage.clear();
  gamification.on = true;
  award.mockClear();
  db.state.points = 0;
  db.state.tasks = [{ id: 1, title: 'Pay rent', status: 'pending', subtasks: [{ label: 'Find the bill', done: false }] }];
});

const loaded = async () => {
  const hook = renderHook(() => useTasks());
  await waitFor(() => expect(hook.result.current.tasks).toHaveLength(1));
  return hook;
};

describe('points for completing work are paid once', () => {
  it('complete, reopen, complete again: ten points, not twenty', async () => {
    const { result } = await loaded();
    for (let i = 0; i < 3; i += 1) await act(async () => { await result.current.toggleTaskStatus(1); });
    expect(db.state.tasks[0].status).toBe('completed');
    expect(db.state.points).toBe(10);
  });

  it('ticking a step on and off again pays the step once', async () => {
    const { result } = await loaded();
    for (let i = 0; i < 4; i += 1) await act(async () => { await result.current.toggleSubtask(1, 0); });
    expect(db.state.points).toBe(5);
  });
});

describe('with rewards turned off', () => {
  it('a completion is not marked as paid, so it pays once rewards are back on', async () => {
    gamification.on = false;
    const off = await loaded();
    await act(async () => { await off.result.current.toggleTaskStatus(1); });
    await act(async () => { await off.result.current.toggleTaskStatus(1); });
    off.unmount();
    award.mockClear();
    gamification.on = true;
    const { result } = await loaded();
    await act(async () => { await result.current.toggleTaskStatus(1); });
    expect(award).toHaveBeenCalledTimes(1);
    expect(award).toHaveBeenCalledWith(expect.objectContaining({ points: 10 }));
  });
});

describe('a screen that says which status it wants', () => {
  it('writes "completed" even when this list last saw the task completed (stale), instead of reopening it', async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.toggleTaskStatus(1, 'completed'); });
    // Another screen reopened it; this list has not reloaded.
    db.state.tasks[0].status = 'pending';
    await act(async () => { await result.current.toggleTaskStatus(1, 'completed'); });
    expect(db.state.tasks[0].status).toBe('completed');
  });
});
