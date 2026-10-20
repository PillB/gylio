import { readableTextOn, type ThemeTokens } from '../../../core/themes';

export type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

export interface EnergyTone {
  fill: string;
  onFill: string;
}

/**
 * Maps a task's energy level to a data-viz fill plus the text colour that stays
 * readable on it. The dataViz hues are tuned per mode to clear 3:1 against the
 * surface (WCAG 1.4.11); the light status colours (success/warning) do not.
 * Unknown levels fall back to `medium` so a bad record never renders an
 * invisible chip.
 */
export const energyTone = (theme: ThemeTokens, level: string | null | undefined): EnergyTone => {
  const { dataViz } = theme;
  let fill: string;
  switch (level) {
    case 'tiny':
      fill = dataViz.green;
      break;
    case 'low':
      fill = dataViz.blue;
      break;
    case 'high':
      fill = dataViz.red;
      break;
    case 'medium':
    default:
      fill = dataViz.amber;
  }
  return { fill, onFill: readableTextOn(fill) };
};
