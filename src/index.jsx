// First: finishes "remove my data from this device" before anything below reads storage.
import './core/account/removeOnStart';
import './styles/fonts.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ClerkProvider } from '@clerk/clerk-react';

import App from './App.jsx';
import { OnboardingFlowProvider } from './hooks/useOnboardingFlow.jsx';
import i18n, { ready as languageReady } from './i18n/i18n.js';
import StartProblem from './i18n/StartProblem.jsx';
import { ThemeProvider } from './core/context/ThemeContext';
import { AccessibilityProvider } from './core/hooks/useAccessibility';
import { ToastProvider } from './core/context/ToastContext';
import ToastStack from './components/atoms/Toast';
import LegalFooter from './features/legal/LegalFooter';
import { GuidedTourProvider } from './core/context/GuidedTourContext';
import { TaskTimerProvider } from './core/context/TaskTimerContext';
import { TimeTrackerProvider } from './features/timetracking/TimeTrackerContext';
import TimeTrackerBar from './features/timetracking/components/TimeTrackerBar';
import { registerServiceWorker } from './core/utils/serviceWorker';

registerServiceWorker();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Render the application at the #root element defined in index.html.
// ClerkProvider is conditionally included: when VITE_CLERK_PUBLISHABLE_KEY is set,
// full auth is enabled; otherwise the app renders with a setup banner.
const root = ReactDOM.createRoot(document.getElementById('root'));

const providers = (
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ToastProvider>
          <TaskTimerProvider>
            <TimeTrackerProvider>
            <TimeTrackerBar />
            <GuidedTourProvider>
              <OnboardingFlowProvider>
                <AccessibilityProvider>
                  <App clerkEnabled={Boolean(PUBLISHABLE_KEY)} />
                  <LegalFooter />
                  <ToastStack />
                </AccessibilityProvider>
              </OnboardingFlowProvider>
            </GuidedTourProvider>
            </TimeTrackerProvider>
          </TaskTimerProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);

const app = PUBLISHABLE_KEY ? <ClerkProvider publishableKey={PUBLISHABLE_KEY}>{providers}</ClerkProvider> : providers;

// The text for the person's language is fetched on its own (src/i18n/catalogs.js). The app is drawn once it is in,
// so no screen shows keys in place of words; if it cannot be fetched, a plain page offers a reload.
languageReady.then(
  () => root.render(app),
  () => root.render(<StartProblem />)
);
