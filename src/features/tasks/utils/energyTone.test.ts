import { describe, expect, it } from 'vitest';
import { themes } from '../../../core/themes';
import { contrastRatio } from '../../../core/contrast';
import { energyTone } from './energyTone';

const LEVELS = ['tiny', 'low', 'medium', 'high'] as const;

describe('energyTone', () => {
  it('uses the theme data-viz colour for each level', () => {
    LEVELS.forEach((level) => expect(energyTone(themes.light, level).fill).toBe(themes.light.dataViz.energy[level]));
  });

  it('falls back to medium for a missing or unknown level', () => {
    expect(energyTone(themes.light, null).fill).toBe(themes.light.dataViz.energy.medium);
    expect(energyTone(themes.light, 'extreme').fill).toBe(themes.light.dataViz.energy.medium);
  });

  it('keeps every label at AA contrast for large text in every theme', () => {
    Object.values(themes).forEach((theme) =>
      LEVELS.forEach((level) => {
        const { fill, onFill } = energyTone(theme, level);
        expect(contrastRatio(fill, onFill)).toBeGreaterThanOrEqual(3);
      })
    );
  });

  it('reads better than always-white labels on the light theme', () => {
    LEVELS.forEach((level) => {
      const { fill, onFill } = energyTone(themes.light, level);
      expect(contrastRatio(fill, onFill)).toBeGreaterThanOrEqual(contrastRatio(fill, '#ffffff'));
    });
  });
});
