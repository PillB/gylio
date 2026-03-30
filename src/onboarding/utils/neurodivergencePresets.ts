export type PresetKey = 'adhd' | 'autism' | 'anxiety' | 'dyslexia';

export type PresetConfig = {
  label: string;
  description: string;
  textStyle: 'dyslexic' | 'standard' | 'large';
  contrast: 'high' | 'balanced';
  motion: 'reduced' | 'standard';
  animations: boolean;
  tts: boolean;
  theme: 'light' | 'dark' | 'highContrast' | null;
};

export const PRESETS: Record<PresetKey, PresetConfig> = {
  adhd: {
    label: 'ADHD',
    description: 'Large text · Standard motion · Balanced contrast',
    textStyle: 'large',
    contrast: 'balanced',
    motion: 'standard',
    animations: true,
    tts: false,
    theme: null,
  },
  autism: {
    label: 'Autism / ASD',
    description: 'High contrast · Reduced animations · Explicit structure',
    textStyle: 'standard',
    contrast: 'high',
    motion: 'reduced',
    animations: false,
    tts: false,
    theme: 'highContrast',
  },
  anxiety: {
    label: 'Anxiety',
    description: 'Calming light theme · Gentle language · Reduced motion',
    textStyle: 'standard',
    contrast: 'balanced',
    motion: 'reduced',
    animations: false,
    tts: false,
    theme: 'light',
  },
  dyslexia: {
    label: 'Dyslexia',
    description: 'OpenDyslexic font · Extra spacing · Text-to-speech',
    textStyle: 'dyslexic',
    contrast: 'balanced',
    motion: 'standard',
    animations: true,
    tts: true,
    theme: null,
  },
};
