export type ThemeMode = 'light' | 'dark' | 'highContrast';

export interface ThemeTokens {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    accent: string;
    border: string;
    focus: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    body: {
      family: string;
      size: number;
      lineHeight: number;
    };
    heading: {
      family: string;
      weight: number;
    };
  };
  shape: {
    radiusSm: number;
    radiusMd: number;
  };
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

const typography = {
  body: {
    family: 'OpenDyslexic, "Open Sans", sans-serif',
    size: 16,
    lineHeight: 1.5
  },
  heading: {
    family: 'OpenDyslexic, "Open Sans", sans-serif',
    weight: 700
  }
};

const shape = {
  radiusSm: 8,
  radiusMd: 12
};

const palettes = {
  light: {
    background: '#ffffff',
    surface: '#f6f7fb',
    text: '#111827',
    muted: '#4b5563',
    primary: '#4b6bfb',
    accent: '#1d2f6f',
    border: '#d1d5db',
    focus: '#2f80ed'
  },
  dark: {
    background: '#0b1221',
    surface: '#111827',
    text: '#f9fafb',
    muted: '#c4c9d4',
    primary: '#9db2ff',
    accent: '#7dd3fc',
    border: '#2d3648',
    focus: '#93c5fd'
  },
  highContrast: {
    background: '#000000',
    surface: '#0f0f0f',
    text: '#ffffff',
    muted: '#e5e7eb',
    primary: '#ffff00',
    accent: '#00ffff',
    border: '#ffffff',
    focus: '#ff00ff'
  }
};

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: {
    mode: 'light',
    colors: palettes.light,
    spacing,
    typography,
    shape
  },
  dark: {
    mode: 'dark',
    colors: palettes.dark,
    spacing,
    typography,
    shape
  },
  highContrast: {
    mode: 'highContrast',
    colors: palettes.highContrast,
    spacing,
    typography,
    shape
  }
};

export const mapToPaperTheme = (theme: ThemeTokens) => ({
  dark: theme.mode === 'dark',
  roundness: theme.shape.radiusSm,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.background,
    surface: theme.colors.surface,
    accent: theme.colors.accent,
    text: theme.colors.text,
    placeholder: theme.colors.muted,
    disabled: theme.colors.muted,
    backdrop: theme.colors.border,
    notification: theme.colors.focus,
    border: theme.colors.border,
    outline: theme.colors.border,
    onSurface: theme.colors.text
  }
});
