import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { track } from '../../core/analytics';
import { legalPath, type LegalDocId } from './legalDocs';

const LINKS: { doc: LegalDocId; key: string }[] = [
  { doc: 'terms', key: 'shell.termsOfService' },
  { doc: 'privacy', key: 'shell.privacyPolicy' },
];

/** Site-wide links to the Terms of Service and Privacy Policy. */
export default function LegalFooter() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <footer className="legal-footer" aria-label={t('shell.legalLinks')}>
      {LINKS.map(({ doc, key }) => (
        <a
          key={doc}
          href={legalPath(doc)}
          onClick={() => track('legal_link_clicked', { doc, from: 'footer' })}
          style={{ color: theme.colors.primary }}
        >
          {t(key)}
        </a>
      ))}
    </footer>
  );
}
