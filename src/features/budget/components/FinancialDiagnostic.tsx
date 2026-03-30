/**
 * FinancialDiagnostic — Caleb Hammer-style 2-step financial health check.
 *
 * All user-facing strings go through react-i18next.
 * Alert messages use structured keys + interpolation params so translators
 * receive complete grammatical sentences (not fragments).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import { formatAmount } from '../../../core/utils/format';

// ── Types ──────────────────────────────────────────────────────────────────────

type DiagnosticInput = {
  takeHome: string;
  rent: string;
  utilities: string;
  subscriptions: string;
  carPayment: string;
  insurance: string;
  groceries: string;
  diningOut: string;
  entertainment: string;
  clothing: string;
  personalCare: string;
  transport: string;
  otherFixed: string;
  otherVariable: string;
};

// Structured alert: i18n key + interpolation params (no pre-built strings)
type DiagnosticAlert = {
  severity: 'critical' | 'warning' | 'good';
  key: string;
  params: Record<string, string | number>;
};

type DiagnosticResult = {
  takeHome: number;
  totalFixed: number;
  totalVariable: number;
  totalExpenses: number;
  remainder: number;
  housingRatio: number;
  fixedRatio: number;
  variableRatio: number;
  savingsRate: number;
  score: number;
  alerts: DiagnosticAlert[];
};

export type BudgetPrefillItem = {
  name: string;
  type: 'NEED' | 'WANT' | 'GOAL';
  amount: number;
};

type Props = {
  theme: ThemeTokens;
  onApply: (items: BudgetPrefillItem[], monthlyIncome: number) => void;
};

// ── Diagnostic logic ───────────────────────────────────────────────────────────

function runDiagnostic(input: DiagnosticInput): DiagnosticResult {
  const takeHome      = parseFloat(input.takeHome)      || 0;
  const rent          = parseFloat(input.rent)          || 0;
  const utilities     = parseFloat(input.utilities)     || 0;
  const subscriptions = parseFloat(input.subscriptions) || 0;
  const carPayment    = parseFloat(input.carPayment)    || 0;
  const insurance     = parseFloat(input.insurance)     || 0;
  const otherFixed    = parseFloat(input.otherFixed)    || 0;
  const groceries     = parseFloat(input.groceries)     || 0;
  const diningOut     = parseFloat(input.diningOut)     || 0;
  const entertainment = parseFloat(input.entertainment) || 0;
  const clothing      = parseFloat(input.clothing)      || 0;
  const personalCare  = parseFloat(input.personalCare)  || 0;
  const transport     = parseFloat(input.transport)     || 0;
  const otherVariable = parseFloat(input.otherVariable) || 0;

  const totalFixed    = rent + utilities + subscriptions + carPayment + insurance + otherFixed;
  const totalVariable = groceries + diningOut + entertainment + clothing + personalCare + transport + otherVariable;
  const totalExpenses = totalFixed + totalVariable;
  const remainder     = takeHome - totalExpenses;

  const housingRatio  = takeHome > 0 ? rent          / takeHome : 0;
  const fixedRatio    = takeHome > 0 ? totalFixed    / takeHome : 0;
  const variableRatio = takeHome > 0 ? totalVariable / takeHome : 0;
  const savingsRate   = takeHome > 0 ? remainder     / takeHome : 0;

  let score = 100;
  const alerts: DiagnosticAlert[] = [];

  // Use i18n keys + params — the component renders the message via t(key, params)
  if (housingRatio > 0.5) {
    score -= 25;
    alerts.push({ severity: 'critical', key: 'budget.diagnostic.alertHousingCritical', params: { pct: Math.round(housingRatio * 100) } });
  } else if (housingRatio > 0.35) {
    score -= 15;
    alerts.push({ severity: 'warning', key: 'budget.diagnostic.alertHousingWarning', params: { pct: Math.round(housingRatio * 100) } });
  } else if (housingRatio > 0 && housingRatio <= 0.3) {
    alerts.push({ severity: 'good', key: 'budget.diagnostic.alertHousingGood', params: { pct: Math.round(housingRatio * 100) } });
  }

  if (savingsRate < 0) {
    score -= 30;
    alerts.push({ severity: 'critical', key: 'budget.diagnostic.alertDeficit', params: { amount: formatAmount(Math.abs(remainder)), symbol: '{{currencySymbol}}' } });
  } else if (savingsRate < 0.1) {
    score -= 20;
    alerts.push({ severity: 'warning', key: 'budget.diagnostic.alertSavingsLow', params: { pct: Math.round(savingsRate * 100) } });
  } else if (savingsRate >= 0.2) {
    alerts.push({ severity: 'good', key: 'budget.diagnostic.alertSavingsGood', params: { pct: Math.round(savingsRate * 100) } });
  }

  if (diningOut > 0 && takeHome > 0 && diningOut / takeHome > 0.1) {
    score -= 10;
    alerts.push({ severity: 'warning', key: 'budget.diagnostic.alertDiningOut', params: { pct: Math.round((diningOut / takeHome) * 100) } });
  }

  if (subscriptions > 0 && takeHome > 0 && subscriptions / takeHome > 0.05) {
    score -= 5;
    alerts.push({ severity: 'warning', key: 'budget.diagnostic.alertSubscriptions', params: { amount: formatAmount(subscriptions), symbol: '{{currencySymbol}}' } });
  }

  if (fixedRatio > 0.6) {
    score -= 10;
    alerts.push({ severity: 'critical', key: 'budget.diagnostic.alertFixedHigh', params: { pct: Math.round(fixedRatio * 100) } });
  }

  return {
    takeHome, totalFixed, totalVariable, totalExpenses, remainder,
    housingRatio, fixedRatio, variableRatio, savingsRate,
    score: Math.max(0, score),
    alerts,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPTY_INPUT: DiagnosticInput = {
  takeHome: '', rent: '', utilities: '', subscriptions: '', carPayment: '',
  insurance: '', groceries: '', diningOut: '', entertainment: '', clothing: '',
  personalCare: '', transport: '', otherFixed: '', otherVariable: '',
};

function scoreColor(score: number): string {
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function severityColor(severity: DiagnosticAlert['severity']): { bg: string; border: string; text: string } {
  if (severity === 'critical') return { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C' };
  if (severity === 'warning')  return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' };
  return { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' };
}

function severityIcon(severity: DiagnosticAlert['severity']): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning')  return '⚠️';
  return '✅';
}

// ── MoneyField sub-component ───────────────────────────────────────────────────

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ThemeTokens;
  currencySymbol: string;
};

function MoneyField({ label, value, onChange, theme, currencySymbol }: FieldProps) {
  const { colors, shape, spacing } = theme;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <label style={{ fontSize: 13, color: colors.muted, fontFamily: theme.typography.body.family }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.muted,
            fontSize: 14,
            pointerEvents: 'none',
          }}
        >
          {currencySymbol}
        </span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: 28,
            paddingRight: 10,
            paddingTop: 8,
            paddingBottom: 8,
            border: `1px solid ${colors.border}`,
            borderRadius: shape.radiusSm,
            background: colors.surface,
            color: colors.text,
            fontSize: 14,
            fontFamily: theme.typography.body.family,
            boxSizing: 'border-box',
            outline: 'none',
          }}
          placeholder="0"
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FinancialDiagnostic({ theme, onApply }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, shape, shadow } = theme;
  const [step, setStep]     = useState<'form' | 'results'>('form');
  const [input, setInput]   = useState<DiagnosticInput>(EMPTY_INPUT);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const currencySymbol = t('budget.currencySymbol', '$');

  const set = (field: keyof DiagnosticInput) => (value: string) =>
    setInput((prev) => ({ ...prev, [field]: value }));

  function handleRun() {
    setResult(runDiagnostic(input));
    setStep('results');
  }

  function handleApply() {
    if (!result) return;
    const rawItems: BudgetPrefillItem[] = [
      { name: t('budget.diagnostic.prefillRent'),           type: 'NEED', amount: parseFloat(input.rent)          || 0 },
      { name: t('budget.diagnostic.prefillUtilities'),      type: 'NEED', amount: parseFloat(input.utilities)     || 0 },
      { name: t('budget.diagnostic.prefillGroceries'),      type: 'NEED', amount: parseFloat(input.groceries)     || 0 },
      { name: t('budget.diagnostic.prefillInsurance'),      type: 'NEED', amount: parseFloat(input.insurance)     || 0 },
      { name: t('budget.diagnostic.prefillTransport'),      type: 'NEED', amount: parseFloat(input.transport)     || 0 },
      { name: t('budget.diagnostic.prefillSubscriptions'),  type: 'NEED', amount: parseFloat(input.subscriptions) || 0 },
      { name: t('budget.diagnostic.prefillCarPayment'),     type: 'NEED', amount: parseFloat(input.carPayment)    || 0 },
      { name: t('budget.diagnostic.prefillDiningOut'),      type: 'WANT', amount: parseFloat(input.diningOut)     || 0 },
      { name: t('budget.diagnostic.prefillEntertainment'),  type: 'WANT', amount: parseFloat(input.entertainment) || 0 },
      { name: t('budget.diagnostic.prefillClothing'),       type: 'WANT', amount: parseFloat(input.clothing)      || 0 },
      { name: t('budget.diagnostic.prefillPersonalCare'),   type: 'WANT', amount: parseFloat(input.personalCare)  || 0 },
      { name: t('budget.diagnostic.prefillSavings'),        type: 'GOAL', amount: Math.max(0, result.remainder) },
    ];
    onApply(rawItems.filter((item) => item.amount > 0), result.takeHome);
  }

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    borderRadius: shape.radiusLg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.md,
    padding: spacing.lg,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.sm,
    fontFamily: theme.typography.body.family,
  };

  const fieldProps = { theme, currencySymbol };

  // ── Step 1: Form ─────────────────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text, fontFamily: theme.typography.heading.family }}>
            {t('budget.diagnostic.title')}
          </h2>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: 14, color: colors.muted, fontFamily: theme.typography.body.family }}>
            {t('budget.diagnostic.subtitle')}
          </p>
        </div>

        <div style={cardStyle}>
          <div style={sectionHeadingStyle}>{t('budget.diagnostic.incomeSection')}</div>
          <MoneyField label={t('budget.diagnostic.takeHomeLabel')} value={input.takeHome} onChange={set('takeHome')} {...fieldProps} />
        </div>

        <div style={cardStyle}>
          <div style={sectionHeadingStyle}>{t('budget.diagnostic.fixedSection')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing.md }}>
            <MoneyField label={t('budget.diagnostic.rentLabel')}          value={input.rent}          onChange={set('rent')}          {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.utilitiesLabel')}     value={input.utilities}     onChange={set('utilities')}     {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.subscriptionsLabel')} value={input.subscriptions} onChange={set('subscriptions')} {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.carPaymentLabel')}    value={input.carPayment}    onChange={set('carPayment')}    {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.insuranceLabel')}     value={input.insurance}     onChange={set('insurance')}     {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.otherFixedLabel')}    value={input.otherFixed}    onChange={set('otherFixed')}    {...fieldProps} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionHeadingStyle}>{t('budget.diagnostic.variableSection')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing.md }}>
            <MoneyField label={t('budget.diagnostic.groceriesLabel')}     value={input.groceries}     onChange={set('groceries')}     {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.diningOutLabel')}     value={input.diningOut}     onChange={set('diningOut')}     {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.entertainmentLabel')} value={input.entertainment} onChange={set('entertainment')} {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.clothingLabel')}      value={input.clothing}      onChange={set('clothing')}      {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.personalCareLabel')}  value={input.personalCare}  onChange={set('personalCare')}  {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.transportLabel')}     value={input.transport}     onChange={set('transport')}     {...fieldProps} />
            <MoneyField label={t('budget.diagnostic.otherVariableLabel')} value={input.otherVariable} onChange={set('otherVariable')} {...fieldProps} />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={!input.takeHome}
          style={{
            alignSelf: 'flex-end',
            padding: `${spacing.sm}px ${spacing.lg}px`,
            background: input.takeHome ? colors.primary : colors.border,
            color: input.takeHome ? '#fff' : colors.muted,
            border: 'none',
            borderRadius: shape.radiusMd,
            fontSize: 15,
            fontWeight: 600,
            cursor: input.takeHome ? 'pointer' : 'not-allowed',
            fontFamily: theme.typography.body.family,
            transition: 'background 0.15s',
          }}
          aria-disabled={!input.takeHome}
        >
          {t('budget.diagnostic.runCta')}
        </button>
      </div>
    );
  }

  // ── Step 2: Results ──────────────────────────────────────────────────────────

  if (!result) return null;

  const color     = scoreColor(result.score);
  const totalSafe = result.takeHome || 1;
  const fixedPct    = Math.min(100, (result.totalFixed    / totalSafe) * 100);
  const variablePct = Math.min(100, (result.totalVariable / totalSafe) * 100);
  const savingsPct  = Math.max(0,   (result.remainder     / totalSafe) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <button
          onClick={() => setStep('form')}
          style={{
            background: 'none',
            border: `1px solid ${colors.border}`,
            borderRadius: shape.radiusSm,
            padding: `${spacing.xs}px ${spacing.sm}px`,
            cursor: 'pointer',
            color: colors.muted,
            fontSize: 13,
            fontFamily: theme.typography.body.family,
          }}
          aria-label={t('budget.diagnostic.backAria')}
        >
          {t('budget.diagnostic.backCta')}
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text, fontFamily: theme.typography.heading.family }}>
          {t('budget.diagnostic.resultsTitle')}
        </h2>
      </div>

      {/* Score card */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: spacing.xl, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 100, height: 100,
            borderRadius: '50%',
            border: `6px solid ${color}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          role="img"
          aria-label={t('budget.diagnostic.scoreAria', { score: result.score })}
        >
          <span style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, fontFamily: theme.typography.heading.family }}>
            {result.score}
          </span>
          <span style={{ fontSize: 11, color: colors.muted, fontFamily: theme.typography.body.family }}>/ 100</span>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: spacing.xs, fontFamily: theme.typography.body.family }}>
            {t('budget.diagnostic.monthlyOverview')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${spacing.xs}px ${spacing.md}px` }}>
            {[
              { label: t('budget.diagnostic.takeHomeRow'),  value: `${currencySymbol}${formatAmount(result.takeHome)}`,      emphasis: false },
              { label: t('budget.diagnostic.fixedRow'),     value: `${currencySymbol}${formatAmount(result.totalFixed)}`,    emphasis: false },
              { label: t('budget.diagnostic.variableRow'),  value: `${currencySymbol}${formatAmount(result.totalVariable)}`, emphasis: false },
              {
                label: result.remainder >= 0 ? t('budget.diagnostic.remainingRow') : t('budget.diagnostic.deficitRow'),
                value: `${currencySymbol}${formatAmount(Math.abs(result.remainder))}`,
                emphasis: true,
                color: result.remainder >= 0 ? '#22C55E' : '#EF4444',
              },
            ].map((row) => (
              <React.Fragment key={row.label}>
                <span style={{ fontSize: 13, color: colors.muted, fontFamily: theme.typography.body.family }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: row.emphasis ? 700 : 500, color: row.emphasis ? (row.color ?? colors.text) : colors.text, fontFamily: theme.typography.body.family }}>
                  {row.value}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown bar */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>{t('budget.diagnostic.incomeBreakdown')}</div>
        <div
          style={{ height: 24, borderRadius: shape.radiusFull, overflow: 'hidden', display: 'flex', background: colors.surfaceElevated, border: `1px solid ${colors.border}` }}
          role="img"
          aria-label={t('budget.diagnostic.breakdownAria', { fixed: Math.round(fixedPct), variable: Math.round(variablePct), savings: Math.round(savingsPct) })}
        >
          <div style={{ width: `${fixedPct}%`,    background: '#5B5CF6', transition: 'width 0.4s' }} title={t('budget.diagnostic.fixedLegend',    { pct: Math.round(fixedPct) })} />
          <div style={{ width: `${variablePct}%`, background: '#F59E0B', transition: 'width 0.4s' }} title={t('budget.diagnostic.variableLegend', { pct: Math.round(variablePct) })} />
          <div style={{ width: `${savingsPct}%`,  background: '#22C55E', transition: 'width 0.4s' }} title={t('budget.diagnostic.savingsLegend',  { pct: Math.round(savingsPct) })} />
        </div>
        <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {[
            { color: '#5B5CF6', label: t('budget.diagnostic.fixedLegend',    { pct: Math.round(fixedPct) }) },
            { color: '#F59E0B', label: t('budget.diagnostic.variableLegend', { pct: Math.round(variablePct) }) },
            { color: '#22C55E', label: t('budget.diagnostic.savingsLegend',  { pct: Math.round(savingsPct) }) },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: colors.muted, fontFamily: theme.typography.body.family }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert cards */}
      {result.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <div style={sectionHeadingStyle}>{t('budget.diagnostic.callouts')}</div>
          {result.alerts.map((alert, i) => {
            const sc = severityColor(alert.severity);
            // Resolve symbol interpolation for currency alerts
            const params = { ...alert.params, symbol: currencySymbol };
            return (
              <div
                key={i}
                role="alert"
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: shape.radiusMd,
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  display: 'flex',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }} aria-hidden>
                  {severityIcon(alert.severity)}
                </span>
                <span style={{ fontSize: 14, color: sc.text, fontFamily: theme.typography.body.family, lineHeight: 1.5 }}>
                  {t(alert.key, params)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply to budget */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, fontFamily: theme.typography.heading.family }}>
            {t('budget.diagnostic.prefillTitle')}
          </div>
          <div style={{ fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: theme.typography.body.family }}>
            {t('budget.diagnostic.prefillSubtitle')}
          </div>
        </div>
        <button
          onClick={handleApply}
          style={{
            padding: `${spacing.sm}px ${spacing.lg}px`,
            background: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: shape.radiusMd,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
            whiteSpace: 'nowrap',
          }}
        >
          {t('budget.diagnostic.applyCta')}
        </button>
      </div>
    </div>
  );
}
