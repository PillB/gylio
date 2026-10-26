import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DayPlanCard from './DayPlanCard';

vi.mock('../../core/analytics', () => ({ track: vi.fn() }));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) =>
      typeof fallback === 'string'
        ? fallback.replace(/{{(\w+)}}/g, (_m, k) => String(opts?.[k] ?? ''))
        : key,
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const tasks = [
  { id: 1, title: 'Big report', priority: 'high', focusPresetMinutes: 100 },
  { id: 2, title: 'Email Ana', priority: 'low', focusPresetMinutes: 10 },
  { id: 3, title: 'Tidy desk', priority: 'low', focusPresetMinutes: 60 },
];

describe('DayPlanCard', () => {
  it('moves what does not fit to a neutral Later list when energy drops', () => {
    render(<DayPlanCard tasks={tasks} variant="cap" />);
    // medium: 240 * 0.75 = 180 min fits all three (170)
    expect(screen.queryByText(/no rush/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Low' })); // 90 min: the 100-min report cannot fit
    expect(screen.getByText('Later (1), no rush')).toBeTruthy();
    expect(screen.getByLabelText('Moved to later').textContent).toBe('Big report');
  });

  it('remembers the energy choice and exposes it as a pressed button', () => {
    const first = render(<DayPlanCard tasks={tasks} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiny' }));
    first.unmount();
    render(<DayPlanCard tasks={tasks} />);
    expect(screen.getByRole('button', { name: 'Tiny' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('nudge variant keeps one task on a day where nothing fits', () => {
    render(<DayPlanCard tasks={[tasks[0]]} variant="cap-with-nudge" />);
    fireEvent.click(screen.getByRole('button', { name: 'Low' }));
    expect(screen.getByRole('status').textContent).toContain('1 of 1 fit today');
  });

  it('renders nothing with no tasks', () => {
    const { container } = render(<DayPlanCard tasks={[]} />);
    expect(container.textContent).toBe('');
  });
});
