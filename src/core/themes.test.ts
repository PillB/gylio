import { describe, expect, it } from 'vitest';
import { contrastRatio, readableTextOn, relativeLuminance, themes, type ThemeMode } from './themes';

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
  const { colors, dataViz, eventTints } = themes[mode];

  it.each([
    ['primary', 'primaryForeground'],
    ['secondary', 'onSecondary'],
    ['info', 'onInfo'],
    ['success', 'onSuccess'],
    ['warning', 'onWarning'],
    ['error', 'onError'],
  ] as const)('%s fill keeps %s text at AA', (fill, on) => {
    expect(contrastRatio(colors[fill], colors[on])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(['success', 'warning', 'error'] as const)('%sStrong text is AA on %sSoft and on surface', (status) => {
    const strong = colors[`${status}Strong`];
    expect(contrastRatio(strong, colors[`${status}Soft`])).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(strong, colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('body and muted text are AA on background and surface (WCAG 1.4.3)', () => {
    for (const bg of [colors.background, colors.surface]) {
      expect(contrastRatio(colors.text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.muted, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(['success', 'warning', 'error'] as const)('%sStrong text is also AA on the page background', (status) => {
    expect(contrastRatio(colors[`${status}Strong`], colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('every data-viz hue is distinguishable from the surface (WCAG 1.4.11)', () => {
    for (const [hue, value] of Object.entries(dataViz)) {
      expect({ hue, ratio: contrastRatio(value, colors.surface) >= AA_NON_TEXT }).toEqual({ hue, ratio: true });
    }
  });

  it('data-viz hues are unique so categories never collapse into one color', () => {
    const values = Object.values(dataViz).map((v) => v.toLowerCase());
    expect(new Set(values).size).toBe(values.length);
  });

  it('body text stays AA on every calendar event tint', () => {
    expect(eventTints.length).toBeGreaterThan(0);
    for (const tint of eventTints) {
      expect(contrastRatio(colors.text, tint)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('muted outlines stay visible on the surface (calendar event markers rely on it)', () => {
    expect(contrastRatio(colors.muted, colors.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('readableTextOn gives AA text on every data-viz hue', () => {
    for (const value of Object.values(dataViz)) {
      expect(contrastRatio(readableTextOn(value), value)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
