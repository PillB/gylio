/**
 * QaPage — the testers' corner: what to test, how to report it, and what
 * happened to each report they sent.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { useAppAuth } from '../../core/context/AuthContext';
import { feedbackApi, type FeedbackReport } from '../billing/billingApi';
import AdSlot from '../ads/AdSlot';
import FeedbackForm from './FeedbackForm';

const TEST_AREAS = ['onboarding', 'tasks', 'calendar', 'budget', 'routines', 'rewards', 'pricing', 'language', 'mobile'];

function StatusChip({ status }: { status: FeedbackReport['status'] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const done = status === 'fixed';
  return (
    <span style={{
      padding: '2px 10px', borderRadius: theme.shape.radiusFull, fontSize: '0.8125rem', fontWeight: 600,
      border: `1px solid ${done ? theme.colors.successStrong : theme.colors.border}`,
      color: done ? theme.colors.successStrong : theme.colors.text,
    }}>
      {t(`feedback.status.${status}`)}
    </span>
  );
}

function MyReports({ reports, error }: { reports: FeedbackReport[] | null; error: boolean }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  if (error) return <p>{t('feedback.mine.error')}</p>;
  if (!reports) return <p aria-busy="true">{t('feedback.mine.loading')}</p>;
  if (!reports.length) return <p style={{ color: theme.colors.muted }}>{t('feedback.mine.empty')}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: theme.spacing.sm }}>
      {reports.map((r) => (
        <li key={r.id} style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center', padding: theme.spacing.sm, borderBottom: `1px solid ${theme.colors.border}` }}>
          <span style={{ flex: '1 1 200px' }}>
            <strong>{r.title}</strong>
            <span style={{ display: 'block', fontSize: '0.8125rem', color: theme.colors.muted }}>
              {t(`feedback.kind.${r.kind}`)} · {new Date(r.createdAt).toLocaleDateString(i18n.language)}
            </span>
          </span>
          <StatusChip status={r.status} />
        </li>
      ))}
    </ul>
  );
}

export function QaPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { userId } = useAppAuth();
  const [reports, setReports] = useState<FeedbackReport[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    feedbackApi.mine().then((r) => { setReports(r.reports); setError(false); }).catch(() => setError(true));
  }, [userId]);
  useEffect(load, [load]);

  const card: React.CSSProperties = { padding: theme.spacing.lg, borderRadius: theme.shape.radiusLg, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface };

  return (
    <main aria-labelledby="qa-heading" style={{ display: 'grid', gap: theme.spacing.lg, maxWidth: 760, margin: '0 auto' }}>
      <header>
        <h1 id="qa-heading" style={{ margin: 0 }}>{t('feedback.qa.heading')}</h1>
        <p style={{ color: theme.colors.muted }}>{t('feedback.qa.intro')}</p>
      </header>

      <section aria-labelledby="qa-areas" style={card}>
        <h2 id="qa-areas" style={{ marginTop: 0 }}>{t('feedback.qa.whatToTest')}</h2>
        <ul>{TEST_AREAS.map((area) => <li key={area}>{t(`feedback.qa.area.${area}`)}</li>)}</ul>
        <h3>{t('feedback.qa.goodReportHeading')}</h3>
        <ol>{['one', 'steps', 'expected', 'screenshot'].map((tip) => <li key={tip}>{t(`feedback.qa.tip.${tip}`)}</li>)}</ol>
      </section>

      <section aria-labelledby="qa-report" style={card}>
        <h2 id="qa-report" style={{ marginTop: 0 }}>{t('feedback.qa.reportHeading')}</h2>
        {userId ? <FeedbackForm onSubmitted={load} /> : <p>{t('feedback.qa.signInToReport')}</p>}
      </section>

      {userId && (
        <section aria-labelledby="qa-mine" style={card}>
          <h2 id="qa-mine" style={{ marginTop: 0 }}>{t('feedback.mine.heading')}</h2>
          <MyReports reports={reports} error={error} />
        </section>
      )}
      <AdSlot placement="qa" />
    </main>
  );
}

export default QaPage;
