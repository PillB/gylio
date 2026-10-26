import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BillRemindersCard from './BillRemindersCard';
import type { Debt } from '../../../core/hooks/useDB';

vi.mock('../../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback.replace(/{{(\w+)}}/g, (_m, k) => String(opts?.[k] ?? '')) : key,
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const debt = (over: Partial<Debt>): Debt => ({
  id: 1, name: 'Visa', balance: 500, annualRate: 20, minPayment: 25, categoryName: null, dueDay: null, createdAt: null, ...over,
});
const today = new Date(2026, 9, 26); // 26 Oct

describe('BillRemindersCard', () => {
  it('lists only debts due within a week and creates nothing until asked', () => {
    const onAddTask = vi.fn(async () => true);
    render(<BillRemindersCard today={today} onAddTask={onAddTask} debts={[debt({ id: 1, name: 'Visa', dueDay: 28 }), debt({ id: 2, name: 'Car', dueDay: 15 }), debt({ id: 3, name: 'NoDay' })]} />);
    expect(screen.getByText('Visa is due 2026-10-28')).toBeTruthy();
    expect(screen.queryByText(/Car/)).toBeNull();
    expect(screen.queryByText(/NoDay/)).toBeNull();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('adds one reminder two days before the due date with a first step, then shows it as added', async () => {
    const onAddTask = vi.fn(async () => true);
    render(<BillRemindersCard today={today} onAddTask={onAddTask} debts={[debt({ dueDay: 28 })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a reminder task' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Reminder added'));
    expect(onAddTask).toHaveBeenCalledWith('Pay Visa', 'Open your bank app and pay Visa', '2026-10-26');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('stays addable when saving fails', async () => {
    const onAddTask = vi.fn(async () => false);
    render(<BillRemindersCard today={today} onAddTask={onAddTask} debts={[debt({ dueDay: 28 })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a reminder task' }));
    await waitFor(() => expect(onAddTask).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Add a reminder task' })).toBeTruthy();
  });
});
