import type { ThemeTokens } from '../../../core/themes';
import { readableTextOn } from '../../../core/contrast';

export type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

export interface EnergyTone {
  fill: string;
  onFill: string;
}

const isEnergyLevel = (level: string | null | undefined): level is EnergyLevel =>
  level === 'tiny' || level === 'low' || level === 'medium' || level === 'high';

/**
 * A task's energy colour from the theme's data-viz scale, plus the label colour
 * that reads best on it. Unknown levels fall back to `medium` so a bad record
 * never renders an invisible chip.
 */
export const energyTone = (theme: ThemeTokens, level: string | null | undefined): EnergyTone => {
  const fill = theme.dataViz.energy[isEnergyLevel(level) ? level : 'medium'];
  return { fill, onFill: readableTextOn(fill) };
};
