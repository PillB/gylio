export type SupportProfileKey = 'focus' | 'quiet' | 'reading' | 'visibility';

export type SupportProfileConfig = {
  textStyle: 'standard' | 'large' | 'spaced';
  contrast: 'balanced' | 'high';
  motion: 'system' | 'reduced' | 'standard';
  animations: boolean;
  tts: boolean;
  theme: 'highContrast' | null;
};

/**
 * Optional, reversible starter combinations.
 *
 * These profiles are intentionally named by the interface experience they
 * create, not by a diagnosis. Evidence for individual UI preferences varies,
 * so profiles are suggestions rather than medical or accessibility
 * prescriptions. Users can fine-tune every setting before or after onboarding.
 */
export const SUPPORT_PROFILES: Record<SupportProfileKey, SupportProfileConfig> = {
  focus: {
    textStyle: 'large',
    contrast: 'balanced',
    motion: 'reduced',
    animations: false,
    tts: false,
    theme: null,
  },
  quiet: {
    textStyle: 'standard',
    contrast: 'balanced',
    motion: 'reduced',
    animations: false,
    tts: false,
    theme: null,
  },
  reading: {
    textStyle: 'large',
    contrast: 'balanced',
    motion: 'system',
    animations: true,
    tts: true,
    theme: null,
  },
  visibility: {
    textStyle: 'large',
    contrast: 'high',
    motion: 'system',
    animations: true,
    tts: false,
    theme: 'highContrast',
  },
};
