import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { themes } from '../../../core/themes';
import ReconciliationChecklist from './ReconciliationChecklist';

const dark = themes.dark;

vi.mock('../../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: dark }) }));
vi.mock('../../../core/analytics', () => ({ track: vi.fn(), Events: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

// jsdom normalises colours (hex to rgb), so compare through the same parser.
const css = (color: string) => {
  const probe = document.createElement('span');
  probe.style.color = color;
  return probe.style.color;
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ReconciliationChecklist theming', () => {
  // Regression: lookups of theme keys that do not exist fell back to light-palette hex,
  // so the checklist stayed white-on-light in dark mode.
  it('uses the active dark theme surfaces and text, not light fallbacks', () => {
    render(<ReconciliationChecklist budgetMonthKey="2026-09" />);
    const header = screen.getByRole('button', { name: /Reconciliation Checklist/ });
    expect(header.style.background).toBe(css(dark.colors.surface));
    expect(screen.getByText('Reconciliation Checklist').style.color).toBe(css(dark.colors.text));
    expect(screen.getByText('0/3').style.color).toBe(css(dark.colors.muted));
  });

  it('switches to the strong success text once every item is confirmed', () => {
    render(<ReconciliationChecklist budgetMonthKey="2026-09" />);
    fireEvent.click(screen.getByRole('button', { name: /Reconciliation Checklist/ }));
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box);
    expect(screen.getByText('Reconciliation Checklist').style.color).toBe(css(dark.colors.successStrong));
    expect(screen.getByRole('status').style.color).toBe(css(dark.colors.successStrong));
  });
});
