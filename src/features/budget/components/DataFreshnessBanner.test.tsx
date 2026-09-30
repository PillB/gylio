import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { contrastRatio, themes } from '../../../core/themes';
import DataFreshnessBanner from './DataFreshnessBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../../../core/analytics', () => ({ track: vi.fn(), Events: new Proxy({}, { get: (_t, k) => String(k) }) }));

const rgbToHex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;

describe('DataFreshnessBanner', () => {
  it('renders the stale label as AA text on the surface', () => {
    render(<DataFreshnessBanner lastTransactionDate={new Date(2020, 0, 1)} budgetMonthKey="2026-09" />);
    const label = screen.getByText('Data may be stale');
    const color = rgbToHex(getComputedStyle(label).color);
    expect(contrastRatio(color, themes.light.colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
