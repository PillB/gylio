import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { useGuidedTour, ALL_FLOWS } from '../core/context/GuidedTourContext';
import useDialogFocus from '../core/hooks/useDialogFocus';

export default function TourFlowSelector() {
  const { showSelector, closeSelector, startFlow } = useGuidedTour();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, showSelector);

  // Close on Escape
  useEffect(() => {
    if (!showSelector) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSelector(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [showSelector, closeSelector]);

  if (!showSelector) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeSelector}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.54)',
          zIndex: 9000,
        }}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.selector.title', 'Choose your guide')}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.shape.radiusLg,
          boxShadow: theme.shadow.xl,
          border: `1px solid ${theme.colors.borderStrong}`,
          padding: `${theme.spacing.lg}px`,
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          fontFamily: theme.typography.body.family,
          color: theme.colors.text,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 700,
                fontFamily: theme.typography.heading.family,
                color: theme.colors.text,
              }}
            >
              {t('tour.selector.title', 'Choose your guide')}
            </h2>
            <p style={{ margin: `${theme.spacing.xs}px 0 0`, fontSize: '0.875rem', color: theme.colors.muted }}>
              {t('tour.selector.subtitle', 'Start the quick overview or go deep on any section')}
            </p>
          </div>
          <button
            type="button"
            onClick={closeSelector}
            aria-label={t('tour.selector.close', 'Close')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.muted,
              fontSize: '1.2rem',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: theme.shape.radiusSm,
              flexShrink: 0,
              marginLeft: theme.spacing.sm,
            }}
          >
            ×
          </button>
        </div>

        {/* Flow cards */}
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          {ALL_FLOWS.map((flow, i) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => startFlow(flow.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                borderRadius: theme.shape.radiusMd,
                border: `1px solid ${i === 0 ? theme.colors.primary : theme.colors.border}`,
                background: i === 0 ? `${theme.colors.primary}0d` : theme.colors.surface,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 150ms, background 150ms',
                fontFamily: theme.typography.body.family,
                color: theme.colors.text,
              }}
            >
              {/* Emoji */}
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{flow.emoji}</span>

              {/* Text */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: theme.colors.text }}>
                  {t(flow.nameKey)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: theme.colors.muted, marginTop: 2 }}>
                  {t(flow.descKey)}
                </div>
              </div>

              {/* Duration + arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: theme.colors.muted,
                    background: theme.colors.overlay,
                    borderRadius: theme.shape.radiusFull,
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t(flow.durationKey)}
                </span>
                <span style={{ color: i === 0 ? theme.colors.primary : theme.colors.muted, fontSize: '0.875rem' }}>
                  {t('tour.selector.start', 'Start')} →
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <p
          style={{
            margin: `${theme.spacing.md}px 0 0`,
            fontSize: '0.75rem',
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          {t('tour.selector.hint', 'Press Esc to close · You can restart any guide from Settings')}
        </p>
      </div>
    </>
  );
}
