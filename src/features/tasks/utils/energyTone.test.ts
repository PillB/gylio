import { describe, expect, it } from 'vitest';
import { themes } from '../../../core/themes';
import { contrastRatio, energyTone } from './energyTone';

const LEVELS = ['tiny', 'low', 'medium', 'high'] as const;

describe('energyTone', () => {
  it('uses the theme data-viz colour for each level', () => {
    LEVELS.forEach((level) => expect(energyTone(themes.light, level).fill).toBe(themes.light.dataViz.energy[level]));
  });

  it('falls back to medium for a missing or unknown level', () => {
    expect(energyTone(themes.light, null).fill).toBe(themes.light.dataViz.energy.medium);
    expect(energyTone(themes.light, 'extreme').fill).toBe(themes.light.dataViz.energy.medium);
  });

  it('picks the more readable label colour in every theme', () => {
    Object.values(themes).forEach((theme) =>
      LEVELS.forEach((level) => {
        const { fill, onFill } = energyTone(theme, level);
        const other = onFill === theme.colors.text ? theme.colors.background : theme.colors.text;
        expect(contrastRatio(fill, onFill)).toBeGreaterThanOrEqual(contrastRatio(fill, other));
      })
    );
  });

  it('keeps amber labels readable where white text would fail', () => {
    const { fill, onFill } = energyTone(themes.light, 'medium');
    expect(contrastRatio(fill, '#ffffff')).toBeLessThan(3);
    expect(contrastRatio(fill, onFill)).toBeGreaterThanOrEqual(4.5);
  });
});
