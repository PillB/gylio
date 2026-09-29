import type { ThemeTokens } from '../../../core/themes';

export type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

export interface EnergyTone {
  fill: string;
  onFill: string;
}

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a #rgb or #rrggbb colour; null for anything else. */
const luminance = (color: string): number | null => {
  const hex = color.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((start) => channel(parseInt(full.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la == null || lb == null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const isEnergyLevel = (level: string | null | undefined): level is EnergyLevel =>
  level === 'tiny' || level === 'low' || level === 'medium' || level === 'high';

/**
 * A task's energy colour from the theme's data-viz scale, plus whichever of the
 * theme's text or background colour reads better on it. Unknown levels fall back
 * to `medium` so a bad record never renders an invisible chip.
 */
export const energyTone = (theme: ThemeTokens, level: string | null | undefined): EnergyTone => {
  const fill = theme.dataViz.energy[isEnergyLevel(level) ? level : 'medium'];
  const { text, background } = theme.colors;
  return { fill, onFill: contrastRatio(fill, text) >= contrastRatio(fill, background) ? text : background };
};
