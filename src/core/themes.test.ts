import { describe, expect, it } from 'vitest';
import { contrastRatio, readableTextOn, relativeLuminance } from './contrast';
import { themes, type ThemeMode } from './themes';

const MODES: ThemeMode[] = ['light', 'dark', 'highContrast'];
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('contrastRatio', () => {
  it('matches the WCAG reference values for black and white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777', '#777777')).toBeCloseTo(1, 5);
    // Published reference: #767676 on white is the lightest grey passing AA (4.54:1).
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('is symmetric in its arguments', () => {
    expect(contrastRatio('#5B5CF6', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#5B5CF6'), 10);
  });

  it('rejects colors it cannot parse instead of guessing', () => {
    expect(() => relativeLuminance('rgba(0,0,0,0.5)')).toThrow(/Unsupported color/);
  });
});

describe('readableTextOn', () => {
  it('chooses dark text on bright fills that white text fails on', () => {
    expect(readableTextOn('#F59E0B')).not.toBe('#FFFFFF');
    expect(readableTextOn('#22C55E')).not.toBe('#FFFFFF');
  });

  it('chooses white text on deep fills', () => {
    expect(readableTextOn('#1C1B22')).toBe('#FFFFFF');
    expect(readableTextOn('#7C3AED')).toBe('#FFFFFF');
  });
});

describe.each(MODES)('%s theme tokens', (mode) => {
  const { colors, dataViz } = themes[mode];
  const hues: Array<[string, string]> = [
    ...Object.entries(dataViz.energy).map(([k, v]): [string, string] => [`energy.${k}`, v]),
    ...Object.entries(dataViz.budget).map(([k, v]): [string, string] => [`budget.${k}`, v]),
    ...dataViz.series.map((v, i): [string, string] => [`series[${i}]`, v]),
  ];

  it('body and muted text are AA on background and surface (WCAG 1.4.3)', () => {
    for (const bg of [colors.background, colors.surface]) {
      expect(contrastRatio(colors.text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.muted, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each([
    ['primary', 'primaryForeground'],
    ['success', 'onSuccess'],
    ['warning', 'onWarning'],
    ['error', 'onError'],
  ] as const)('%s fill keeps %s text at AA', (fill, on) => {
    expect(contrastRatio(colors[fill], colors[on])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('primaryForeground stays AA across the whole primary gradient', () => {
    expect(contrastRatio(colors.primaryForeground, colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(colors.primaryForeground, colors.primaryGradientEnd)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(['successStrong', 'errorStrong'] as const)('%s is AA body text on surface and background', (key) => {
    expect(contrastRatio(colors[key], colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(colors[key], colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('body text stays AA on every calendar event tint', () => {
    expect(dataViz.eventTints.length).toBeGreaterThan(0);
    for (const tint of dataViz.eventTints) {
      expect(contrastRatio(colors.text, tint)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('every data-viz hue is distinguishable from the surface (WCAG 1.4.11)', () => {
    const failing = hues
      .map(([name, value]) => ({ name, ratio: Number(contrastRatio(value, colors.surface).toFixed(2)) }))
      .filter(({ ratio }) => ratio < AA_NON_TEXT);
    expect(failing).toEqual([]);
  });

  it('categories within each data-viz group never collapse into one color', () => {
    const groups = [Object.values(dataViz.energy), Object.values(dataViz.budget), dataViz.series];
    for (const group of groups) {
      const values = group.map((v) => v.toLowerCase());
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('readableTextOn gives AA text on every data-viz hue', () => {
    for (const [, value] of hues) {
      expect(contrastRatio(readableTextOn(value), value)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
