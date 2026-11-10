import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import useAccessibility from '../core/hooks/useAccessibility';
import { useGuidedTour } from '../core/context/GuidedTourContext';
import { useAppAuth } from '../core/context/AuthContext';
import useDialogFocus from '../core/hooks/useDialogFocus';
import type { TourStep } from '../features/tour/tourSteps';
import { placeTooltip } from '../features/tour/placeTooltip';
import { isStandIn, TOUR_LAYOUT } from '../features/tour/tourTarget';
import {
  TourBackdrop,
  TourCardHeader,
  TourNavButtons,
  TourProgress,
  TourProNudge,
  TourSignInNudge,
  TourSpotlight,
} from '../features/tour/TourCardParts';
import { useCardHeight } from '../features/tour/useCardHeight';
import { useTourKeys } from '../features/tour/useTourKeys';
import { useTourTarget, type TourTarget } from '../features/tour/useTourTarget';

export { TourProNudge };

const CARD_WIDTH = 320;
const PREMIUM_GATE = 'premium-gate';

/**
 * Modal (aria-modal, Tab trapped) only when the step is designed as a centred card.
 * A targeted step whose element is not on screen yet is centred as a fallback but must
 * leave the page reachable.
 */
const ariaModal = (step: TourStep): 'true' | undefined => (step.placement === 'center' || !step.target ? 'true' : undefined);

const stepAt = (state: { active: boolean; stepIndex: number }, steps: TourStep[]): TourStep | null =>
  state.active ? (steps[state.stepIndex] ?? null) : null;

/** On a sign-in page the tour cannot open the tab a step points at. */
const needsSignIn = (step: TourStep, found: boolean, signedIn: boolean, pathname: string): boolean => {
  if (signedIn || found) return false;
  const onAuthPage = pathname.includes('/sign-in') || pathname.includes('/sign-up');
  return onAuthPage && Boolean(step.tab && step.target);
};

interface StepView {
  /** No target on screen: the card sits in the middle over a dimmed page. */
  centred: boolean;
  /** The highlighted element is live. */
  canTry: boolean;
  /** Set while the step's own field is hidden and the spotlight is on the control that shows it. */
  revealHintKey: string | undefined;
  signInNudge: boolean;
  proNudge: boolean;
}

/** What the card shows for this step, given what the spotlight found. */
function describeStep(step: TourStep, target: TourTarget, signedIn: boolean, pathname: string): StepView {
  // The spotlight fell back to the Pro card: the step's own target is not available on this plan.
  const gated = target.name === PREMIUM_GATE;
  const found = target.rect !== null;
  const signInNudge = needsSignIn(step, found, signedIn, pathname);
  return {
    centred: step.placement === 'center' || !found,
    // "Try it" only where there is something to try, not on the Pro card standing in for a locked screen.
    canTry: Boolean(step.interactive) && found && !gated,
    revealHintKey: !gated && isStandIn(step.target, target.name) ? step.revealHintKey : undefined,
    signInNudge,
    // A gated step has found the Pro card, so it never also needs the sign-in nudge.
    proNudge: gated,
  };
}

/** What a step adds under its copy: how to reveal a hidden field, or where to sign in or unlock. */
function TourStepExtras({ view, onLeave }: { view: StepView; onLeave: (path: string) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <>
      {view.revealHintKey && (
        <p style={{ margin: `0 0 ${theme.spacing.md}px`, fontSize: '0.8125rem', fontWeight: 600, color: theme.colors.text, lineHeight: 1.45 }}>
          {t(view.revealHintKey)}
        </p>
      )}
      {view.signInNudge && <TourSignInNudge onSignIn={() => onLeave('/sign-in')} />}
      {view.proNudge && <TourProNudge onUnlock={() => onLeave('/pricing')} />}
    </>
  );
}

/** Where the card goes: beside its target, or in the middle of the screen when it has none. */
function cardPosition(step: TourStep, rect: DOMRect | null, cardHeight: number): React.CSSProperties {
  const { pad, gap } = TOUR_LAYOUT;
  // The visual viewport keeps the card in view while a phone's keyboard is open.
  const viewportW = window.visualViewport?.width ?? window.innerWidth;
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const width = Math.min(CARD_WIDTH, Math.max(0, viewportW - pad * 2));
  const base = { position: 'fixed', width, overflowY: 'auto', boxSizing: 'border-box' } as const;
  if (step.placement === 'center' || !rect) {
    return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxHeight: `calc(100vh - ${pad * 2}px)` };
  }
  const { top, left } = placeTooltip({ target: rect, viewportW, viewportH, tipW: width, tipH: cardHeight, gap, pad, prefer: step.placement });
  return { ...base, top, left, maxHeight: Math.max(80, viewportH - top - pad) };
}

export default function GuidedTourOverlay() {
  const { tourState, currentSteps, nextStep, prevStep, pauseTour, completeTour, totalSteps } = useGuidedTour();
  const { theme } = useTheme();
  const { reduceMotionEnabled, animationsEnabled } = useAccessibility();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { userId } = useAppAuth();
  const dialogRef = useRef<HTMLDivElement>(null);

  const { stepIndex } = tourState;
  const step = stepAt(tourState, currentSteps);
  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;
  const animate = animationsEnabled && !reduceMotionEnabled;

  const target = useTourTarget(step, animate, dialogRef);
  useTourKeys(tourState.active, { onPause: pauseTour, onNext: isLast ? undefined : nextStep, onPrev: isFirst ? undefined : prevStep });
  // Tab is trapped only on centred steps (aria-modal); spotlight steps keep the
  // highlighted element reachable for "Try it". The step index lets a spotlight step that
  // hands over to a centred card pull focus back in from the page.
  useDialogFocus(dialogRef, step !== null, stepIndex);
  // Placement uses the card's real height: an estimate either docks a card that would fit beside
  // its target, or puts one on top of the target in a browser that sets the copy in more lines.
  const cardHeight = useCardHeight(
    dialogRef,
    TOUR_LAYOUT.estimatedCardHeight,
    `${stepIndex}:${target.rect !== null}:${target.name === PREMIUM_GATE}`,
  );

  if (!step) return null;

  const view = describeStep(step, target, Boolean(userId), pathname);
  const leaveFor = (path: string) => {
    completeTour();
    navigate(path);
  };

  return (
    <>
      {target.rect && <TourSpotlight rect={target.rect} animate={animate} />}
      {view.centred && <TourBackdrop />}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={ariaModal(step)}
        aria-label={t('tour.dialogAria', 'Feature tour')}
        style={{
          ...cardPosition(step, target.rect, cardHeight),
          zIndex: theme.zIndex.tour + 1,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.shape.radiusLg,
          boxShadow: theme.shadow.xl,
          border: `1px solid ${theme.colors.borderStrong}`,
          padding: `${theme.spacing.md}px`,
          fontFamily: theme.typography.body.family,
          color: theme.colors.text,
        }}
      >
        <TourCardHeader stepIndex={stepIndex} totalSteps={totalSteps} canTry={view.canTry} onPause={pauseTour} />
        <TourProgress stepIndex={stepIndex} totalSteps={currentSteps.length} animate={animate} />

        <h3
          style={{
            margin: `0 0 ${theme.spacing.xs}px`,
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: theme.typography.heading.family,
            color: theme.colors.text,
          }}
        >
          {t(step.titleKey)}
        </h3>
        <p style={{ margin: `0 0 ${theme.spacing.md}px`, fontSize: '0.875rem', color: theme.colors.muted, lineHeight: 1.55 }}>
          {t(step.contentKey)}
        </p>

        <TourStepExtras view={view} onLeave={leaveFor} />

        <TourNavButtons isFirst={isFirst} isLast={isLast} animate={animate} onPrev={prevStep} onForward={isLast ? completeTour : nextStep} />

        {/* For a keyboard: index.html hides it on touch-only devices. */}
        <p
          aria-hidden="true"
          className="tour-keyboard-hint"
          style={{ margin: `${theme.spacing.sm}px 0 0`, fontSize: '0.72rem', color: theme.colors.muted, textAlign: 'center', letterSpacing: '0.01em' }}
        >
          {t('tour.keyboardHint', '← → navigate · Esc pause')}
        </p>
      </div>
    </>
  );
}
