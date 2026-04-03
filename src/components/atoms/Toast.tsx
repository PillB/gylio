/**
 * Toast — visual notification stack rendered at bottom of viewport.
 * Consumes ToastContext; mount once near the app root.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../core/context/ThemeContext';
import { useToast, type ToastItem, type ToastType } from '../../core/context/ToastContext';

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '', border: '', icon: '✓' },
  error:   { bg: '', border: '', icon: '✕' },
  warning: { bg: '', border: '', icon: '⚠' },
  info:    { bg: '', border: '', icon: 'ℹ' },
};

const ToastEntry: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setVisible(false);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 280);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const colorMap: Record<ToastType, string> = {
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
    info: theme.colors.primary,
  };
  const accent = colorMap[toast.type];
  const icon = TYPE_COLORS[toast.type].icon;

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: theme.shape.radiusMd,
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: theme.shadow.md,
        fontFamily: theme.typography.body.family,
        fontSize: '0.875rem',
        color: theme.colors.text,
        maxWidth: 380,
        width: '100%',
        transition: 'opacity 250ms ease, transform 280ms cubic-bezier(0.34,1.56,0.64,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        pointerEvents: 'auto',
      }}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: `${accent}22`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>

      {/* Action button (e.g. Undo) */}
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); dismiss(); }}
          style={{
            padding: '3px 10px',
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${accent}`,
            background: 'transparent',
            color: accent,
            fontFamily: theme.typography.body.family,
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss × */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          color: theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.875rem',
          padding: 0,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};

/** Mount this once near the app root (inside ThemeProvider + ToastProvider). */
const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
        width: '100%',
        maxWidth: 420,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {toasts.map((toast) => (
        <ToastEntry key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default ToastStack;
