export type ThemeMode = 'light' | 'dark' | 'highContrast';

export interface ThemeTokens {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    muted: string;
    primary: string;
    primaryHover: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    onSuccess: string;
    onWarning: string;
    onError: string;
    primaryForeground: string;
    border: string;
    borderStrong: string;
    focus: string;
    overlay: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
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
    radiusXs: number;
    radiusSm: number;
    radiusMd: number;
    radiusLg: number;
    radiusXl: number;
    radiusFull: number;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animation: {
    fast: string;
    standard: string;
    slow: string;
    bounce: string;
  };
  zIndex: {
    dropdown: number;
    sticky: number;
    modal: number;
    tour: number;
    toast: number;
    tooltip: number;
  };
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const typography = {
  body: {
    family: "'Inter', 'Open Sans', system-ui, sans-serif",
    size: 16,
    lineHeight: 1.6,
  },
  heading: {
    family: "'Inter', 'Open Sans', system-ui, sans-serif",
    weight: 700,
  },
};

const shape = {
  radiusXs: 4,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 20,
  radiusXl: 32,
  radiusFull: 9999,
};

const animation = {
  fast: '150ms ease-out',
  standard: '250ms ease-out',
  slow: '400ms ease-out',
  bounce: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 400,
  tour: 8000,
  toast: 9000,
  tooltip: 9500,
};

const palettes = {
  light: {
    background: '#F8F7F4',
    surface: '#FFFFFF',
    surfaceElevated: '#F2F0FA',
    text: '#1C1B22',
    muted: '#6B6880',
    primary: '#5B5CF6',
    primaryHover: '#4849E8',
    primaryForeground: '#FFFFFF',
    accent: '#EC4899',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    onSuccess: '#1C1B22',
    onWarning: '#1C1B22',
    onError: '#1C1B22',
    border: '#E2E0EA',
    borderStrong: '#C4C0D4',
    focus: '#5B5CF6',
    overlay: 'rgba(91,92,246,0.08)',
  },
  dark: {
    background: '#0D0D14',
    surface: '#13131E',
    surfaceElevated: '#1A1A2E',
    text: '#F0EFF8',
    muted: '#8A8899',
    primary: '#8182FA',
    primaryHover: '#9394FB',
    primaryForeground: '#0D0D14',
    accent: '#F472B6',
    success: '#4ADE80',
    warning: '#FBD061',
    error: '#F87171',
    onSuccess: '#0D0D14',
    onWarning: '#0D0D14',
    onError: '#0D0D14',
    border: '#2A2940',
    borderStrong: '#3D3C58',
    focus: '#8182FA',
    overlay: 'rgba(129,130,250,0.12)',
  },
  highContrast: {
    background: '#000000',
    surface: '#0f0f0f',
    surfaceElevated: '#1a1a1a',
    text: '#ffffff',
    muted: '#e5e7eb',
    primary: '#ffff00',
    primaryHover: '#e0e000',
    primaryForeground: '#000000',
    accent: '#00ffff',
    success: '#00ff88',
    warning: '#ffaa00',
    error: '#ff4444',
    onSuccess: '#000000',
    onWarning: '#000000',
    onError: '#000000',
    border: '#ffffff',
    borderStrong: '#ffffff',
    focus: '#ff00ff',
    overlay: 'rgba(255,255,0,0.15)',
  },
};

const shadows = {
  light: {
    sm: '0 1px 3px rgba(28,27,34,0.06), 0 1px 2px rgba(28,27,34,0.04)',
    md: '0 4px 12px rgba(28,27,34,0.08), 0 2px 4px rgba(28,27,34,0.05)',
    lg: '0 10px 24px rgba(28,27,34,0.10), 0 4px 8px rgba(28,27,34,0.06)',
    xl: '0 20px 40px rgba(28,27,34,0.12), 0 8px 16px rgba(28,27,34,0.06)',
  },
  dark: {
    sm: '0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)',
    md: '0 4px 12px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)',
    lg: '0 10px 24px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.35)',
    xl: '0 20px 40px rgba(0,0,0,0.60), 0 8px 16px rgba(0,0,0,0.35)',
  },
  highContrast: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
  },
};

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: {
    mode: 'light',
    colors: palettes.light,
    spacing,
    typography,
    shape,
    shadow: shadows.light,
    animation,
    zIndex,
  },
  dark: {
    mode: 'dark',
    colors: palettes.dark,
    spacing,
    typography,
    shape,
    shadow: shadows.dark,
    animation,
    zIndex,
  },
  highContrast: {
    mode: 'highContrast',
    colors: palettes.highContrast,
    spacing,
    typography,
    shape,
    shadow: shadows.highContrast,
    animation,
    zIndex,
  },
};

export const mapToPaperTheme = (theme: ThemeTokens) => ({
  dark: theme.mode === 'dark',
  roundness: theme.shape.radiusMd,
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
    onSurface: theme.colors.text,
  },
});
