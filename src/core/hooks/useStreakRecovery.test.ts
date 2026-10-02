import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { track } from '../analytics';
import { useStreakRecovery } from './useStreakRecovery';

const insertTask = vi.fn(async () => ({ id: 1 }));

vi.mock('./useDB', () => ({ default: () => ({ insertTask }) }));
vi.mock('../analytics', () => ({ track: vi.fn(), Events: new Proxy({}, { get: (_t, k) => String(k) }) }));

describe('useStreakRecovery', () => {
  beforeEach(() => {
    insertTask.mockClear();
    vi.mocked(track).mockClear();
  });

  it('keeps the task title out of the analytics event', async () => {
    const { result } = renderHook(() => useStreakRecovery());

    await result.current.createTinyStepTask('Call the bank about my overdraft');

    expect(insertTask).toHaveBeenCalledWith(
      'Call the bank about my overdraft',
      'pending',
      [],
      expect.any(String),
      null,
      2,
      'tiny',
    );
    // The analytics queue is kept in localStorage; a title is text the user wrote.
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('STREAK_RECOVERY_STARTED');
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain('overdraft');
  });
});
