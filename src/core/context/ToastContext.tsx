/**
 * ToastContext — lightweight global notification system.
 *
 * Research basis:
 * - Forgiving UX: undo/grace-period toasts reduce fear of mistakes (NN/g, 2024)
 * - Non-intrusive: bottom positioning, 4s default, auto-dismiss
 * - Accessibility: role="status" + aria-live="polite" for non-critical; "alert" for errors
 * - Duration: 4-6s optimal per research (long enough to read + act, short enough to not annoy)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // ms
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (opts: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  /** Convenience: success toast with optional undo action */
  success: (message: string, action?: ToastAction, duration?: number) => string;
  /** Convenience: error toast (longer duration) */
  error: (message: string, duration?: number) => string;
  /** Convenience: info toast */
  info: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (opts: Omit<ToastItem, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { ...opts, id };
      setToasts((prev) => [...prev.slice(-4), item]); // max 5 toasts at once

      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, opts.duration);

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, action?: ToastAction, duration = 4500): string =>
      showToast({ message, type: 'success', duration, action }),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration = 6000): string =>
      showToast({ message, type: 'error', duration }),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration = 4000): string =>
      showToast({ message, type: 'info', duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, info }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
