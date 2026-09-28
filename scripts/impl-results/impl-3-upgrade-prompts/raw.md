---FILE: src/features/subscription/UpgradePrompt.tsx---
/**
 * UpgradePrompt
 *
 * Shown in-place when a free user tries to access a premium feature.
 * Encourages starting the 10-day trial with a gentle, non-punitive CTA.
 *
 * Optional props:
 *   outcomes        – up to ~3 concrete benefits the user gains with premium
 *   freeAlternative – what they can still do without upgrading (calm framing)
 *   onTryOnce       – when provided, surfaces a one-shot "try this once, free"
 *                     button; the token is stored in localStorage so it only
 *                     ever shows once per feature per browser.
 */
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { track, Events } from '../../core/analytics';

// ── try-once token helpers ────────────────────────────────────────────────────

const TRY_ONCE_PREFIX = 'gylio:tryOnceUsed:';

function isTryOnceUsed(featureName: string): boolean {
  try {
    return localStorage.getItem(`${TRY_ONCE_PREFIX}${featureName}`) === 'true';
  } catch {
    return false;
  }
}

function markTryOnceUsed(featureName: string): void {
  try {
    localStorage.setItem(`${TRY_ONCE_PREFIX}${featureName}`, 'true');
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — fail silently,
    // never block the user action.
  }
}

// ── types ─────────────────────────────────────────────────────────────────────

type Props = {
  featureName: string;
  compact?: boolean;
  /** 2–3 concrete things the user gains with premium (optional). */
  outcomes?: string[];
  /** What the user can still do without upgrading (optional, calm framing). */
  freeAlternative?: string;
  /** When provided a one-shot "try this once, free" button is shown. */
  onTryOnce?: () => void;
};

// ── component ─────────────────────────────────────────────────────────────────

export const UpgradePrompt: React.FC<Props> = ({
  featureName,
  compact = false,
  outcomes,
  freeAlternative,
  onTryOnce,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const tryOnceAvailable = onTryOnce !== undefined && !isTryOnceUsed(featureName);

  // ── analytics ──────────────────────────────────────────────────────────────

  useEffect(() => {
    track(Events.UPGRADE_PROMPT_VIEWED, {
      featureName,
      compact,
      hasOutcomes: Boolean(outcomes?.length),
      hasFreeAlternative: Boolean(freeAlternative),
      tryOnceAvailable,
    });
    // Only fire once per mount; featureName is the stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureName]);

  const handleUpgradeClick = useCallback(() => {
    track(Events.UPGRADE_CLICKED, { featureName, compact });
    navigate('/pricing');
  }, [featureName, compact, navigate]);

  const handleTryOnce = useCallback(() => {
    markTryOnceUsed(featureName);
    track(Events.TRY_ONCE_USED, { featureName });
    onTryOnce?.();
  }, [featureName, onTryOnce]);

  // ── shared sub-components ──────────────────────────────────────────────────

  const OutcomesList: React.FC = () => {
    if (!outcomes?.length) return null;
    return (
      <ul
        aria-label={t('upgrade.outcomesListAria', 'What you gain with premium')}
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xs,
          width: '100%',
          textAlign: 'left',
        }}
      >
        {outcomes.map((outcome) => (
          <li
            key={outcome}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing.xs,
              fontSize: '0.875rem',
              color: theme.colors.muted,
            }}
          >
            <span aria-hidden="true" style={{ color: theme.colors.primary, flexShrink: 0, fontWeight: 700 }}>
              ✓
            </span>
            {outcome}
          </li>
        ))}
      </ul>
    );
  };

  const FreeAlternativeNote: React.FC = () => {
    if (!freeAlternative) return null;
    return (
      <p
        style={{
          margin: 0,
          fontSize: '0.8125rem',
          color: theme.colors.muted,
          fontStyle: 'italic',
        }}
      >
        {t('upgrade.freeAlternativePrefix', 'You can still')}{' '}
        {freeAlternative}
      </p>
    );
  };

  const TryOnceButton: React.FC = () => {
    if (!tryOnceAvailable) return null;
    return (
      <button
        type="button"
        onClick={handleTryOnce}
        aria-label={t('upgrade.tryOnceAria', 'Try {{featureName}} once for free', { featureName })}
        style={{
          padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
          borderRadius: theme.shape.radiusFull,
          background: 'transparent',
          color: theme.colors.primary,
          border: `1.5px solid ${theme.colors.primary}`,
          fontWeight: 600,
          fontSize: '0.9375rem',
          cursor: 'pointer',
        }}
      >
        {t('upgrade.tryOnce', 'Try this once, free')}
      </button>
    );
  };

  // ── compact variant ────────────────────────────────────────────────────────

  if (compact) {
    return (
      <div
        role="region"
        aria-label={t('upgrade.regionAria', 'Upgrade to access this feature')}
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusFull,
          backgroundColor: theme.colors.overlay,
          border: `1px solid ${theme.colors.primary}`,
        }}
      >
        {/* Badge */}
        <span
          style={{ fontSize: '0.75rem', color: theme.colors.primary, fontWeight: 600 }}
          aria-label={t('upgrade.premiumBadgeAria', 'Premium feature')}
        >
          {t('upgrade.premiumBadge', '✦ Premium')}
        </span>

        {/* First outcome as a one-liner hint */}
        {outcomes?.[0] && (
          <span style={{ fontSize: '0.75rem', color: theme.colors.muted }}>
            {outcomes[0]}
          </span>
        )}

        {/* Try-once (compact) */}
        {tryOnceAvailable && (
          <button
            type="button"
            onClick={handleTryOnce}
            aria-label={t('upgrade.tryOnceAria', 'Try {{featureName}} once for free', { featureName })}
            style={{
              fontSize: '0.75rem',
              padding: `2px ${theme.spacing.xs}px`,
              borderRadius: theme.shape.radiusFull,
              background: 'transparent',
              color: theme.colors.primary,
              border: `1px solid ${theme.colors.primary}`,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('upgrade.tryOnce', 'Try this once, free')}
          </button>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleUpgradeClick}
          style={{
            fontSize: '0.75rem',
            padding: `2px ${theme.spacing.xs}px`,
            borderRadius: theme.shape.radiusFull,
            background: theme.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('upgrade.tryFree', 'Try free')}
        </button>
      </div>
    );
  }

  // ── full variant ───────────────────────────────────────────────────────────

  return (
    <div
      role="region"
      aria-label={t('upgrade.regionAria', 'Upgrade to access this feature')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.lg,
        padding: `${theme.spacing.xxl}px ${theme.spacing.xl}px`,
        borderRadius: theme.shape.radiusLg,
        background: `linear-gradient(135deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 100%)`,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow.md,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.shape.radiusFull,
          background: theme.colors.overlay,
          border: `2px solid ${theme.colors.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}
        role="img"
        aria-label={t('upgrade.iconAria', 'Sparkles')}
      >
        ✦
      </div>

      {/* Heading + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, alignItems: 'center' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: theme.typography.heading.family,
            fontWeight: theme.typography.heading.weight,
            color: theme.colors.text,
            fontSize: '1.125rem',
          }}
        >
          {t('upgrade.title', 'Unlock full access')}
        </h3>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {t(
            'upgrade.subtitle',
            'This feature is part of Gylio Premium. Start a 10-day free trial — no pressure, cancel any time.',
          )}
        </p>
      </div>

      {/* Contextual outcomes list */}
      {outcomes?.length ? (
        <div
          style={{
            width: '100%',
            background: theme.colors.surface,
            borderRadius: theme.shape.radiusLg,
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: `0 0 ${theme.spacing.xs}px 0`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: theme.colors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'left',
            }}
          >
            {t('upgrade.outcomesHeading', "What you'll be able to do")}
          </p>
          <OutcomesList />
        </div>
      ) : null}

      {/* Free alternative note */}
      <FreeAlternativeNote />

      {/* CTA row */}
      <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        <TryOnceButton />

        <button
          type="button"
          onClick={handleUpgradeClick}
          aria-label={t('upgrade.startTrialAria', 'Start your 10-day free trial')}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.xl}px`,
            borderRadius: theme.shape.radiusFull,
            background: theme.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            boxShadow: theme.shadow.md,
            flex: '1 1 auto',
          }}
        >
          {t('upgrade.startTrial', 'Start 10-day free trial')}
        </button>

        <button
          type="button"
          onClick={handleUpgradeClick}
          aria-label={t('upgrade.seePlansAria', 'View all plan options')}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
            borderRadius: theme.shape.radiusFull,
            background: 'transparent',
            color: theme.colors.primary,
            border: `1.5px solid ${theme.colors.primary}`,
            fontWeight: 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
        >
          {t('upgrade.seePlans', 'See plans')}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: theme.colors.muted }}>
        {t('upgrade.pricing', '$12/month · or $10/month billed yearly')}
      </p>
    </div>
  );
};

/*
 * ─── USAGE EXAMPLES FOR EXISTING CONSUMERS ────────────────────────────────
 *
 * ── Social tab ──────────────────────────────────────────────────────────────
 * <UpgradePrompt
 *   featureName="social"
 *   outcomes={[
 *     t('upgrade.social.outcome1', 'Share your streaks and wins with friends'),
 *     t('upgrade.social.outcome2', 'Join accountability groups and group challenges'),
 *   ]}
 *   freeAlternative={t('upgrade.social.freeAlt', 'track your own progress privately')}
 *   onTryOnce={() => navigate('/social?preview=true')}
 * />
 *
 * ── Routines tab ────────────────────────────────────────────────────────────
 * <UpgradePrompt
 *   featureName="routines"
 *   outcomes={[
 *     t('upgrade.routines.outcome1', 'Build unlimited morning, evening, and custom routines'),
 *     t('upgrade.routines.outcome2', 'Get gentle nudges timed to your energy levels'),
 *   ]}
 *   freeAlternative={t('upgrade.routines.freeAlt', 'add up to 3 tasks to your daily routine')}
 *   onTryOnce={() => setRoutinePreviewMode(true)}
 * />
 *
 * ── Rewards tab ─────────────────────────────────────────────────────────────
 * <UpgradePrompt
 *   featureName="rewards"
 *   outcomes={[
 *     t('upgrade.rewards.outcome1', 'Create your own custom rewards and milestones'),
 *     t('upgrade.rewards.outcome2', 'Unlock animated celebrations for big achievements'),
 *   ]}
 *   freeAlternative={t('upgrade.rewards.freeAlt', 'earn the three built-in milestone badges')}
 *   onTryOnce={() => dispatch(previewRewardsAction())}
 * />
 */

export default UpgradePrompt;
---END FILE---

---FILE: src/core/analytics/index.ts---
/**
 * Lightweight analytics event layer.
 *
 * Queues events to localStorage so they survive page reloads and can be
 * flushed to a real provider (PostHog, Amplitude, Mixpanel) later by
 * swapping the `flush` implementation below.
 *
 * Usage:
 *   import { track } from '../core/analytics';
 *   track('task_completed', { taskId: 42, withSubtasks: true });
 */

export type AnalyticsEvent = {
  name: string;
  props?: Record<string, unknown>;
  ts: number; // epoch ms
  sessionId: string;
};

const SESSION_KEY = 'analytics:sessionId';
const QUEUE_KEY   = 'analytics:queue';
const MAX_QUEUE   = 200;

// ── Session ID (persists for the tab lifetime) ─────────────────────────────

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

// ── Queue helpers ──────────────────────────────────────────────────────────

function readQueue(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    // Storage full — drop silently.
  }
}

// ── Core track function ────────────────────────────────────────────────────

export function track(name: string, props?: Record<string, unknown>): void {
  const event: AnalyticsEvent = { name, props, ts: Date.now(), sessionId: getSessionId() };

  // In development, log to console for observability.
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? '');
  }

  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);

  // TODO: swap flush() below for your real provider, e.g.:
  //   posthog.capture(name, props);
  //   amplitude.track(name, props);
  //   mixpanel.track(name, props);
}

// ── Flush (call periodically or on page hide) ─────────────────────────────

export function flushQueue(): AnalyticsEvent[] {
  const queue = readQueue();
  writeQueue([]);
  return queue;
}

// ── Pre-defined event names (prevents typos) ──────────────────────────────

export const Events = {
  // Lifecycle
  APP_OPEN:                'app_open',
  ONBOARDING_STEP:         'onboarding_step',
  ONBOARDING_COMPLETE:     'onboarding_complete',

  // Tasks
  TASK_CREATED:            'task_created',
  TASK_COMPLETED:          'task_completed',
  TASK_UNCOMPLETED:        'task_uncompleted',
  ALL_TODAY_TASKS_DONE:    'all_today_tasks_done',
  TEMPLATE_SELECTED:       'template_selected',
  FOCUS_SESSION_STARTED:   'focus_session_started',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',

  // Routines
  ROUTINE_CREATED:         'routine_created',
  ROUTINE_COMPLETED:       'routine_completed',
  ROUTINE_TEMPLATE_USED:   'routine_template_used',

  // Budget
  BUDGET_ACTION:           'budget_action',
  DIAGNOSTIC_RUN:          'diagnostic_run',
  DIAGNOSTIC_APPLIED:      'diagnostic_applied',

  // Social
  SOCIAL_PLAN_CREATED:     'social_plan_created',

  // Gamification
  STREAK_MILESTONE:        'streak_milestone',
  WIN_CARD_SHOWN:          'win_card_shown',
  WIN_CARD_SHARED:         'win_card_shared',
  LEVEL_UP:                'level_up',

  // Retention
  WELCOME_BACK_SHOWN:      'welcome_back_shown',
  WELCOME_BACK_FRESH_START:'welcome_back_fresh_start',
  DAY2_PROMPT_SHOWN:       'day2_prompt_shown',

  // Upgrade / subscription
  UPGRADE_PROMPT_VIEWED:   'upgrade_prompt_viewed',
  UPGRADE_CLICKED:         'upgrade_clicked',
  TRY_ONCE_USED:           'try_once_used',
} as const;
---END FILE---

---I18N EN---
{
  "upgrade.premiumBadge": "✦ Premium",
  "upgrade.premiumBadgeAria": "Premium feature",
  "upgrade.regionAria": "Upgrade to access this feature",
  "upgrade.iconAria": "Sparkles",
  "upgrade.title": "Unlock full access",
  "upgrade.subtitle": "This feature is part of Gylio Premium. Start a 10-day free trial — no pressure, cancel any time.",
  "upgrade.startTrial": "Start 10-day free trial",
  "upgrade.startTrialAria": "Start your 10-day free trial",
  "upgrade.seePlans": "See plans",
  "upgrade.seePlansAria": "View all plan options",
  "upgrade.tryFree": "Try free",
  "upgrade.tryOnce": "Try this once, free",
  "upgrade.tryOnceAria": "Try {{featureName}} once for free",
  "upgrade.outcomesHeading": "What you'll be able to do",
  "upgrade.outcomesListAria": "What you gain with premium",
  "upgrade.freeAlternativePrefix": "You can still",
  "upgrade.pricing": "$12/month · or $10/month billed yearly",
  "upgrade.social.outcome1": "Share your streaks and wins with friends",
  "upgrade.social.outcome2": "Join accountability groups and group challenges",
  "upgrade.social.freeAlt": "track your own progress privately",
  "upgrade.routines.outcome1": "Build unlimited morning, evening, and custom routines",
  "upgrade.routines.outcome2": "Get gentle nudges timed to your energy levels",
  "upgrade.routines.freeAlt": "add up to 3 tasks to your daily routine",
  "upgrade.rewards.outcome1": "Create your own custom rewards and milestones",
  "upgrade.rewards.outcome2": "Unlock animated celebrations for big achievements",
  "upgrade.rewards.freeAlt": "earn the three built-in milestone badges"
}
---END I18N EN---

---I18N ES-PE---
{
  "upgrade.premiumBadge": "✦ Premium",
  "upgrade.premiumBadgeAria": "Función premium",
  "upgrade.regionAria": "Mejora tu plan para acceder a esta función",
  "upgrade.iconAria": "Destellos",
  "upgrade.title": "Accede a todo lo que ofrece Gylio",
  "upgrade.subtitle": "Esta función es parte de Gylio Premium. Comienza con 10 días gratis, sin compromiso y puedes cancelar cuando quieras.",
  "upgrade.startTrial": "Comenzar prueba de 10 días",
  "upgrade.startTrialAria": "Comenzar tu prueba gratuita de 10 días",
  "upgrade.seePlans": "Ver planes",
  "upgrade.seePlansAria": "Ver todas las opciones de planes",
  "upgrade.tryFree": "Probar gratis",
  "upgrade.tryOnce": "Probar esto una vez, gratis",
  "upgrade.tryOnceAria": "Usar {{featureName}} una vez de forma gratuita",
  "upgrade.outcomesHeading": "Lo que podrás hacer",
  "upgrade.outcomesListAria": "Qué ganas con Premium",
  "upgrade.freeAlternativePrefix": "Por ahora puedes",
  "upgrade.pricing": "$12/mes · o $10/mes con facturación anual",
  "upgrade.social.outcome1": "Comparte tus rachas y logros con amigos",
  "upgrade.social.outcome2": "Únete a grupos de apoyo mutuo y retos en equipo",
  "upgrade.social.freeAlt": "registrar tu propio progreso de forma privada",
  "upgrade.routines.outcome1": "Crea rutinas ilimitadas: mañana, noche o personalizadas",
  "upgrade.routines.outcome2": "Recibe recordatorios suaves adaptados a tus niveles de energía",
  "upgrade.routines.freeAlt": "agregar hasta 3 tareas a tu rutina diaria",
  "upgrade.rewards.outcome1": "Diseña tus propias recompensas e hitos personales",
  "upgrade.rewards.outcome2": "Celebra tus grandes logros con animaciones especiales",
  "upgrade.rewards.freeAlt": "ganar las tres medallas de hitos prediseñadas"
}
---END I18N ES-PE---