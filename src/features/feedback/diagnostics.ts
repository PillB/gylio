/**
 * diagnostics — the technical details a bug report can include, gathered only
 * when the reporter leaves "include technical details" ticked, and shown to
 * them before sending. Recent errors are kept in memory only (never stored).
 */

const MAX_ERRORS = 10;
const MAX_LENGTH = 300;
const recentErrors: string[] = [];
let installed = false;

const remember = (message: unknown) => {
  const text = String(message instanceof Error ? message.message : message ?? '').slice(0, MAX_LENGTH);
  if (!text) return;
  recentErrors.push(text);
  if (recentErrors.length > MAX_ERRORS) recentErrors.shift();
};

export function installErrorCapture(target: Window = window) {
  if (installed) return;
  installed = true;
  target.addEventListener('error', (event) => remember(event.error ?? event.message));
  target.addEventListener('unhandledrejection', (event) => remember(event.reason));
}

export const getRecentErrors = () => [...recentErrors];

export type Diagnostics = {
  userAgent: string;
  viewport: string;
  locale: string;
  timezone: string;
  theme: string;
  online: boolean;
  appVersion: string;
  buildMode: string;
  consoleErrors: string[];
};

export function collectDiagnostics(themeMode: string, locale: string): Diagnostics {
  return {
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: themeMode,
    online: navigator.onLine,
    appVersion: import.meta.env.VITE_APP_VERSION ?? 'dev',
    buildMode: import.meta.env.MODE,
    consoleErrors: getRecentErrors(),
  };
}
