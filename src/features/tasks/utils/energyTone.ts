import type { ThemeTokens } from '../../../core/themes';

export type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';

export interface EnergyTone {
  fill: string;
  onFill: string;
}

/**
 * Maps a task's energy level to a status-coloured fill plus the text colour that
 * stays readable on it. Unknown levels fall back to `medium` so a bad record never
 * renders an invisible chip.
 */
export const energyTone = (theme: ThemeTokens, level: string | null | undefined): EnergyTone => {
  const { colors } = theme;
  switch (level) {
    case 'tiny':
      return { fill: colors.success, onFill: colors.onSuccess };
    case 'low':
      return { fill: colors.info, onFill: colors.onInfo };
    case 'high':
      return { fill: colors.error, onFill: colors.onError };
    case 'medium':
    default:
      return { fill: colors.warning, onFill: colors.onWarning };
  }
};
