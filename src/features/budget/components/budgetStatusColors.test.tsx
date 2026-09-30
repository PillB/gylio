import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { contrastRatio, themes, type ThemeMode } from '../../../core/themes';
import { SpendingChart } from './SpendingChart';
import { scoreColor } from './FinancialDiagnostic';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

const MODES: ThemeMode[] = ['light', 'dark', 'highContrast'];

describe('SpendingChart', () => {
  it.each(MODES)('draws over-budget bars in the themed errorStrong colour at full opacity (%s)', (mode) => {
    const theme = themes[mode];
    const { container } = render(
      <SpendingChart theme={theme} bars={[{ label: 'Food', colorKey: 'NEED', planned: 100, actual: 180 }]} />,
    );
    const overBar = Array.from(container.querySelectorAll('rect')).find(
      (r) => r.getAttribute('fill') === theme.colors.errorStrong,
    );
    expect(overBar).toBeDefined();
    // The actual (over-budget) bar is opaque; only the planned ghost bar is translucent.
    expect(overBar?.hasAttribute('opacity')).toBe(false);
  });

  it('every budget.* key SpendingChart asks for exists in en and es-PE', () => {
    const src = fs.readFileSync(path.join(__dirname, 'SpendingChart.tsx'), 'utf8');
    const keys = Array.from(src.matchAll(/t\('budget\.([A-Za-z]+)'/g), (m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const locale of ['en', 'es-PE']) {
      const dict = JSON.parse(fs.readFileSync(path.join(__dirname, `../../../i18n/${locale}.json`), 'utf8'));
      const missing = keys.filter((k) => typeof dict.budget?.[k] !== 'string');
      expect({ locale, missing }).toEqual({ locale, missing: [] });
    }
  });
});

describe('FinancialDiagnostic scoreColor', () => {
  it.each(MODES)('score text is AA on the surface at every band (%s)', (mode) => {
    const theme = themes[mode];
    for (const score of [90, 55, 10]) {
      expect(contrastRatio(scoreColor(score, theme), theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
