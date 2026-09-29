export type ThemeMode = 'light' | 'dark' | 'highContrast';

export type DataVizHue =
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'amber'
  | 'green'
  | 'blue'
  | 'red'
  | 'teal'
  | 'orange';

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
    /** Companion hue for gradients and secondary accents. */
    secondary: string;
    onSecondary: string;
    /** Neutral informational state (distinct from brand primary). */
    info: string;
    onInfo: string;
    /** Tinted backgrounds and readable text for status callouts. */
    successSoft: string;
    successStrong: string;
    warningSoft: string;
    warningStrong: string;
    errorSoft: string;
    errorStrong: string;
    border: string;
    borderStrong: string;
    focus: string;
    overlay: string;
  };
  /** Categorical data-visualization hues, tuned per mode for >= 3:1 against surface. */
  dataViz: Record<DataVizHue, string>;
  /** Soft backgrounds for calendar event tiles; body text stays readable on each. */
  eventTints: readonly string[];
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
    secondary: '#7C3AED',
    onSecondary: '#FFFFFF',
    info: '#2563EB',
    onInfo: '#FFFFFF',
    successSoft: '#F0FDF4',
    successStrong: '#15803D',
    warningSoft: '#FFFBEB',
    warningStrong: '#92400E',
    errorSoft: '#FEF2F2',
    errorStrong: '#B91C1C',
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
    secondary: '#A78BFA',
    onSecondary: '#0D0D14',
    info: '#60A5FA',
    onInfo: '#0D0D14',
    successSoft: '#0F2A1C',
    successStrong: '#86EFAC',
    warningSoft: '#2E2410',
    warningStrong: '#FCD34D',
    errorSoft: '#2E1416',
    errorStrong: '#FCA5A5',
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
    secondary: '#e0e000',
    onSecondary: '#000000',
    info: '#00ffff',
    onInfo: '#000000',
    successSoft: '#000000',
    successStrong: '#00ff88',
    warningSoft: '#000000',
    warningStrong: '#ffaa00',
    errorSoft: '#000000',
    errorStrong: '#ff4444',
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

const dataViz: Record<ThemeMode, Record<DataVizHue, string>> = {
  // 600-level hues: each clears the 3:1 non-text contrast bar (WCAG 1.4.11) on white.
  light: {
    indigo: '#5B5CF6',
    violet: '#7C3AED',
    pink: '#DB2777',
    amber: '#D97706',
    green: '#16A34A',
    blue: '#2563EB',
    red: '#DC2626',
    teal: '#0D9488',
    orange: '#EA580C',
  },
  // 400-level hues so marks stay visible on the near-black dark surface.
  dark: {
    indigo: '#818CF8',
    violet: '#A78BFA',
    pink: '#F472B6',
    amber: '#FBBF24',
    green: '#4ADE80',
    blue: '#60A5FA',
    red: '#F87171',
    teal: '#2DD4BF',
    orange: '#FB923C',
  },
  highContrast: {
    indigo: '#8080ff',
    violet: '#d080ff',
    pink: '#ff66cc',
    amber: '#ffcc00',
    green: '#00ff88',
    blue: '#66b3ff',
    red: '#ff4444',
    teal: '#00ffff',
    orange: '#ff9933',
  },
};

const eventTints: Record<ThemeMode, readonly string[]> = {
  light: ['#e8f1ff', '#eaf7f1', '#fdf1e7', '#f3e8ff', '#eaf3fb', '#f2f7e9'],
  dark: ['#1f2a44', '#24324d', '#2b3c57', '#2e4360', '#304a69', '#314f72'],
  // High contrast keeps tiles near-black so white text stays at maximum contrast.
  highContrast: ['#0f0f0f', '#1a1a1a', '#0f0f0f', '#1a1a1a', '#0f0f0f', '#1a1a1a'],
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
    dataViz: dataViz.light,
    eventTints: eventTints.light,
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
    dataViz: dataViz.dark,
    eventTints: eventTints.dark,
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
    dataViz: dataViz.highContrast,
    eventTints: eventTints.highContrast,
    spacing,
    typography,
    shape,
    shadow: shadows.highContrast,
    animation,
    zIndex,
  },
};

const READABLE_LIGHT_TEXT = '#FFFFFF';
const READABLE_DARK_TEXT = '#1C1B22';

const channelToLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance of a #rgb / #rrggbb color. */
export const relativeLuminance = (hex: string): number => {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Unsupported color: ${hex}`);
  }
  const [r, g, b] = [0, 2, 4].map((i) => channelToLinear(parseInt(value.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.x contrast ratio between two hex colors (1 to 21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Picks whichever of near-white or near-black text reads better on `background`. */
export const readableTextOn = (background: string): string =>
  contrastRatio(READABLE_LIGHT_TEXT, background) >= contrastRatio(READABLE_DARK_TEXT, background)
    ? READABLE_LIGHT_TEXT
    : READABLE_DARK_TEXT;

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
