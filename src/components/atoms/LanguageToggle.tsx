import React from 'react';
import { useTranslation } from 'react-i18next';

export type LanguageToggleProps = {
  ariaLabel?: string;
  placement?: 'header' | 'nav' | 'inline';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

const baseStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #ccc',
  borderRadius: '8px',
  cursor: 'pointer',
  background: '#fff',
  color: '#222'
};

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
      style={{ ...baseStyle, ...placementStyles[placement], ...style }}
      className={className}
    >
      {destinationLabel}
    </button>
  );
};

export default LanguageToggle;
