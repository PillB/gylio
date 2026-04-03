import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { useGuidedTour } from '../core/context/GuidedTourContext';
import { TOUR_STEPS } from '../features/tour/tourSteps';

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 14;
const SPOTLIGHT_PAD = 8;

export default function GuidedTourOverlay() {
  const { tourState, nextStep, prevStep, pauseTour, completeTour, totalSteps } = useGuidedTour();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pendingNav = useRef(false);

  const stepIndex = tourState.stepIndex;
  const isActive = tourState.active;
  const currentStep = isActive ? (TOUR_STEPS[stepIndex] ?? null) : null;
  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  // Navigate to the correct tab then locate target element
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const locate = () => {
      if (cancelled) return;
      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(currentStep.target);
      if (!el) {
        setTargetRect(null);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to settle before measuring
      const t2 = setTimeout(() => {
        if (cancelled) return;
        const el2 = document.querySelector<HTMLElement>(currentStep.target!);
        setTargetRect(el2?.getBoundingClientRect() ?? null);
      }, 280);
      return () => clearTimeout(t2);
    };

    if (currentStep.tab) {
      const expected = `/${currentStep.tab}`;
      if (location.pathname !== expected && !pendingNav.current) {
        pendingNav.current = true;
        navigate(expected);
        // Give router time to mount the new tab before querying elements
        const t1 = setTimeout(() => {
          pendingNav.current = false;
          locate();
        }, 350);
        return () => {
          cancelled = true;
          clearTimeout(t1);
        };
      }
    }

    locate();
    return () => { cancelled = true; };
  }, [stepIndex, isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep rect in sync on scroll / resize
  useEffect(() => {
    if (!isActive || !currentStep?.target) return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(currentStep.target!);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isActive, currentStep?.target]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); pauseTour(); }
      if (e.key === 'ArrowRight' && !isLast) { e.preventDefault(); nextStep(); }
      if (e.key === 'ArrowLeft' && !isFirst) { e.preventDefault(); prevStep(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isActive, isLast, isFirst, pauseTour, nextStep, prevStep]);

  if (!isActive || !currentStep) return null;

  // ---- Tooltip position ----
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const isCenter = currentStep.placement === 'center' || !targetRect;

  let tooltipStyle: React.CSSProperties;

  if (isCenter) {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(TOOLTIP_WIDTH, vw - 32),
      zIndex: 8001,
    };
  } else {
    const spaceBelow = vh - (targetRect?.bottom ?? 0);
    const useBottom =
      currentStep.placement !== 'top' ? spaceBelow >= 180 : (targetRect?.top ?? 0) < 180;

    let top: number;
    if (useBottom) {
      top = (targetRect?.bottom ?? 0) + TOOLTIP_GAP;
    } else {
      top = (targetRect?.top ?? 0) - TOOLTIP_GAP - 230;
    }

    let left = (targetRect?.left ?? 0) + (targetRect?.width ?? 0) / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
    top = Math.max(12, Math.min(top, vh - 230 - 12));

    tooltipStyle = { position: 'fixed', top, left, width: TOOLTIP_WIDTH, zIndex: 8001 };
  }

  // ---- Arrow direction for tooltip ----
  const arrowStyle: React.CSSProperties | null =
    !isCenter && targetRect
      ? (() => {
          const tipLeft = (tooltipStyle.left as number) ?? 0;
          const tipTop = (tooltipStyle.top as number) ?? 0;
          const isBelow = tipTop > (targetRect?.bottom ?? 0);
          const arrowLeft = Math.max(
            16,
            Math.min(
              (targetRect.left + targetRect.width / 2) - (tipLeft),
              TOOLTIP_WIDTH - 16
            )
          );
          return {
            position: 'absolute' as const,
            left: arrowLeft,
            width: 12,
            height: 8,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            ...(isBelow
              ? { top: -8, borderBottom: `8px solid ${theme.colors.surfaceElevated}` }
              : { bottom: -8, borderTop: `8px solid ${theme.colors.surfaceElevated}` }),
          };
        })()
      : null;

  return (
    <>
      {/* Spotlight — visual highlight ring + backdrop, pointer-events:none so everything stays interactive */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: targetRect.top - SPOTLIGHT_PAD,
            left: targetRect.left - SPOTLIGHT_PAD,
            width: targetRect.width + SPOTLIGHT_PAD * 2,
            height: targetRect.height + SPOTLIGHT_PAD * 2,
            borderRadius: 10,
            boxShadow: `0 0 0 3px ${theme.colors.primary}, 0 0 0 9999px rgba(0,0,0,0.48)`,
            pointerEvents: 'none',
            zIndex: 8000,
            transition: 'top 250ms ease-out, left 250ms ease-out, width 250ms ease-out, height 250ms ease-out',
          }}
        />
      )}

      {/* Center modal backdrop */}
      {isCenter && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.52)',
            zIndex: 8000,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={t('tour.dialogAria', 'Feature tour')}
        style={{
          ...tooltipStyle,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.shape.radiusLg,
          boxShadow: theme.shadow.xl,
          border: `1px solid ${theme.colors.borderStrong}`,
          padding: `${theme.spacing.md}px`,
          fontFamily: theme.typography.body.family,
          color: theme.colors.text,
        }}
      >
        {/* Arrow pointer */}
        {arrowStyle && <div aria-hidden="true" style={arrowStyle} />}

        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <span
            style={{ fontSize: '0.75rem', color: theme.colors.muted, fontWeight: 600 }}
          >
            {t('tour.stepOf', { current: stepIndex + 1, total: totalSteps })}
          </span>
          <button
            type="button"
            onClick={pauseTour}
            aria-label={t('tour.pauseAria', 'Pause tour')}
            style={{
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

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={t('tour.progressAria', 'Tour progress')}
          style={{ display: 'flex', gap: 4, marginBottom: theme.spacing.md }}
        >
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                backgroundColor: i <= stepIndex ? theme.colors.primary : theme.colors.border,
                transition: 'background-color 250ms',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <h3
          style={{
            margin: `0 0 ${theme.spacing.xs}px`,
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: theme.typography.heading.family,
            color: theme.colors.text,
          }}
        >
          {t(currentStep.titleKey)}
        </h3>
        <p
          style={{
            margin: `0 0 ${theme.spacing.md}px`,
            fontSize: '0.875rem',
            color: theme.colors.muted,
            lineHeight: 1.55,
          }}
        >
          {t(currentStep.contentKey)}
        </p>

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.sm,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={prevStep}
            disabled={isFirst}
            aria-label={t('tour.prevAria', 'Previous step')}
            style={{
              padding: `6px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusMd,
              border: `1px solid ${theme.colors.border}`,
              background: 'transparent',
              color: isFirst ? theme.colors.muted : theme.colors.text,
              cursor: isFirst ? 'default' : 'pointer',
              fontSize: '0.875rem',
              fontFamily: theme.typography.body.family,
              opacity: isFirst ? 0.4 : 1,
              transition: 'opacity 150ms',
            }}
          >
            ← {t('tour.prev', 'Back')}
          </button>

          <button
            type="button"
            onClick={isLast ? completeTour : nextStep}
            aria-label={isLast ? t('tour.finishAria', 'Finish tour') : t('tour.nextAria', 'Next step')}
            style={{
              padding: `6px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusMd,
              border: 'none',
              background: theme.colors.primary,
              color: theme.colors.primaryForeground,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: theme.typography.body.family,
            }}
          >
            {isLast ? `${t('tour.finish', 'Done!')} ✓` : `${t('tour.next', 'Next')} →`}
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          aria-hidden="true"
          style={{
            margin: `${theme.spacing.sm}px 0 0`,
            fontSize: '0.72rem',
            color: theme.colors.muted,
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
        >
          {t('tour.keyboardHint', '← → navigate · Esc pause')}
        </p>
      </div>
    </>
  );
}
