import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { serverFeaturesEnabled } from '../../core/utils/serverFeatures';
import { TOUR_LAYOUT } from './tourTarget';

type Theme = ReturnType<typeof useTheme>['theme'];

const nudgeStyle = (theme: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  marginBottom: theme.spacing.md,
  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
  borderRadius: theme.shape.radiusMd,
  border: `1.5px solid ${theme.colors.primary}`,
  background: `${theme.colors.primary}12`,
  color: theme.colors.primary,
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: theme.typography.body.family,
  textAlign: 'left',
});

/** "Start the free trial to unlock", only where Pro can be bought (serverFeatures.ts). */
export function TourProNudge({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (!serverFeaturesEnabled()) return null;
  return (
    <button type="button" onClick={onUnlock} style={nudgeStyle(theme)}>
      <span aria-hidden="true">✦</span>
      {t('tour.unlockCta', 'Start 10-day free trial to unlock →')}
    </button>
  );
}

/** Shown on a sign-in page, where the tour cannot open the tab a step points at. */
export function TourSignInNudge({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <button type="button" onClick={onSignIn} style={nudgeStyle(theme)}>
      <span aria-hidden="true">→</span>
      {t('tour.signInCta', 'Sign in to see this feature live →')}
    </button>
  );
}

/** The ring around the step's target; everything outside it is dimmed. */
export function TourSpotlight({ rect, animate }: { rect: DOMRect; animate: boolean }) {
  const { theme } = useTheme();
  const { ring } = TOUR_LAYOUT;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: rect.top - ring,
        left: rect.left - ring,
        width: rect.width + ring * 2,
        height: rect.height + ring * 2,
        borderRadius: 10,
        boxShadow: `0 0 0 3px ${theme.colors.primary}, 0 0 0 9999px rgba(0,0,0,0.48)`,
        pointerEvents: 'none',
        zIndex: theme.zIndex.tour,
        transition: animate ? 'top 250ms ease-out, left 250ms ease-out, width 250ms ease-out, height 250ms ease-out' : 'none',
      }}
    />
  );
}

/** Dims the whole page behind a centred card. */
export function TourBackdrop() {
  const { theme } = useTheme();
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.52)', zIndex: theme.zIndex.tour, pointerEvents: 'none' }}
    />
  );
}

interface HeaderProps {
  stepIndex: number;
  totalSteps: number;
  /** The highlighted element is live: show the "Try it" badge. */
  canTry: boolean;
  onPause: () => void;
}

export function TourCardHeader({ stepIndex, totalSteps, canTry, onPause }: HeaderProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
        <span style={{ fontSize: '0.75rem', color: theme.colors.muted, fontWeight: 600 }}>
          {t('tour.stepOf', { current: stepIndex + 1, total: totalSteps })}
        </span>
        {canTry && (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: theme.colors.primary,
              background: `${theme.colors.primary}18`,
              borderRadius: theme.shape.radiusFull,
              padding: '1px 7px',
              letterSpacing: '0.02em',
            }}
          >
            ✏ {t('tour.interactive', 'Try it')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onPause}
        aria-label={t('tour.pauseAria', 'Pause tour')}
        style={{
          minWidth: 44,
          minHeight: 44,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.colors.muted,
          fontSize: '1.1rem',
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: theme.shape.radiusSm,
          fontFamily: theme.typography.body.family,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function TourProgress({ stepIndex, totalSteps, animate }: { stepIndex: number; totalSteps: number; animate: boolean }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div
      role="progressbar"
      aria-valuenow={stepIndex + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={t('tour.progressAria', 'Tour progress')}
      style={{ display: 'flex', gap: 4, marginBottom: theme.spacing.md }}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          style={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            backgroundColor: index <= stepIndex ? theme.colors.primary : theme.colors.border,
            transition: animate ? 'background-color 250ms' : 'none',
          }}
        />
      ))}
    </div>
  );
}

interface NavProps {
  isFirst: boolean;
  isLast: boolean;
  animate: boolean;
  onPrev: () => void;
  /** Next step, or finishing the tour on the last one. */
  onForward: () => void;
}

export function TourNavButtons({ isFirst, isLast, animate, onPrev, onForward }: NavProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const shared: React.CSSProperties = {
    minHeight: 44,
    borderRadius: theme.shape.radiusMd,
    fontSize: '0.875rem',
    fontFamily: theme.typography.body.family,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        aria-label={t('tour.prevAria', 'Previous step')}
        style={{
          ...shared,
          padding: `6px ${theme.spacing.sm}px`,
          border: `1px solid ${theme.colors.border}`,
          background: 'transparent',
          color: isFirst ? theme.colors.muted : theme.colors.text,
          cursor: isFirst ? 'default' : 'pointer',
          opacity: isFirst ? 0.4 : 1,
          transition: animate ? 'opacity 150ms' : 'none',
        }}
      >
        ← {t('tour.prev', 'Back')}
      </button>
      <button
        type="button"
        onClick={onForward}
        data-autofocus
        aria-label={isLast ? t('tour.finishAria', 'Finish tour') : t('tour.nextAria', 'Next step')}
        style={{
          ...shared,
          padding: `6px ${theme.spacing.md}px`,
          border: 'none',
          background: theme.colors.primary,
          color: theme.colors.primaryForeground,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {isLast ? `${t('tour.finish', 'Done!')} ✓` : `${t('tour.next', 'Next')} →`}
      </button>
    </div>
  );
}
