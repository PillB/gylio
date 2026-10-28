/**
 * AnalyticsTab — what people do in Gylio, from the events the app sends
 * (no personal data). Summary first, then the funnel, A/B tests, ads, all events.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { adminApi, type AnalyticsSummary } from '../billing/billingApi';

const RANGES = [1, 7, 30, 90];
const pct = (x: number, locale: string) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(x);

function Table({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  const { theme } = useTheme();
  const cell: React.CSSProperties = { padding: '6px 8px', borderBottom: `1px solid ${theme.colors.border}`, textAlign: 'left' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
        <caption style={{ textAlign: 'left', fontWeight: 700, padding: '8px 0' }}>{caption}</caption>
        <thead><tr>{headers.map((h) => <th key={h} scope="col" style={cell}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={cell}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Sections({ data }: { data: AnalyticsSummary }) {
  const { t, i18n } = useTranslation();
  const n = (x: number) => new Intl.NumberFormat(i18n.language).format(x);
  const top = data.funnel[0]?.sessions || 0;
  return (
    <>
      <Table caption={t('admin.analytics.funnelHeading')} headers={['', t('admin.analytics.sessions'), '%']}
        rows={data.funnel.map((f) => [t(`admin.analytics.step.${f.step}`), n(f.sessions), top ? pct(f.sessions / top, i18n.language) : '—'])} />
      <Table caption={t('admin.analytics.abHeading')}
        headers={[t('admin.analytics.experiment'), t('admin.analytics.variant'), t('admin.analytics.exposed'), t('admin.analytics.trials'), t('admin.analytics.trialRate')]}
        rows={data.experiments.map((e) => [e.experiment, e.variant, n(e.exposed), n(e.trials), pct(e.trialRate, i18n.language)])} />
      <p style={{ margin: 0, fontSize: '0.8125rem' }}>{t('admin.analytics.abNote')}</p>
      <Table caption={t('admin.analytics.adsHeading')}
        headers={[t('admin.analytics.provider'), t('admin.analytics.placement'), t('admin.analytics.impressions'), t('admin.analytics.clicks'), t('admin.analytics.ctr')]}
        rows={data.ads.map((a) => [a.provider, a.placement, n(a.impressions), n(a.clicks), pct(a.ctr, i18n.language)])} />
      <Table caption={t('admin.analytics.eventsHeading')} headers={[t('admin.analytics.event'), t('admin.analytics.count'), t('admin.analytics.sessions')]}
        rows={data.totals.map((r) => [r.name, n(r.events), n(r.sessions)])} />
      <Table caption={t('admin.analytics.dailyHeading')} headers={[t('admin.analytics.day'), t('admin.analytics.count'), t('admin.analytics.sessions')]}
        rows={data.daily.map((d) => [d.day, n(d.events), n(d.sessions)])} />
    </>
  );
}

export function AnalyticsTab() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    adminApi.analytics(days).then(setData).catch(() => setError(true));
  }, [days]);
  useEffect(load, [load]);

  const control: React.CSSProperties = { minHeight: 44, padding: `0 ${theme.spacing.sm}px`, borderRadius: theme.shape.radiusMd, border: `1px solid ${theme.colors.borderStrong}`, background: theme.colors.background, color: theme.colors.text, font: 'inherit' };
  return (
    <section aria-labelledby="analytics-heading" style={{ display: 'grid', gap: 16 }}>
      <h2 id="analytics-heading" style={{ margin: 0 }}>{t('admin.analytics.heading')}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 4, fontWeight: 600 }}>{t('admin.analytics.range')}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={control}>
            {RANGES.map((d) => <option key={d} value={d}>{t(`admin.analytics.days.${d}`)}</option>)}
          </select>
        </label>
        <button type="button" onClick={load} style={{ ...control, cursor: 'pointer' }}>{t('admin.analytics.refresh')}</button>
      </div>
      {error && <p role="alert">{t('admin.analytics.error')}</p>}
      {data && (
        <p role="status" style={{ margin: 0 }}>
          {t('admin.analytics.summary', { events: data.events, sessions: data.sessions, signedIn: data.signedInSessions })}
          {data.truncated ? ` ${t('admin.analytics.truncated')}` : ''}
        </p>
      )}
      {data && (data.events ? <Sections data={data} /> : <p>{t('admin.analytics.empty')}</p>)}
    </section>
  );
}

export default AnalyticsTab;
