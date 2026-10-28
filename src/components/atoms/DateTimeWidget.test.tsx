import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateTimeWidget from './DateTimeWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('../../core/hooks/useClock', () => ({
  useClock: () => ({ now: new Date(2026, 9, 28, 9, 41), tzStr: 'PET', dateKey: '2026-10-28' }),
}));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const toggle = () => screen.getByRole('button', { name: 'clock.toggleGranularity' });

describe('DateTimeWidget', () => {
  it('is not a live region, so the time is not read out every minute', () => {
    const { container } = render(<DateTimeWidget />);
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it('has a toggle of at least 24 by 24 pixels', () => {
    render(<DateTimeWidget />);
    expect(parseInt(toggle().style.width, 10)).toBeGreaterThanOrEqual(24);
    expect(parseInt(toggle().style.height, 10)).toBeGreaterThanOrEqual(24);
  });

  it('shows the choices as pressed buttons and returns focus to the toggle after one is picked', () => {
    render(<DateTimeWidget />);
    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    const choices = screen.getByRole('group', { name: 'clock.toggleGranularity' });
    const hour = within(choices).getByRole('button', { name: /clock.granularityHour/ });
    expect(within(choices).getByRole('button', { name: /clock.granularityExact/ }).getAttribute('aria-pressed')).toBe('true');
    act(() => hour.focus());
    fireEvent.click(hour);
    expect(screen.queryByRole('group')).toBeNull();
    expect(document.activeElement).toBe(toggle());
    expect(localStorage.getItem('gylio_clock_granularity')).toBe('hour');
  });

  it('closes on Escape and keeps focus on the toggle', () => {
    render(<DateTimeWidget />);
    fireEvent.click(toggle());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group')).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    render(<DateTimeWidget />);
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole('button', { name: /clock.granularityHalf/ }));
    expect(screen.getByText(/clock.about/)).toBeTruthy();
  });
});
