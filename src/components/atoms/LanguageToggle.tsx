/**
 * LanguageToggle — Multi-language selector dropdown.
 *
 * Shows all supported languages with flag emoji + native name.
 * Persists choice via i18next's localStorage detection.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import type { ThemeTokens } from '../../core/themes';

export type LanguageToggleProps = {
  ariaLabel?: string;
  placement?: 'header' | 'nav' | 'inline';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

const LANGUAGES = [
  { code: 'en',    flag: '🇬🇧', label: 'English' },
  { code: 'es-PE', flag: '🇵🇪', label: 'Español (PE)' },
  { code: 'de',    flag: '🇩🇪', label: 'Deutsch' },
  { code: 'fr',    flag: '🇫🇷', label: 'Français' },
  { code: 'it',    flag: '🇮🇹', label: 'Italiano' },
  { code: 'zh',    flag: '🇨🇳', label: '中文' },
  { code: 'sw',    flag: '🌍', label: 'Kiswahili' },
  { code: 'hi',    flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'id',    flag: '🇮🇩', label: 'Bahasa Indonesia' },
];

const placementStyles: Record<NonNullable<LanguageToggleProps['placement']>, React.CSSProperties> = {
  header: { alignSelf: 'center' },
  nav:    { alignSelf: 'center' },
  inline: {},
};

const LanguageToggle: React.FC<LanguageToggleProps> = ({
  ariaLabel,
  placement = 'inline',
  className,
  style,
}) => {
  const { i18n } = useTranslation();
  const { theme } = useTheme();

  // Normalize: strip region variants not in our list (e.g. 'es' → 'es-PE')
  const currentCode =
    LANGUAGES.find((l) => l.code === i18n.language)?.code ??
    LANGUAGES.find((l) => i18n.language.startsWith(l.code.split('-')[0]))?.code ??
    'en';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: (theme.shape as ThemeTokens['shape']).radiusSm,
    cursor: 'pointer',
    background: theme.colors.surface,
    color: theme.colors.text,
    fontSize: '0.85rem',
    fontFamily: theme.typography.body.family,
    ...placementStyles[placement],
    ...style,
  };

  return (
    <select
      value={currentCode}
      onChange={handleChange}
      aria-label={ariaLabel ?? 'Select language'}
      className={className}
      style={selectStyle}
    >
      {LANGUAGES.map(({ code, flag, label }) => (
        <option key={code} value={code}>
          {flag} {label}
        </option>
      ))}
    </select>
  );
};

export default LanguageToggle;
