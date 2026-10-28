/**
 * TrialBanner — a calm heads-up two days before a trial or pass ends, and once
 * after it ends. Research: trial-end reminders raise conversion and trust; a
 * surprise downgrade does the opposite. Dismissible, never modal.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { useEntitlement } from './EntitlementContext';
import { daysUntil } from './formatMoney';
import type { Entitlement } from './billingApi';

const DISMISS_KEY = 'gylio:trialBannerDismissed';

function endingSoon(entitlement: Entitlement, nowMs: number): number | null {
  const temporary = entitlement.plan === 'pro' && !entitlement.renews && entitlement.source !== 'gift';
  const days = daysUntil(entitlement.expiresAt, nowMs);
  return temporary && days !== null && days <= 2 ? days : null;
}

function endedRecently(entitlement: Entitlement, nowMs: number): boolean {
  const endsAt = entitlement.trial.endsAt ? Date.parse(entitlement.trial.endsAt) : NaN;
  return entitlement.plan === 'free' && endsAt <= nowMs && nowMs - endsAt < 7 * 86_400_000;
}

/** Which reminder, if any, to show for this entitlement right now. */
export function trialReminder(entitlement: Entitlement | null, nowMs: number): null | { kind: 'ending' | 'ended'; days: number } {
  if (!entitlement) return null;
  const days = endingSoon(entitlement, nowMs);
  if (days !== null) return { kind: 'ending', days };
  return endedRecently(entitlement, nowMs) ? { kind: 'ended', days: 0 } : null;
}

export function TrialBanner() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { entitlement } = useEntitlement();
  const reminder = trialReminder(entitlement, Date.now());
  const marker = `${reminder?.kind}:${entitlement?.expiresAt ?? entitlement?.trial.endsAt}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
  });
  if (!reminder || dismissed === marker) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, marker); } catch { /* storage blocked */ }
    setDismissed(marker);
  };
  return (
    <div role="status" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm,
      padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.shape.radiusLg,
      border: `1px solid ${theme.colors.border}`, background: theme.colors.surface,
    }}>
      <span style={{ flex: '1 1 240px' }}>
        {t(`billing.banner.${reminder.kind}`, { count: reminder.days })}
      </span>
      <Link to="/pricing" style={{ color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>
        {t('billing.banner.seePlans')}
      </Link>
      <button type="button" onClick={dismiss} style={{ minHeight: 44, background: 'transparent', border: 'none', color: theme.colors.muted, cursor: 'pointer' }}>
        {t('billing.banner.dismiss')}
      </button>
    </div>
  );
}

export default TrialBanner;
