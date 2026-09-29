import { describe, expect, it } from 'vitest';
import { contrastRatio, themes, type ThemeMode } from '../../../core/themes';
import { energyTone } from './energyTone';

const MODES: ThemeMode[] = ['light', 'dark', 'highContrast'];
const LEVELS = ['tiny', 'low', 'medium', 'high'] as const;

describe('energyTone', () => {
  it.each(MODES)('gives four visually distinct fills in %s mode', (mode) => {
    const fills = LEVELS.map((level) => energyTone(themes[mode], level).fill);
    expect(new Set(fills).size).toBe(LEVELS.length);
  });

  it.each(MODES)('keeps chip text at WCAG AA on every fill in %s mode', (mode) => {
    for (const level of LEVELS) {
      const { fill, onFill } = energyTone(themes[mode], level);
      expect(contrastRatio(fill, onFill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(MODES)('every energy fill is distinguishable from the surface in %s mode (WCAG 1.4.11)', (mode) => {
    const theme = themes[mode];
    const failing = LEVELS.map((level) => ({
      level,
      ratio: Number(contrastRatio(energyTone(theme, level).fill, theme.colors.surface).toFixed(2)),
    })).filter(({ ratio }) => ratio < 3);
    expect(failing).toEqual([]);
  });

  it('falls back to the medium tone for missing or unknown levels', () => {
    const medium = energyTone(themes.light, 'medium');
    expect(energyTone(themes.light, undefined)).toEqual(medium);
    expect(energyTone(themes.light, 'extreme')).toEqual(medium);
  });

  it('follows the active theme rather than a fixed palette', () => {
    expect(energyTone(themes.dark, 'tiny').fill).not.toBe(energyTone(themes.light, 'tiny').fill);
  });
});
