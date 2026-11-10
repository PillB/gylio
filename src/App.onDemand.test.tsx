/**
 * Pages most visits never open (pricing, the legal texts) are downloaded when first opened. With the real router:
 * the page appears once it has loaded, and one whose file is gone after a deploy says an update is ready instead of
 * showing a broken screen.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n, { ready as languageReady } from './i18n/i18n.js';

// The language file arrives after the module loads; render only once it has.
beforeAll(() => languageReady);

vi.mock('./features/subscription/PricingPage', () => ({
  default: () => {
    // What Chromium reports when a screen's file was replaced by a newer build.
    throw new TypeError('Failed to fetch dynamically imported module: https://example.test/assets/PricingPage-abc.js');
  },
}));

import App from './App.jsx';
import { OnboardingFlowProvider } from './hooks/useOnboardingFlow.jsx';
import { ThemeProvider } from './core/context/ThemeContext';
import { AccessibilityProvider } from './core/hooks/useAccessibility';
import { ToastProvider } from './core/context/ToastContext';
import { GuidedTourProvider } from './core/context/GuidedTourContext';
import { TaskTimerProvider } from './core/context/TaskTimerContext';
import { TimeTrackerProvider } from './features/timetracking/TimeTrackerContext';

const ONBOARDED = JSON.stringify({
  isOnboardingComplete: true,
  currentStep: 4,
  selections: {
    accessibility: { textStyle: 'normal', contrast: 'default', motion: 'reduced', animations: false, tts: false },
    neurodivergence: { preset: 'none', supports: [] },
    quickSetup: { starterGoal: '', monthlyBudget: '' },
    tour: { acknowledged: true, reminders: false },
  },
});

const openAppAt = (path: string) => {
  window.history.replaceState(null, '', path);
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ToastProvider>
          <TaskTimerProvider>
            <TimeTrackerProvider>
              <GuidedTourProvider>
                <OnboardingFlowProvider>
                  <AccessibilityProvider>
                    <App clerkEnabled={false} />
                  </AccessibilityProvider>
                </OnboardingFlowProvider>
              </GuidedTourProvider>
            </TimeTrackerProvider>
          </TaskTimerProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );
};

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('onboardingFlowState', ONBOARDED);
  await i18n.changeLanguage('en');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('pages loaded on demand', () => {
  it('opens the Privacy Policy once its file has loaded', async () => {
    openAppAt('/privacy');
    expect(await screen.findByRole('heading', { level: 1, name: /privacy policy/i })).toBeTruthy();
    expect(screen.queryByRole('status', { name: '' })?.textContent ?? '').not.toContain('Loading');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeTruthy();
  });

  it('opens the Terms in Spanish for someone using the app in Spanish', async () => {
    await i18n.changeLanguage('es-PE');
    openAppAt('/terms');
    expect(await screen.findByRole('heading', { level: 1, name: /términos/i })).toBeTruthy();
  });

  it('says an update is ready when a page file is gone after a deploy', async () => {
    openAppAt('/pricing');
    expect(await screen.findByRole('heading', { name: 'A newer version is ready' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Hey developer|Unexpected Application Error|dynamically imported/);
  });
});
