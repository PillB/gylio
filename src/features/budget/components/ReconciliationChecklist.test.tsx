import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { themes } from '../../../core/themes';
import ReconciliationChecklist from './ReconciliationChecklist';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.dark }) }));
vi.mock('../../../core/analytics', () => ({ track: vi.fn(), Events: new Proxy({}, { get: (_t, k) => String(k) }) }));

// Light-palette literals the component used to fall back to because it read
// theme keys that do not exist (successBg, successText, textSecondary, surfaceAlt).
const LIGHT_ONLY = ['#f0fdf4', '#14532d', '#64748b', '#f1f5f9', '#1e293b', '#e2e8f0', '#f8fafc', '#16a34a'];
const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe('ReconciliationChecklist in dark mode', () => {
  it('renders only dark-theme colours once opened and an item is checked', () => {
    const { container } = render(<ReconciliationChecklist budgetMonthKey="2026-09" />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    const styles = Array.from(container.querySelectorAll<HTMLElement>('[style]'))
      .map((el) => el.getAttribute('style') ?? '')
      .join('\n')
      .toLowerCase();
    const leaked = LIGHT_ONLY.filter((hex) => styles.includes(hex) || styles.includes(toRgb(hex)));
    expect(leaked).toEqual([]);
    expect(styles).toContain(toRgb(themes.dark.colors.successStrong));
  });
});
