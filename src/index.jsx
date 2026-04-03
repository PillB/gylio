import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ClerkProvider } from '@clerk/clerk-react';

import App from './App.jsx';
import { OnboardingFlowProvider } from './hooks/useOnboardingFlow.jsx';
import i18n from './i18n/i18n.js';
import { ThemeProvider } from './core/context/ThemeContext';
import { AccessibilityProvider } from './core/hooks/useAccessibility';
import { ToastProvider } from './core/context/ToastContext';
import ToastStack from './components/atoms/Toast';
import { GuidedTourProvider } from './core/context/GuidedTourContext';
import { TaskTimerProvider } from './core/context/TaskTimerContext';
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
          <GuidedTourProvider>
            <OnboardingFlowProvider>
              <AccessibilityProvider>
                <App clerkEnabled={Boolean(PUBLISHABLE_KEY)} />
                <ToastStack />
              </AccessibilityProvider>
            </OnboardingFlowProvider>
          </GuidedTourProvider>
          </TaskTimerProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);

if (PUBLISHABLE_KEY) {
  root.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {providers}
    </ClerkProvider>
  );
} else {
  root.render(providers);
}
