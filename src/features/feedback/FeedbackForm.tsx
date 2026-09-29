/**
 * FeedbackForm — report a bug, suggest an idea, ask a question or say what works.
 *
 * Bug reports ask for the three things triage needs (steps, expected, actual)
 * but only the title and description are required, so a quick note is never
 * blocked. Technical details are opt-out and previewed before sending.
 */
import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { track } from '../../core/analytics';
import { feedbackApi, type FeedbackKind, type FeedbackReport, type Severity } from '../billing/billingApi';
import { collectDiagnostics } from './diagnostics';

const KINDS: FeedbackKind[] = ['bug', 'idea', 'question', 'praise'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'blocker'];

type Draft = { kind: FeedbackKind; title: string; description: string; steps: string; expected: string; actual: string; severity: Severity };
const EMPTY: Draft = { kind: 'bug', title: '', description: '', steps: '', expected: '', actual: '', severity: 'medium' };

function useFieldStyles() {
  const { theme } = useTheme();
  return {
    label: { display: 'grid', gap: 4, fontWeight: 600 } as React.CSSProperties,
    input: {
      minHeight: 44, padding: theme.spacing.sm, borderRadius: theme.shape.radiusMd, font: 'inherit',
      border: `1px solid ${theme.colors.borderStrong}`, background: theme.colors.background, color: theme.colors.text,
    } as React.CSSProperties,
  };
}

function TextField({ label, value, onChange, multiline = false, required = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; required?: boolean; hint?: string;
}) {
  const styles = useFieldStyles();
  const { theme } = useTheme();
  const hintId = useId();
  const common = {
    value, required, 'aria-describedby': hint ? hintId : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  return (
    <label style={styles.label}>
      {label}
      {multiline ? <textarea rows={3} {...common} style={{ ...styles.input, resize: 'vertical' }} /> : <input {...common} style={styles.input} />}
      {hint && <span id={hintId} style={{ fontWeight: 400, fontSize: '0.8125rem', color: theme.colors.muted }}>{hint}</span>}
    </label>
  );
}

function KindPicker({ value, onChange }: { value: FeedbackKind; onChange: (k: FeedbackKind) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>{t('feedback.kindLegend')}</legend>
      {KINDS.map((kind) => (
        <label key={kind} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: `0 ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusFull, cursor: 'pointer',
          border: `1.5px solid ${value === kind ? theme.colors.primary : theme.colors.border}`,
          fontWeight: value === kind ? 700 : 500,
        }}>
          <input type="radio" name="feedback-kind" checked={value === kind} onChange={() => onChange(kind)} />
          {t(`feedback.kind.${kind}`)}
        </label>
      ))}
    </fieldset>
  );
}

function BugFields({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  const { t } = useTranslation();
  const styles = useFieldStyles();
  return (
    <>
      <TextField label={t('feedback.steps')} value={draft.steps} onChange={(v) => set({ steps: v })} multiline hint={t('feedback.stepsHint')} />
      <TextField label={t('feedback.expected')} value={draft.expected} onChange={(v) => set({ expected: v })} multiline />
      <TextField label={t('feedback.actual')} value={draft.actual} onChange={(v) => set({ actual: v })} multiline />
      <label style={styles.label}>
        {t('feedback.severity')}
        <select value={draft.severity} onChange={(e) => set({ severity: e.target.value as Severity })} style={styles.input}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{t(`feedback.severityOption.${s}`)}</option>)}
        </select>
      </label>
    </>
  );
}

function DiagnosticsToggle({ include, onChange, preview }: { include: boolean; onChange: (v: boolean) => void; preview: object }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <input type="checkbox" checked={include} onChange={(e) => onChange(e.target.checked)} />
        {t('feedback.includeDiagnostics')}
      </label>
      <details>
        <summary style={{ cursor: 'pointer', color: theme.colors.primary, minHeight: 44, lineHeight: '44px' }}>{t('feedback.whatIsIncluded')}</summary>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', background: theme.colors.background, padding: theme.spacing.sm, borderRadius: theme.shape.radiusMd }}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function buildPayload(draft: Draft, route: string, diagnostics: Record<string, unknown> | undefined) {
  const isBug = draft.kind === 'bug';
  return {
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    severity: isBug ? draft.severity : null,
    stepsToReproduce: isBug ? draft.steps : undefined,
    expected: isBug ? draft.expected : undefined,
    actual: isBug ? draft.actual : undefined,
    route,
    context: diagnostics,
  };
}

export function FeedbackForm({ onSubmitted, initialKind = 'bug' }: { onSubmitted: (report: FeedbackReport) => void; initialKind?: FeedbackKind }) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const location = useLocation();
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, kind: initialKind });
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const diagnostics: Record<string, unknown> = collectDiagnostics(mode, i18n.language);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ busy: true, error: null });
    try {
      const report = await feedbackApi.submit(buildPayload(draft, location.pathname, includeDiagnostics ? diagnostics : undefined));
      track('feedback_submitted', { kind: draft.kind });
      setDraft({ ...EMPTY, kind: draft.kind });
      setState({ busy: false, error: null });
      onSubmitted(report);
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : t('feedback.error') });
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: theme.spacing.md }}>
      <KindPicker value={draft.kind} onChange={(kind) => set({ kind })} />
      <TextField label={t('feedback.title')} value={draft.title} onChange={(v) => set({ title: v })} required hint={t('feedback.titleHint')} />
      <TextField label={t(`feedback.descriptionLabel.${draft.kind}`)} value={draft.description} onChange={(v) => set({ description: v })} multiline required hint={t('feedback.privacyHint')} />
      {draft.kind === 'bug' && <BugFields draft={draft} set={set} />}
      <DiagnosticsToggle include={includeDiagnostics} onChange={setIncludeDiagnostics} preview={diagnostics} />
      {state.error && <p role="alert" style={{ margin: 0, color: theme.colors.errorStrong }}>{state.error}</p>}
      <button type="submit" disabled={state.busy} aria-busy={state.busy} style={{
        minHeight: 48, borderRadius: theme.shape.radiusFull, border: 'none', fontWeight: 700,
        background: theme.colors.primary, color: theme.colors.primaryForeground, cursor: 'pointer',
      }}>
        {state.busy ? t('feedback.sending') : t('feedback.send')}
      </button>
    </form>
  );
}

export default FeedbackForm;
