/**
 * The routine limit as the person sees it: a quiet count under the form's heading while there is room, a calm note in
 * place of the templates and the form once the free plan is full, and the one-time thank-you (routineAllowance.ts).
 * The count is there from the first routine, so the limit is never a surprise wall; nothing here takes a routine away,
 * and the routines below stay open to change or remove.
 */
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Events, track } from '../../../core/analytics';
import { useTheme } from '../../../core/context/ThemeContext';
import { serverFeaturesEnabled } from '../../../core/utils/serverFeatures';
import { EXTRA_AFTER_DAYS } from '../routineAllowance';
import type { RoutineAllowanceState } from '../hooks/useRoutineAllowance';

function FullNote({ allowance }: { allowance: RoutineAllowanceState }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const counted = useRef(false);

  // Once per visit to the screen: how often people reach the limit, by variant. No routine names.
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    track(Events.ROUTINE_LIMIT, { step: 'reached', variant: allowance.variant, limit: allowance.limit, used: allowance.used });
  }, [allowance.variant, allowance.limit, allowance.used]);

  // Pro can only be offered where it can be bought (serverFeatures.ts).
  const offerPro = serverFeaturesEnabled();
  return (
    // Keeps the form's tour target, so the routines tour still has a place to point.
    <div role="note" data-tour="routines-form" style={{ display: 'grid', gap: theme.spacing.xs, padding: theme.spacing.md, marginBottom: theme.spacing.lg, borderRadius: theme.shape.radiusMd, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('routines.limit.full', { used: allowance.used, limit: allowance.limit })}</p>
      {offerPro && (
        <p style={{ margin: 0, color: theme.colors.muted }}>
          {t('routines.limit.pro')}{' '}
          <Link
            to="/pricing"
            onClick={() => track(Events.ROUTINE_LIMIT, { step: 'see_pro', variant: allowance.variant, limit: allowance.limit })}
            style={{ color: theme.colors.primary, fontWeight: 600, display: 'inline-block', minHeight: 44, lineHeight: '44px' }}
          >
            {t('routines.limit.seePro')}
          </Link>
        </p>
      )}
    </div>
  );
}

/** "2 of 3 routines in use", under the form's heading. Nothing for Pro. */
export function RoutineLimitCount({ allowance }: { allowance: RoutineAllowanceState }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (allowance.limit === null) return null;
  return (
    <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem' }}>
      {t('routines.limit.count', { used: allowance.used, limit: allowance.limit })}
    </p>
  );
}

/** The templates and the form while there is room; the note in their place once the free plan is full. */
export function RoutineFormGate({ allowance, children }: { allowance: RoutineAllowanceState; children: React.ReactNode }) {
  if (!allowance.canAdd) return <FullNote allowance={allowance} />;
  return <>{children}</>;
}

/** The thank-you, once, until the person says OK. A status, so it is read out without taking focus. */
export function RoutineExtraNotice({ allowance }: { allowance: RoutineAllowanceState }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { newExtra, limit, acknowledgeExtra } = allowance;
  if (!newExtra) return null;
  return (
    <div role="status" style={{ display: 'grid', gap: theme.spacing.xs, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.shape.radiusMd, border: `1.5px solid ${theme.colors.primary}`, background: theme.colors.surface }}>
      <strong style={{ color: theme.colors.text }}>{t('routines.extra.title')}</strong>
      <p style={{ margin: 0, color: theme.colors.text }}>{t('routines.extra.body', { days: EXTRA_AFTER_DAYS, spaces: newExtra.spaces, limit })}</p>
      <div>
        <button
          type="button"
          onClick={acknowledgeExtra}
          style={{ minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull, border: `1.5px solid ${theme.colors.primary}`, background: 'transparent', color: theme.colors.primary, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('routines.extra.ok')}
        </button>
      </div>
    </div>
  );
}
