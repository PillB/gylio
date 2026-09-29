/**
 * AdminPage — Pro gifts for friends, family and testers, a list of everyone
 * who has Pro and why, and the QA inbox. The server enforces admin access on
 * every call (ADMIN_USER_IDS); this page only hides itself for everyone else.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { useEntitlement } from '../billing/EntitlementContext';
import { adminApi, type FeedbackReport, type FeedbackStatus, type Gift, type ProUser } from '../billing/billingApi';

const DURATIONS = ['7', '30', '90', '365', 'indefinite'] as const;
const REASONS = ['tester', 'friend', 'family', 'support', 'promo', 'other'];
const STATUSES: FeedbackStatus[] = ['new', 'triaged', 'in_progress', 'fixed', 'wont_fix', 'duplicate'];

function useStyles() {
  const { theme } = useTheme();
  return {
    card: { padding: theme.spacing.lg, borderRadius: theme.shape.radiusLg, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface } as React.CSSProperties,
    input: { minHeight: 44, padding: theme.spacing.sm, borderRadius: theme.shape.radiusMd, border: `1px solid ${theme.colors.borderStrong}`, background: theme.colors.background, color: theme.colors.text, font: 'inherit' } as React.CSSProperties,
    button: { minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull, border: 'none', background: theme.colors.primary, color: theme.colors.primaryForeground, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    quiet: { minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull, border: `1px solid ${theme.colors.border}`, background: 'transparent', color: theme.colors.text, cursor: 'pointer' } as React.CSSProperties,
    label: { display: 'grid', gap: 4, fontWeight: 600 } as React.CSSProperties,
  };
}

const fmtDate = (iso: string | null, locale: string, fallback: string) => (iso ? new Date(iso).toLocaleDateString(locale) : fallback);

function GiftForm({ onGranted }: { onGranted: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>('30');
  const [reason, setReason] = useState('tester');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const isEmail = target.includes('@');
    try {
      const gift = await adminApi.grantGift({
        ...(isEmail ? { email: target.trim() } : { userId: target.trim() }),
        days: duration === 'indefinite' ? null : Number(duration),
        reason,
        note: note || undefined,
      });
      setResult({ ok: true, text: gift.userId ? t('admin.gift.granted') : t('admin.gift.pending') });
      setTarget('');
      setNote('');
      onGranted();
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : t('admin.error') });
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      <label style={styles.label}>
        {t('admin.gift.target')}
        <input value={target} onChange={(e) => setTarget(e.target.value)} required style={styles.input} placeholder="amigo@example.com / user_…" />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <label style={styles.label}>
          {t('admin.gift.duration')}
          <select value={duration} onChange={(e) => setDuration(e.target.value as (typeof DURATIONS)[number])} style={styles.input}>
            {DURATIONS.map((d) => <option key={d} value={d}>{t(`admin.gift.durationOption.${d}`)}</option>)}
          </select>
        </label>
        <label style={styles.label}>
          {t('admin.gift.reason')}
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.input}>
            {REASONS.map((r) => <option key={r} value={r}>{t(`admin.gift.reasonOption.${r}`)}</option>)}
          </select>
        </label>
      </div>
      <label style={styles.label}>
        {t('admin.gift.note')}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} style={styles.input} />
      </label>
      <button type="submit" style={styles.button}>{t('admin.gift.submit')}</button>
      {result && <p role={result.ok ? 'status' : 'alert'} style={{ margin: 0 }}>{result.text}</p>}
    </form>
  );
}

function ProUsersTable({ users }: { users: ProUser[] }) {
  const { t, i18n } = useTranslation();
  if (!users.length) return <p>{t('admin.pro.empty')}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption style={{ textAlign: 'left', fontWeight: 600 }}>{t('admin.pro.caption', { count: users.length })}</caption>
        <thead><tr><th scope="col">{t('admin.pro.user')}</th><th scope="col">{t('admin.pro.source')}</th><th scope="col">{t('admin.pro.until')}</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId}>
              <td>{u.email ?? u.userId}</td>
              <td>{t(`admin.pro.sourceName.${u.source}`)}</td>
              <td>{u.renews ? t('admin.pro.renews') : fmtDate(u.expiresAt, i18n.language, t('admin.pro.indefinite'))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GiftLedger({ gifts, onRevoke }: { gifts: Gift[]; onRevoke: (gift: Gift) => void }) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  if (!gifts.length) return <p>{t('admin.gifts.empty')}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {gifts.map((g) => (
        <li key={g.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ flex: '1 1 260px' }}>
            <strong>{g.email ?? g.userId}</strong> · {t(`admin.gift.reasonOption.${g.reason}`)} · {t(`admin.gifts.state.${g.state}`)}
            <span style={{ display: 'block', fontSize: '0.8125rem' }}>
              {fmtDate(g.startsAt, i18n.language, '')} → {fmtDate(g.endsAt, i18n.language, t('admin.pro.indefinite'))}
              {g.note ? ` · ${g.note}` : ''}
            </span>
          </span>
          {(g.state === 'active' || g.state === 'scheduled') && (
            <button type="button" style={styles.quiet} onClick={() => onRevoke(g)}>{t('admin.gifts.revoke')}</button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ProAccessTab() {
  const { t } = useTranslation();
  const styles = useStyles();
  const [data, setData] = useState<{ users: ProUser[]; gifts: Gift[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    adminApi.proAccess().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const revoke = async (gift: Gift) => {
    if (!window.confirm(t('admin.gifts.confirmRevoke', { who: gift.email ?? gift.userId }))) return;
    await adminApi.revokeGift(gift.id).catch((e: Error) => setError(e.message));
    load();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.card} aria-labelledby="admin-gift-form"><h2 id="admin-gift-form" style={{ marginTop: 0 }}>{t('admin.gift.heading')}</h2><GiftForm onGranted={load} /></section>
      {error && <p role="alert">{error}</p>}
      <section style={styles.card} aria-labelledby="admin-pro"><h2 id="admin-pro" style={{ marginTop: 0 }}>{t('admin.pro.heading')}</h2>{data ? <ProUsersTable users={data.users} /> : <p>{t('admin.loading')}</p>}</section>
      <section style={styles.card} aria-labelledby="admin-gifts"><h2 id="admin-gifts" style={{ marginTop: 0 }}>{t('admin.gifts.heading')}</h2>{data && <GiftLedger gifts={data.gifts} onRevoke={revoke} />}</section>
    </div>
  );
}

function ReportRow({ report, onSaved }: { report: FeedbackReport; onSaved: (r: FeedbackReport) => void }) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState(report.adminNote ?? '');
  const save = async () => onSaved(await adminApi.triage(report.id, { status, adminNote: note }));
  return (
    <details style={{ ...styles.card, padding: 12 }}>
      <summary style={{ cursor: 'pointer', minHeight: 44 }}>
        <strong>[{t(`feedback.kind.${report.kind}`)}{report.severity ? ` · ${t(`feedback.severityOption.${report.severity}`)}` : ''}]</strong> {report.title}
        {' '}· {t(`feedback.status.${report.status}`)} · {new Date(report.createdAt).toLocaleString(i18n.language)}
      </summary>
      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, max-content) 1fr', gap: '4px 12px', whiteSpace: 'pre-wrap' }}>
        {(['description', 'stepsToReproduce', 'expected', 'actual', 'route', 'userId'] as const).map((field) => (
          report[field] ? <React.Fragment key={field}><dt>{t(`admin.report.${field}`)}</dt><dd style={{ margin: 0 }}>{String(report[field])}</dd></React.Fragment> : null
        ))}
      </dl>
      {report.context && <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{JSON.stringify(report.context, null, 2)}</pre>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
        <label style={styles.label}>{t('admin.report.status')}
          <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)} style={styles.input}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`feedback.status.${s}`)}</option>)}
          </select>
        </label>
        <label style={{ ...styles.label, flex: '1 1 220px' }}>{t('admin.report.note')}
          <input value={note} onChange={(e) => setNote(e.target.value)} style={styles.input} />
        </label>
        <button type="button" style={styles.button} onClick={save}>{t('admin.report.save')}</button>
      </div>
    </details>
  );
}

function QaInboxTab() {
  const { t } = useTranslation();
  const styles = useStyles();
  const [filters, setFilters] = useState({ status: 'new', kind: '' });
  const [reports, setReports] = useState<FeedbackReport[] | null>(null);
  useEffect(() => {
    setReports(null);
    adminApi.feedback(filters).then((r) => setReports(r.reports)).catch(() => setReports([]));
  }, [filters]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(reports ?? [], null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gylio-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const replace = (next: FeedbackReport) => setReports((all) => (all ?? []).map((r) => (r.id === next.id ? next : r)));

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
        <label style={styles.label}>{t('admin.report.status')}
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={styles.input}>
            <option value="">{t('admin.filter.all')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`feedback.status.${s}`)}</option>)}
          </select>
        </label>
        <label style={styles.label}>{t('admin.filter.kind')}
          <select value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))} style={styles.input}>
            <option value="">{t('admin.filter.all')}</option>
            {['bug', 'idea', 'question', 'praise'].map((k) => <option key={k} value={k}>{t(`feedback.kind.${k}`)}</option>)}
          </select>
        </label>
        <button type="button" style={styles.quiet} onClick={exportJson} disabled={!reports?.length}>{t('admin.filter.export')}</button>
      </div>
      {reports === null ? <p>{t('admin.loading')}</p> : null}
      {reports?.length === 0 ? <p>{t('admin.report.empty')}</p> : null}
      {reports?.map((r) => <ReportRow key={r.id} report={r} onSaved={replace} />)}
    </div>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useStyles();
  const { entitlement, loading } = useEntitlement();
  const [tab, setTab] = useState<'pro' | 'qa'>('pro');
  if (!entitlement?.isAdmin) {
    return <p role="status">{loading ? t('admin.loading') : t('admin.notAllowed')}</p>;
  }
  const tabButton = (key: 'pro' | 'qa') => (
    <button type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      style={tab === key ? styles.button : styles.quiet}>{t(`admin.tab.${key}`)}</button>
  );
  return (
    <main aria-labelledby="admin-heading" style={{ display: 'grid', gap: theme.spacing.lg, maxWidth: 900, margin: '0 auto' }}>
      <h1 id="admin-heading" style={{ margin: 0 }}>{t('admin.heading')}</h1>
      <div role="tablist" aria-label={t('admin.heading')} style={{ display: 'flex', gap: 8 }}>{tabButton('pro')}{tabButton('qa')}</div>
      <div role="tabpanel">{tab === 'pro' ? <ProAccessTab /> : <QaInboxTab />}</div>
    </main>
  );
}

export default AdminPage;
