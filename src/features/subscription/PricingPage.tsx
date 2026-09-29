/**
 * PricingPage
 *
 * One page for every Pro path: the 7-day no-card trial, a Paddle subscription
 * (cards/PayPal/Apple Pay/Google Pay in USD or soles), a Mercado Pago prepaid
 * pass (cards and Yape in soles, never auto-renews), and managing an existing
 * subscription. Renders without Clerk or the API (public static preview), in
 * which case checkout buttons explain why they are unavailable.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { useAppAuth } from '../../core/context/AuthContext';
import { track } from '../../core/analytics';
import { useEntitlement } from '../billing/EntitlementContext';
import {
  FALLBACK_CATALOG,
  billingApi,
  type Catalog,
  type CatalogPass,
  type CatalogPlan,
  type Currency,
  type Entitlement,
} from '../billing/billingApi';
import { currencyForLocale, daysUntil, formatMoney, yearlySavingsPercent } from '../billing/formatMoney';
import { openPaddleCheckout, paddleConfigured } from '../billing/paddle';
import { useExperiment } from '../experiments/useExperiment';

type Interval = 'monthly' | 'yearly';
type Busy = null | 'trial' | 'checkout' | 'pass' | 'portal';

function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(FALLBACK_CATALOG);
  useEffect(() => {
    let cancelled = false;
    billingApi.plans().then((next) => { if (!cancelled) setCatalog(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return catalog;
}

const planFor = (catalog: Catalog, interval: Interval) =>
  catalog.plans.find((p) => p.interval === (interval === 'yearly' ? 'year' : 'month')) as CatalogPlan;

function useCheckoutActions() {
  const { t, i18n } = useTranslation();
  const { setEntitlement, refresh } = useEntitlement();
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const run = useCallback(async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : t('billing.error.generic') });
    } finally {
      setBusy(null);
    }
  }, [t]);

  const startTrial = () => run('trial', async () => {
    const next = await billingApi.startTrial();
    setEntitlement(next);
    track('trial_started', { source: 'pricing' });
    setMessage({ tone: 'ok', text: t('billing.trial.started', { date: new Date(next.expiresAt ?? '').toLocaleDateString(i18n.language) }) });
  });

  const subscribe = (plan: CatalogPlan) => run('checkout', async () => {
    if (!paddleConfigured()) throw new Error(t('billing.error.checkoutNotConfigured'));
    const { transactionId } = await billingApi.checkout(plan.id);
    track('checkout_opened', { plan: plan.id, provider: 'paddle' });
    await openPaddleCheckout(transactionId, i18n.language, () => {
      track('checkout_completed', { plan: plan.id });
      setMessage({ tone: 'ok', text: t('billing.checkout.completed') });
      // The webhook usually lands within seconds; poll briefly for it.
      [2000, 6000, 15000].forEach((ms) => setTimeout(() => void refresh(), ms));
    });
  });

  const buyPass = (pass: CatalogPass) => run('pass', async () => {
    const { url } = await billingApi.passCheckout(pass.id, window.location.href);
    track('checkout_opened', { plan: pass.id, provider: 'mercadopago' });
    window.location.assign(url);
  });

  const manage = () => run('portal', async () => {
    const { url } = await billingApi.portal();
    window.location.assign(url);
  });

  return { busy, message, startTrial, subscribe, buyPass, manage };
}

export const PricingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const catalog = useCatalog();
  const defaultInterval = useExperiment('paywall_default_interval');
  const [interval, setInterval] = useState<Interval>(defaultInterval);
  const currency = currencyForLocale(i18n.language);
  const { entitlement } = useEntitlement();
  const actions = useCheckoutActions();

  useEffect(() => { track('paywall_viewed', { interval: defaultInterval, currency }); }, [defaultInterval, currency]);

  const monthly = planFor(catalog, 'monthly');
  const yearly = planFor(catalog, 'yearly');
  const savings = yearlySavingsPercent(monthly.prices[currency], yearly.prices[currency]);

  return (
    <main
      aria-labelledby="pricing-heading"
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: `${theme.spacing.xl}px ${theme.spacing.md}px`,
        color: theme.colors.text,
        fontFamily: theme.typography.body.family,
        overflowWrap: 'anywhere',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
        <h1 id="pricing-heading" style={{ margin: 0, fontFamily: theme.typography.heading.family, fontSize: '1.75rem' }}>
          {t('billing.heading')}
        </h1>
        <p style={{ color: theme.colors.muted, margin: `${theme.spacing.sm}px 0 0` }}>{t('billing.subheading')}</p>
      </header>

      <EntitlementStatus entitlement={entitlement} />

      <IntervalToggle value={interval} onChange={setInterval} savings={savings} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.lg, justifyContent: 'center' }}>
        <FreeCard />
        <ProCard
          plan={interval === 'yearly' ? yearly : monthly}
          monthly={monthly}
          currency={currency}
          trialDays={catalog.trialDays}
          entitlement={entitlement}
          actions={actions}
        />
      </div>

      <PassOptions passes={catalog.passes} currency={currency} actions={actions} />
      <ActionMessage message={actions.message} />

      <p style={{ textAlign: 'center', color: theme.colors.muted, fontSize: '0.875rem', marginTop: theme.spacing.xl }}>
        {t('billing.fineprint')}
      </p>
    </main>
  );
};

function EntitlementStatus({ entitlement }: { entitlement: Entitlement | null }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  if (!entitlement || entitlement.plan !== 'pro') return null;
  const days = daysUntil(entitlement.expiresAt, Date.now());
  const until = entitlement.expiresAt ? new Date(entitlement.expiresAt).toLocaleDateString(i18n.language) : null;
  const key = `billing.status.${entitlement.source ?? 'subscription'}${until ? '' : 'Indefinite'}`;
  return (
    <p
      role="status"
      style={{
        textAlign: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.shape.radiusLg,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        marginBottom: theme.spacing.lg,
      }}
    >
      {t(key, { date: until, days, renews: entitlement.renews })}
    </p>
  );
}

function IntervalToggle({ value, onChange, savings }: { value: Interval; onChange: (v: Interval) => void; savings: number }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const option = (interval: Interval, label: string) => (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        minHeight: 44,
        padding: `0 ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusFull,
        cursor: 'pointer',
        background: value === interval ? theme.colors.primary : 'transparent',
        color: value === interval ? theme.colors.primaryForeground : theme.colors.text,
        fontWeight: 600,
      }}
    >
      <input
        type="radio"
        name="billing-interval"
        value={interval}
        checked={value === interval}
        onChange={() => onChange(interval)}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {label}
    </label>
  );
  return (
    <fieldset
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        border: 'none',
        margin: `0 0 ${theme.spacing.lg}px`,
        padding: 0,
      }}
    >
      <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {t('billing.interval.legend')}
      </legend>
      {option('monthly', t('billing.interval.monthly'))}
      {option('yearly', savings > 0 ? t('billing.interval.yearlySave', { percent: savings }) : t('billing.interval.yearly'))}
    </fieldset>
  );
}

function useCardStyle(highlight: boolean): React.CSSProperties {
  const { theme } = useTheme();
  return {
    flex: '1 1 280px',
    maxWidth: 380,
    minWidth: 0,
    boxSizing: 'border-box',
    padding: theme.spacing.xl,
    borderRadius: theme.shape.radiusLg,
    background: theme.colors.surface,
    border: `${highlight ? 2 : 1}px solid ${highlight ? theme.colors.primary : theme.colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  };
}

function FeatureList({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: theme.spacing.xs }}>
      {keys.map((key) => (
        <li key={key} style={{ display: 'flex', gap: theme.spacing.xs }}>
          <span aria-hidden="true" style={{ color: theme.colors.successStrong, fontWeight: 700 }}>✓</span>
          {t(key)}
        </li>
      ))}
    </ul>
  );
}

const FREE_FEATURE_KEYS = ['billing.free.tasks', 'billing.free.calendar', 'billing.free.budget', 'billing.free.rewards', 'billing.free.ads'];
const PRO_FEATURE_KEYS = ['billing.pro.everything', 'billing.pro.routines', 'billing.pro.social', 'billing.pro.ai', 'billing.pro.sync', 'billing.pro.noAds'];

function FreeCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const style = useCardStyle(false);
  return (
    <section aria-labelledby="plan-free" style={style}>
      <h2 id="plan-free" style={{ margin: 0, fontSize: '1.25rem' }}>{t('billing.free.name')}</h2>
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{t('billing.free.price')}</p>
      <p style={{ margin: 0, color: theme.colors.muted }}>{t('billing.free.tagline')}</p>
      <FeatureList keys={FREE_FEATURE_KEYS} />
    </section>
  );
}

type Actions = ReturnType<typeof useCheckoutActions>;

type ProCardProps = {
  plan: CatalogPlan;
  monthly: CatalogPlan;
  currency: Currency;
  trialDays: number;
  entitlement: Entitlement | null;
  actions: Actions;
};

function ProCard({ plan, monthly, currency, trialDays, entitlement, actions }: ProCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const style = useCardStyle(true);
  const price = formatMoney(plan.prices[currency], currency, i18n.language);
  const perMonth = formatMoney(Math.round(plan.prices[currency] / 12), currency, i18n.language);
  const yearlyNote = plan.interval === 'year'
    ? t('billing.pro.perMonthEquivalent', { price: perMonth, monthly: formatMoney(monthly.prices[currency], currency, i18n.language) })
    : t('billing.pro.billedMonthly');
  return (
    <section aria-labelledby="plan-pro" style={style}>
      <h2 id="plan-pro" style={{ margin: 0, fontSize: '1.25rem' }}>{t('billing.pro.name')}</h2>
      <p style={{ margin: 0 }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{price}</span>{' '}
        <span style={{ color: theme.colors.muted }}>{plan.interval === 'year' ? t('billing.pro.perYear') : t('billing.pro.perMonth')}</span>
      </p>
      <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem' }}>{yearlyNote}</p>
      <FeatureList keys={PRO_FEATURE_KEYS} />
      <ProActions plan={plan} trialDays={trialDays} entitlement={entitlement} actions={actions} />
    </section>
  );
}

function usePrimaryButtonStyle(): React.CSSProperties {
  const { theme } = useTheme();
  return {
    minHeight: 48,
    width: '100%',
    borderRadius: theme.shape.radiusFull,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.primaryForeground,
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
  };
}

function useSecondaryButtonStyle(): React.CSSProperties {
  const { theme } = useTheme();
  return {
    minHeight: 44,
    width: '100%',
    borderRadius: theme.shape.radiusFull,
    border: `1.5px solid ${theme.colors.primary}`,
    background: 'transparent',
    color: theme.colors.primary,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

type ProActionsProps = { plan: CatalogPlan; trialDays: number; entitlement: Entitlement | null; actions: Actions };

function ProActions({ plan, trialDays, entitlement, actions }: ProActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useAppAuth();
  const primary = usePrimaryButtonStyle();
  const secondary = useSecondaryButtonStyle();

  if (!userId) {
    return (
      <button type="button" style={primary} onClick={() => navigate('/sign-up')}>
        {t('billing.cta.signUpForTrial', { days: trialDays })}
      </button>
    );
  }
  if (entitlement?.source === 'subscription') {
    return (
      <button type="button" style={secondary} disabled={actions.busy === 'portal'} onClick={actions.manage}>
        {t('billing.cta.manage')}
      </button>
    );
  }
  return <TrialAndSubscribe plan={plan} trialDays={trialDays} trialEligible={Boolean(entitlement?.trial.eligible)} actions={actions} />;
}

function TrialAndSubscribe({ plan, trialDays, trialEligible, actions }: { plan: CatalogPlan; trialDays: number; trialEligible: boolean; actions: Actions }) {
  const { t } = useTranslation();
  const primary = usePrimaryButtonStyle();
  const secondary = useSecondaryButtonStyle();
  const ctaVariant = useExperiment('trial_cta_copy');
  const subscribeLabel = t(plan.interval === 'year' ? 'billing.cta.subscribeYearly' : 'billing.cta.subscribeMonthly');
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {trialEligible && (
        <button type="button" style={primary} disabled={actions.busy !== null} onClick={actions.startTrial} aria-busy={actions.busy === 'trial'}>
          {t(`billing.cta.trial.${ctaVariant}`, { days: trialDays })}
        </button>
      )}
      <button
        type="button"
        style={trialEligible ? secondary : primary}
        disabled={actions.busy !== null}
        aria-busy={actions.busy === 'checkout'}
        onClick={() => actions.subscribe(plan)}
      >
        {subscribeLabel}
      </button>
      {trialEligible && <p style={{ margin: 0, fontSize: '0.8125rem', textAlign: 'center' }}>{t('billing.cta.trialNoCard')}</p>}
    </div>
  );
}

function PassOptions({ passes, currency, actions }: { passes: CatalogPass[]; currency: Currency; actions: Actions }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { userId } = useAppAuth();
  const secondary = useSecondaryButtonStyle();
  const available = useMemo(() => passes.filter((p) => p.available), [passes]);
  if (currency !== 'PEN' || !available.length || !userId) return null;
  return (
    <section
      aria-labelledby="passes-heading"
      style={{ marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.shape.radiusLg, border: `1px solid ${theme.colors.border}` }}
    >
      <h2 id="passes-heading" style={{ margin: 0, fontSize: '1.125rem' }}>{t('billing.passes.heading')}</h2>
      <p style={{ color: theme.colors.muted }}>{t('billing.passes.body')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {available.map((pass) => (
          <button key={pass.id} type="button" style={{ ...secondary, width: 'auto', padding: `0 ${theme.spacing.lg}px` }}
            disabled={actions.busy !== null} onClick={() => actions.buyPass(pass)}>
            {t('billing.passes.buy', { days: pass.days, price: formatMoney(pass.amountMinor, pass.currency, i18n.language) })}
          </button>
        ))}
      </div>
    </section>
  );
}

function ActionMessage({ message }: { message: Actions['message'] }) {
  const { theme } = useTheme();
  if (!message) return null;
  return (
    <p
      role={message.tone === 'error' ? 'alert' : 'status'}
      style={{
        marginTop: theme.spacing.lg,
        textAlign: 'center',
        color: message.tone === 'error' ? theme.colors.errorStrong : theme.colors.successStrong,
        fontWeight: 600,
      }}
    >
      {message.text}
    </p>
  );
}

export default PricingPage;
