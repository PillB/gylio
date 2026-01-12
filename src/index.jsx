import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import App from './App.jsx';
import { OnboardingFlowProvider } from './hooks/useOnboardingFlow.jsx';
import i18n from './i18n/i18n.js';
import { ThemeProvider } from './core/context/ThemeContext';
import { AccessibilityProvider } from './core/hooks/useAccessibility';
import { registerServiceWorker } from './core/utils/serviceWorker';

registerServiceWorker();

// Render the application at the #root element defined in index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <OnboardingFlowProvider>
          <AccessibilityProvider>
            <App />
          </AccessibilityProvider>
        </OnboardingFlowProvider>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
