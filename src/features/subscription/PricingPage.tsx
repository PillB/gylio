/**
 * PricingPage
 *
 * Pricing remains renderable when Clerk or billing is not configured. Auth
 * access is provided only through the app's AuthContext abstraction so a public
 * static build never calls Clerk hooks outside <ClerkProvider>.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { useSubscription } from './useSubscription';
import { useAppAuth } from '../../core/context/AuthContext';
import { authHeaders } from '../../core/utils/authToken';
import { apiUrl } from '../../core/utils/apiUrl';

const CheckIcon = () => (
  <span aria-hidden="true" style={{ color: '#22C55E', fontWeight: 700, marginRight: 8 }}>✓</span>
);

type ActivationState = 'idle' | 'loading' | 'success' | 'error';

const billingEnabled = import.meta.env.VITE_BILLING_ENABLED === 'true';

export const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { plan, isFree, trialDays, monthlyPrice, yearlyPrice } = useSubscription();
  const { userId } = useAppAuth();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [activation, setActivation] = useState<ActivationState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const price = billing === 'yearly' ? yearlyPrice : monthlyPrice;

  const handleStartTrial = async () => {
    // Production checkout is explicitly opt-in. A static preview must never
    // pretend that a trial was activated or attempt an unavailable backend.
    if (!billingEnabled) return;

    if (!userId) {
      navigate('/sign-in');
      return;
    }

    setActivation('loading');
    setErrorMsg('');

    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(apiUrl('/api/billing/activate-trial'), {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Server error ${res.status}`);
      }

      setActivation('success');

      // Reload the authenticated application boundary after the server changes
      // Clerk metadata. This avoids coupling this presentation component to a
      // Clerk-specific hook while still refreshing the session/user resources.
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('pricing.unknownError', 'Something went wrong'));
      setActivation('error');
    }
  };

  const freeFeatures = [
    t('pricing.feature.tasks', 'Task creation & micro-steps'),
    t('pricing.feature.calendar', 'Calendar view'),
    t('pricing.feature.budget', 'Basic budget tracking'),
    t('pricing.feature.aiOne', '1 free AI schedule suggestion'),
  ];

  const premiumFeatures = [
    t('pricing.feature.everything', 'Everything in Free'),
    t('pricing.feature.social', 'Social plans & gentle reminders'),
    t('pricing.feature.routines', 'Routine builder'),
    t('pricing.feature.rewards', 'Rewards & streaks'),
    t('pricing.feature.aiUnlimited', 'Unlimited AI suggestions'),
    t('pricing.feature.sync', 'Cross-device sync'),
    t('pricing.feature.support', 'Priority support'),
  ];

  const cardBase: React.CSSProperties = {
    borderRadius: theme.shape.radiusLg,
    padding: `${theme.spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    flex: '1 1 300px',
    width: '100%',
    minWidth: 0,
    maxWidth: 360,
    boxSizing: 'border-box',
    overflowWrap: 'anywhere',
  };

  const ctaLabel = () => {
    if (plan === 'user_subscription') return t('pricing.currentPlan', 'Current plan');
    if (!billingEnabled) return t('pricing.previewCta', 'Premium checkout coming soon');
    if (activation === 'loading') return t('pricing.activating', 'Activating…');
    if (activation === 'success') return t('pricing.activated', '✓ Premium activated!');
    return t('pricing.startTrial', `Start ${trialDays}-day free trial`, { days: trialDays });
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: `${theme.spacing.xxl}px ${theme.spacing.lg}px`,
        fontFamily: theme.typography.body.family,
        color: theme.colors.text,
        overflowWrap: 'anywhere',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
        <h1
          style={{
            fontFamily: theme.typography.heading.family,
            fontWeight: theme.typography.heading.weight,
            fontSize: 'clamp(1.65rem, 6vw, 2rem)',
            margin: 0,
            color: theme.colors.text,
          }}
        >
          {t('pricing.heading', 'Simple, honest pricing')}
        </h1>
        <p style={{ color: theme.colors.muted, marginTop: theme.spacing.sm, fontSize: '1.0625rem' }}>
          {t('pricing.subheading', "Start free. Upgrade when you're ready.")}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            width: 'min(100%, 360px)',
            margin: `${theme.spacing.lg}px auto 0`,
            borderRadius: theme.shape.radiusFull,
            border: `1.5px solid ${theme.colors.border}`,
            overflow: 'hidden',
            backgroundColor: theme.colors.surface,
          }}
        >
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBilling(b)}
              style={{
                minWidth: 0,
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                border: 'none',
                borderRadius: 0,
                background: billing === b ? theme.colors.primary : 'transparent',
                color: billing === b ? '#fff' : theme.colors.muted,
                fontWeight: billing === b ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                flexWrap: 'wrap',
              }}
            >
              {b === 'monthly'
                ? t('pricing.monthly', 'Monthly')
                : (
                  <>
                    <span>{t('pricing.yearly', 'Yearly')}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        background: theme.colors.success,
                        color: '#fff',
                        borderRadius: theme.shape.radiusFull,
                        padding: '1px 6px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('pricing.saveBadge', 'Save 17%')}
                    </span>
                  </>
                )}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          width: '100%',
          gap: theme.spacing.lg,
          justifyContent: 'center',
          alignItems: 'stretch',
          flexWrap: 'wrap',
          maxWidth: 780,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            ...cardBase,
            backgroundColor: theme.colors.surface,
            border: `1.5px solid ${theme.colors.border}`,
            boxShadow: theme.shadow.sm,
            opacity: plan === 'user_subscription' ? 0.7 : 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: theme.colors.muted,
                marginBottom: theme.spacing.xs,
              }}
            >
              {t('pricing.freePlanLabel', 'Free')}
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, color: theme.colors.text }}>$0</div>
            <div style={{ color: theme.colors.muted, fontSize: '0.875rem' }}>
              {t('pricing.freeForever', 'Free forever')}
            </div>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: theme.spacing.sm }}>
            {freeFeatures.map((feature) => (
              <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.9375rem' }}>
                <CheckIcon />{feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            style={{
              padding: `${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusFull,
              border: `1.5px solid ${theme.colors.border}`,
              background: 'transparent',
              color: theme.colors.text,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {isFree
              ? t('pricing.currentPlan', 'Current plan')
              : t('pricing.freePlanCta', 'Continue with Free')}
          </button>
        </div>

        <div
          style={{
            ...cardBase,
            background: `linear-gradient(145deg, ${theme.colors.primary} 0%, #8B5CF6 100%)`,
            border: 'none',
            boxShadow: theme.shadow.xl,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            }}
          />
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: theme.spacing.xs,
              }}
            >
              <span>✦</span>
              {t('pricing.premiumPlanLabel', 'Premium')}
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff' }}>
              ${price}
              <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.8 }}>
                {t('pricing.perMonth', '/mo')}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              {!billingEnabled
                ? t('pricing.previewPrice', 'Planned price · checkout not live')
                : billing === 'yearly'
                  ? t('pricing.billedYearly', 'billed yearly · save $24/year')
                  : t('pricing.billedMonthly', 'billed monthly')}
            </div>
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: theme.spacing.sm }}>
            {premiumFeatures.map((feature) => (
              <li
                key={feature}
                style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.9375rem', color: '#fff' }}
              >
                <CheckIcon />{feature}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!billingEnabled || activation === 'loading' || activation === 'success' || plan === 'user_subscription'}
            onClick={handleStartTrial}
            style={{
              padding: `${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusFull,
              border: 'none',
              background: activation === 'success' ? '#22C55E' : '#fff',
              color: activation === 'success' ? '#fff' : theme.colors.primary,
              fontWeight: 700,
              cursor: !billingEnabled || activation === 'loading' || plan === 'user_subscription' ? 'default' : 'pointer',
              textAlign: 'center',
              fontSize: '0.9375rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: !billingEnabled || activation === 'loading' ? 0.78 : 1,
              transition: 'background 0.3s, color 0.3s',
            }}
          >
            {ctaLabel()}
          </button>

          {activation === 'error' && (
            <div
              role="alert"
              style={{
                padding: `${theme.spacing.sm}px`,
                borderRadius: theme.shape.radiusMd,
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.5)',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#fff', fontWeight: 600 }}>
                {t('pricing.trialError', 'Could not activate trial')}
              </p>
              <p style={{ margin: `${theme.spacing.xs}px 0 0`, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={handleStartTrial}
                style={{
                  marginTop: theme.spacing.xs,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: theme.shape.radiusFull,
                  color: '#fff',
                  fontSize: '0.75rem',
                  padding: `2px ${theme.spacing.sm}px`,
                  cursor: 'pointer',
                }}
              >
                {t('pricing.tryAgain', 'Try again')}
              </button>
            </div>
          )}

          {activation !== 'error' && (
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                color: activation === 'success' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                textAlign: 'center',
              }}
            >
              {!billingEnabled
                ? t('pricing.previewNotice', 'Premium is a product preview. Checkout is not live and no payment will be collected yet.')
                : activation === 'success'
                  ? t('pricing.redirecting', 'Unlocking premium features…')
                  : t('pricing.noCard', 'No credit card required for trial')}
            </p>
          )}
        </div>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: theme.spacing.xxl,
          color: theme.colors.muted,
          fontSize: '0.875rem',
        }}
      >
        {billingEnabled
          ? t('pricing.faq', 'Cancel anytime. Downgrade to free at any point — your data stays safe.')
          : t('pricing.previewFaq', 'Prices and premium features are shown for product planning; checkout is disabled in this build.')}
      </p>
    </div>
  );
};

export default PricingPage;