import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';

/**
 * SiteUtilityFooter
 *
 * The footer used to live as static English HTML outside the React/i18next
 * tree. Rendering it here keeps visible copy and its accessible name in the
 * same locale as the rest of the app while preserving the standalone guide
 * link for GitHub Pages and other Vite base paths.
 */
export default function SiteUtilityFooter() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <footer
      className="site-utility-footer"
      aria-label={t('shell.productResources')}
      style={{
        borderColor: theme.colors.border,
        color: theme.colors.muted,
      }}
    >
      <span>{t('shell.resourcesLabel')}</span>
      <a
        href={`${import.meta.env.BASE_URL}deployment-guide.html`}
        style={{ color: theme.colors.primary }}
      >
        {t('shell.deploymentAcademy')}
      </a>
    </footer>
  );
}
