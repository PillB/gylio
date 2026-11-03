import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { track } from '../../core/analytics';
import { LEGAL_LAST_UPDATED, legalText, type LegalDocId } from './legalDocs';
import { renderMarkdown } from './renderMarkdown';

const formatDate = (iso: string, language: string) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

export default function LegalPage({ doc }: { doc: LegalDocId }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const language = i18n.resolvedLanguage || i18n.language;
  const body = useMemo(
    () => renderMarkdown(legalText(doc, language), import.meta.env.BASE_URL),
    [doc, language],
  );

  useEffect(() => {
    track('legal_page_viewed', { doc, locale: language });
  }, [doc, language]);

  return (
    <main
      className="legal-page"
     
      style={{ maxWidth: 760, margin: '0 auto', padding: `${theme.spacing.lg}px 0`, lineHeight: 1.6, color: theme.colors.text }}
    >
      <p style={{ color: theme.colors.muted, margin: 0 }}>
        {t('shell.legalLastUpdated', { date: formatDate(LEGAL_LAST_UPDATED, language) })}
      </p>
      <article>{body}</article>
    </main>
  );
}
