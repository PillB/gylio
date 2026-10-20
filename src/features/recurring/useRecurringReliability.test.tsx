import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { track } from '../../core/analytics';
import { useRecurringReliability } from './useRecurringReliability';

const dbApi = {
  ready: true,
  getTasks: vi.fn(async () => [{ id: 7, title: 'Take meds', recurrence: 'daily', plannedDate: null }]),
};
const showToast = vi.fn();
const toastApi = { showToast };
const i18nApi = { t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key) };

vi.mock('../../core/hooks/useDB', () => ({ default: () => dbApi }));
vi.mock('../../core/context/ToastContext', () => ({ useToast: () => toastApi }));
vi.mock('react-i18next', () => ({ useTranslation: () => i18nApi }));
vi.mock('../../core/analytics', () => ({ track: vi.fn(), Events: new Proxy({}, { get: (_t, k) => String(k) }) }));

beforeEach(() => {
  localStorage.clear();
  showToast.mockClear();
  vi.mocked(track).mockClear();
});

describe('useRecurringReliability', () => {
  it('warns about a missing instance with a toast the ToastProvider can render', async () => {
    renderHook(() => useRecurringReliability('2026-09-30'));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    // ToastProvider.showToast takes one options object; a bare string has no
    // message and an undefined duration, so the toast would be empty and vanish at once.
    expect(showToast.mock.calls[0]).toEqual([
      expect.objectContaining({ message: expect.stringContaining('1 recurring'), type: 'warning' }),
    ]);
  });

  it('keeps the task title out of the analytics event for a missing instance', async () => {
    renderHook(() => useRecurringReliability('2026-09-30'));
    await waitFor(() => expect(showToast).toHaveBeenCalled());

    // The analytics queue is kept in localStorage; a title is text the user wrote.
    const missing = vi.mocked(track).mock.calls.find(([name]) => name === 'RECURRING_EXPECTED_MISSING');
    expect(missing).toBeDefined();
    expect(missing?.[1]).toEqual({ taskId: expect.anything(), expectedDate: expect.any(String) });
    expect(JSON.stringify(missing)).not.toContain('Take meds');
  });
});
