/**
 * LanguageToggle — production-language selector.
 *
 * Only locales that have passed translation and UX QA are exposed. Draft
 * catalogs may exist in src/i18n without appearing here until they meet the
 * same release gate. Language names use autonyms instead of country flags:
 * languages and countries are not a one-to-one relationship.
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
  { code: 'en', label: 'English' },
  { code: 'es-PE', label: 'Español (Perú)' },
] as const;

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

  // Generic browser Spanish intentionally maps to the reviewed es-PE catalog.
  const currentCode = i18n.language.toLowerCase().startsWith('es') ? 'es-PE' : 'en';
  const defaultAriaLabel = currentCode === 'es-PE' ? 'Seleccionar idioma' : 'Select language';

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
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
      aria-label={ariaLabel ?? defaultAriaLabel}
      className={className}
      style={selectStyle}
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
};

export default LanguageToggle;
