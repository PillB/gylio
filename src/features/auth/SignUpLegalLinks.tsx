import React from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../core/analytics';
import { legalPath, type LegalDocId } from '../legal/legalDocs';

const DOCS: { doc: LegalDocId; key: string }[] = [
  { doc: 'terms', key: 'shell.termsOfService' },
  { doc: 'privacy', key: 'shell.privacyPolicy' },
];

/** Links to the legal pages beside the sign-up form; labels only, no added wording. */
export default function SignUpLegalLinks({ from = 'sign_up' }: { from?: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('shell.legalLinks')} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      {DOCS.map(({ doc, key }) => (
        <a key={doc} href={legalPath(doc)} onClick={() => track('legal_link_clicked', { doc, from })}>
          {t(key)}
        </a>
      ))}
    </nav>
  );
}
