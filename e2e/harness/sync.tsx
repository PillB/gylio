// Test page for e2e/sync-*.spec.ts. It mounts the real task screen, the real sync status note and Settings section,
// and starts the real sync (src/core/sync/appSync.ts) the way SyncRoot does, with one difference: it is "signed in"
// as a fixed test person, because the sign-in service cannot be reached from a test. Not part of the production build.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../src/i18n/i18n.js';
import { ThemeProvider } from '../../src/core/context/ThemeContext';
import { ToastProvider } from '../../src/core/context/ToastContext';
import { TaskTimerProvider } from '../../src/core/context/TaskTimerContext';
import { GuidedTourProvider } from '../../src/core/context/GuidedTourContext';
import { AccessibilityProvider } from '../../src/core/hooks/useAccessibility';
import { OnboardingFlowProvider } from '../../src/hooks/useOnboardingFlow.jsx';
import TaskList from '../../src/features/tasks/components/TaskList';
import { SyncProvider } from '../../src/core/sync/SyncContext';
import { SyncSettingsSection, SyncStatusChip } from '../../src/components/SyncStatus';
import { startAppSync } from '../../src/core/sync/appSync';
import type { SyncEngine } from '../../src/core/sync/engine';

const params = new URLSearchParams(window.location.search);
const person = params.get('person') ?? 'user_e2e';

function Harness() {
  const [engine, setEngine] = React.useState<SyncEngine | null>(null);
  React.useEffect(() => {
    let stop: (() => void) | null = null;
    startAppSync({
      baseUrl: '',
      getAuth: async () => ({ token: 'e2e-token', userId: person }),
      scanDelayMs: 200,
      tuning: { debounceMs: 400, maxWaitMs: 2000 },
    }).then((sync) => {
      stop = sync.stop;
      (window as unknown as { __sync: unknown }).__sync = sync;
      setEngine(sync.engine);
    });
    return () => stop?.();
  }, []);
  return (
    <SyncProvider engine={engine}>
      <SyncStatusChip delayMs={1500} />
      <TaskList />
      <SyncSettingsSection />
    </SyncProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <I18nextProvider i18n={i18n}>
    <ThemeProvider>
      <ToastProvider>
        <TaskTimerProvider>
          <GuidedTourProvider>
            <OnboardingFlowProvider>
              <AccessibilityProvider>
                <MemoryRouter>
                  <Harness />
                </MemoryRouter>
              </AccessibilityProvider>
            </OnboardingFlowProvider>
          </GuidedTourProvider>
        </TaskTimerProvider>
      </ToastProvider>
    </ThemeProvider>
  </I18nextProvider>,
);
