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

const baseStyle = (
  colors: ThemeTokens['colors'],
  shape: ThemeTokens['shape']
): React.CSSProperties => ({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${colors.border}`,
  borderRadius: shape.radiusSm,
  cursor: 'pointer',
  background: colors.surface,
  color: colors.text,
});

const placementStyles: Record<NonNullable<LanguageToggleProps['placement']>, React.CSSProperties> = {
  header: {
    alignSelf: 'center'
  },
  nav: {
    alignSelf: 'center'
  },
  inline: {}
};

const LanguageToggle: React.FC<LanguageToggleProps> = ({
  ariaLabel,
  placement = 'inline',
  title,
  className,
  style
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const nextLanguage = i18n.language === 'es-PE' ? 'en' : 'es-PE';
  const destinationLabel = t('languageToggle');
  const computedAriaLabel =
    ariaLabel || t('onboarding.languageToggle.aria', { language: destinationLabel });

  const handleToggle = () => {
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={computedAriaLabel}
      title={title || t('languageToggleHelper')}
      style={{ ...baseStyle(theme.colors, theme.shape), ...placementStyles[placement], ...style }}
      className={className}
    >
      {destinationLabel}
    </button>
  );
};

export default LanguageToggle;
