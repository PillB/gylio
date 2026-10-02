# task-3-contextual-upgrade-prompts

---FILE: src/features/subscription/UpgradePrompt.tsx---
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { track, Events } from '../../core/analytics';

type Props = {
  featureName: string;
  compact?: boolean;
  /** 2 concrete benefits the user gains with premium */
  outcomes?: string[];
  /** What the user can still do without upgrading */
  freeAlternative?: string;
  /** Called when the user exercises their one-time free try */
  onTryOnce?: () => void;
};

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
    // localStorage unavailable – fail silently, do not block UX
  }
}

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

  // ─── analytics ───────────────────────────────────────────────────────────
  useEffect(() => {
    track(Events.UPGRADE_PROMPT_VIEWED, {
      featureName,
      compact,
      hasOutcomes: Boolean(outcomes?.length),
      hasFreeAlternative: Boolean(freeAlternative),
      tryOnceAvailable,
    });
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

  // ─── shared sub-components ───────────────────────────────────────────────

  const OutcomesList: React.FC = () => {
    if (!outcomes?.length) return null;
    return (
      <ul
        style={{
          margin: `${theme.spacing.xs} 0 0 0`,
          padding: `0 0 0 ${theme.spacing.md}`,
          listStyleType: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xs,
        }}
        aria-label={t('upgrade.outcomesListAria', 'What you gain with premium')}
      >
        {outcomes.map((outcome) => (
          <li
            key={outcome}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing.xs,
              fontSize: '0.875rem',
              color: theme.colors.textSecondary,
            }}
          >
            {/* Decorative checkmark – hidden from AT since the list label covers semantics */}
            <span aria-hidden="true" style={{ color: theme.colors.success, flexShrink: 0 }}>
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
          margin: `${theme.spacing.xs} 0 0 0`,
          fontSize: '0.8125rem',
          color: theme.colors.textTertiary ?? theme.colors.textSecondary,
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
        style={{
          background: 'transparent',
          border: `1.5px solid ${theme.colors.primary}`,
          borderRadius: theme.shape.radiusSm ?? theme.shape.radius,
          color: theme.colors.primary,
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          transition: 'opacity 0.15s ease',
        }}
        aria-label={t(
          'upgrade.tryOnceAria',
          'Try {{featureName}} once for free',
          { featureName }
        )}
      >
        {t('upgrade.tryOnce', 'Try this once, free')}
      </button>
    );
  };

  // ─── compact variant ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <aside
        role="complementary"
        aria-label={t('upgrade.regionAria', 'Premium feature information')}
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          background: theme.colors.surfaceAlt ?? theme.colors.surface,
          borderRadius: theme.shape.radiusSm ?? theme.shape.radius,
          border: `1px solid ${theme.colors.borderSubtle ?? theme.colors.border}`,
          boxShadow: theme.shadow.sm ?? theme.shadow.card,
        }}
      >
        {/* Badge */}
        <span
          style={{
            background: theme.colors.primary,
            color: theme.colors.onPrimary ?? '#fff',
            borderRadius: theme.shape.radiusPill ?? '999px',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: `2px ${theme.spacing.xs}`,
            textTransform: 'uppercase',
          }}
          aria-label={t('upgrade.premiumBadgeAria', 'Premium feature')}
        >
          {t('upgrade.premiumBadge', 'Premium')}
        </span>

        {/* Compact outcomes (one-liner) */}
        {outcomes?.[0] && (
          <span
            style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}
          >
            {outcomes[0]}
          </span>
        )}

        <TryOnceButton />

        <button
          type="button"
          onClick={handleUpgradeClick}
          style={{
            background: theme.colors.primary,
            border: 'none',
            borderRadius: theme.shape.radiusSm ?? theme.shape.radius,
            color: theme.colors.onPrimary ?? '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          }}
          aria-label={t('upgrade.tryFreeAria', 'Start your free trial')}
        >
          {t('upgrade.tryFree', 'Try free')}
        </button>
      </aside>
    );
  }

  // ─── full variant ─────────────────────────────────────────────────────────
  return (
    <aside
      role="complementary"
      aria-label={t('upgrade.regionAria', 'Premium feature information')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        background: theme.colors.surfaceAlt ?? theme.colors.surface,
        borderRadius: theme.shape.radius,
        border: `1px solid ${theme.colors.borderSubtle ?? theme.colors.border}`,
        boxShadow: theme.shadow.card,
        textAlign: 'center',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      {/* Icon */}
      <span
        role="img"
        aria-label={t('upgrade.iconAria', 'Sparkles')}
        style={{ fontSize: '2rem', lineHeight: 1 }}
      >
        ✨
      </span>

      {/* Badge */}
      <span
        style={{
          background: theme.colors.primary,
          color: theme.colors.onPrimary ?? '#fff',
          borderRadius: theme.shape.radiusPill ?? '999px',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          padding: `3px ${theme.spacing.sm}`,
          textTransform: 'uppercase',
        }}
      >
        {t('upgrade.premiumBadge', 'Premium')}
      </span>

      {/* Title */}
      <h2
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: theme.colors.text,
        }}
      >
        {t('upgrade.title', 'Unlock full access')}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          margin: 0,
          fontSize: '0.9375rem',
          color: theme.colors.textSecondary,
          lineHeight: 1.5,
        }}
      >
        {t(
          'upgrade.subtitle',
          'This feature is part of Gylio Premium. Start a 10-day free trial — no pressure, cancel any time.'
        )}
      </p>

      {/* Contextual outcomes */}
      {outcomes?.length ? (
        <div
          style={{
            width: '100%',
            background: theme.colors.surface,
            borderRadius: theme.shape.radiusSm ?? theme.shape.radius,
            padding: theme.spacing.sm,
            textAlign: 'left',
          }}
        >
          <p
            style={{
              margin: `0 0 ${theme.spacing.xs} 0`,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          width: '100%',
        }}
      >
        <TryOnceButton />

        <button
          type="button"
          onClick={handleUpgradeClick}
          style={{
            background: theme.colors.primary,
            border: 'none',
            borderRadius: theme.shape.radius,
            color: theme.colors.onPrimary ?? '#fff',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 700,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            flex: '1 1 auto',
            minWidth: '180px',
            boxShadow: theme.shadow.sm,
          }}
          aria-label={t('upgrade.startTrialAria', 'Start your 10-day free trial')}
        >
          {t('upgrade.startTrial', 'Start 10-day free trial')}
        </button>

        <button
          type="button"
          onClick={handleUpgradeClick}
          style={{
            background: 'transparent',
            border: `1.5px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radius,
            color: theme.colors.textSecondary,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          }}
          aria-label={t('upgrade.seePlansAria', 'View all plan options')}
        >
          {t('upgrade.seePlans', 'See plans')}
        </button>
      </div>
    </aside>
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
---END FILE---

---FILE: src/core/analytics/events.ts---
// This file augments / re-exports the existing Events enum.
// If your project already has an events file, merge only the three new entries.

export const Events = {
  // ── existing events (keep all originals) ──────────────────────────────────
  // ... (existing entries remain unchanged)

  // ── upgrade / subscription ─────────────────────────────────────────────────
  UPGRADE_PROMPT_VIEWED: 'upgrade_prompt_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
  TRY_ONCE_USED: 'try_once_used',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
---END FILE---

---I18N EN---
{
  "upgrade": {
    "premiumBadge": "Premium",
    "premiumBadgeAria": "Premium feature",
    "regionAria": "Premium feature information",
    "iconAria": "Sparkles",
    "title": "Unlock full access",
    "subtitle": "This feature is part of Gylio Premium. Start a 10-day free trial — no pressure, cancel any time.",
    "startTrial": "Start 10-day free trial",
    "startTrialAria": "Start your 10-day free trial",
    "seePlans": "See plans",
    "seePlansAria": "View all plan options",
    "tryFree": "Try free",
    "tryFreeAria": "Start your free trial",
    "tryOnce": "Try this once, free",
    "tryOnceAria": "Try {{featureName}} once for free",
    "outcomesHeading": "What you'll be able to do",
    "outcomesListAria": "What you gain with premium",
    "freeAlternativePrefix": "You can still",
    "pricing": "/pricing",

    "social": {
      "outcome1": "Share your streaks and wins with friends",
      "outcome2": "Join accountability groups and group challenges",
      "freeAlt": "track your own progress privately"
    },
    "routines": {
      "outcome1": "Build unlimited morning, evening, and custom routines",
      "outcome2": "Get gentle nudges timed to your energy levels",
      "freeAlt": "add up to 3 tasks to your daily routine"
    },
    "rewards": {
      "outcome1": "Create your own custom rewards and milestones",
      "outcome2": "Unlock animated celebrations for big achievements",
      "freeAlt": "earn the three built-in milestone badges"
    }
  }
}
---END I18N EN---

---I18N ES-PE---
{
  "upgrade": {
    "premiumBadge": "Premium",
    "premiumBadgeAria": "Función premium",
    "regionAria": "Información sobre funciones premium",
    "iconAria": "Destellos",
    "title": "Accede a todo lo que ofrece Gylio",
    "subtitle": "Esta función es parte de Gylio Premium. Comienza con 10 días gratis, sin compromiso y puedes cancelar cuando quieras.",
    "startTrial": "Comenzar prueba de 10 días",
    "startTrialAria": "Comenzar tu prueba gratuita de 10 días",
    "seePlans": "Ver planes",
    "seePlansAria": "Ver todas las opciones de planes",
    "tryFree": "Probar gratis",
    "tryFreeAria": "Iniciar tu prueba gratuita",
    "tryOnce": "Probar esto una vez, gratis",
    "tryOnceAria": "Usar {{featureName}} una vez de forma gratuita",
    "outcomesHeading": "Lo que podrás hacer",
    "outcomesListAria": "Qué ganas con Premium",
    "freeAlternativePrefix": "Por ahora puedes",
    "pricing": "/precios",

    "social": {
      "outcome1": "Comparte tus rachas y logros con amigos",
      "outcome2": "Únete a grupos de apoyo mutuo y retos en equipo",
      "freeAlt": "registrar tu propio progreso de forma privada"
    },
    "routines": {
      "outcome1": "Crea rutinas ilimitadas: mañana, noche o personalizadas",
      "outcome2": "Recibe recordatorios suaves adaptados a tus niveles de energía",
      "freeAlt": "agregar hasta 3 tareas a tu rutina diaria"
    },
    "rewards": {
      "outcome1": "Diseña tus propias recompensas e hitos personales",
      "outcome2": "Celebra tus grandes logros con animaciones especiales",
      "freeAlt": "ganar las tres medallas de hitos prediseñadas"
    }
  }
}
---END I18N ES-PE---

---NOTES---
- **Try-once token** is stored in `localStorage` under `gylio:tryOnceUsed:<featureName>`; reads happen synchronously at render time so there's no flicker, and write errors (private browsing quota) are swallowed silently so the gate never breaks.
- **No punitive language** anywhere: "Unlock full access" (not "You don't have access"), "You can still…" for the free alternative, and the trial CTA emphasises zero pressure — matching ADHD-friendly calm tone.
- **Outcomes panel** only renders when the prop is provided, keeping existing call-sites with zero outcomes backward-compatible with no visual change.
- **Three analytics events** (`UPGRADE_PROMPT_VIEWED`, `UPGRADE_CLICKED`, `TRY_ONCE_USED`) fire at the exact user-action moments; `VIEWED` fires once on mount via an effect with a stable dependency so hot-reload doesn't double-fire.
- **Consumer usage comments** are co-located at the bottom of the file (not a separate doc) so the suggested props are always visible when a developer edits the component — no external wiki required.
---END NOTES---
