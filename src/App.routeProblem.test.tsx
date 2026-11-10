/**
 * The real router: a link that matches no screen and a screen that fails to render both get the app's own page, not
 * the router's developer error page, and a failed tab leaves the header and the other tabs in reach.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/i18n.js';

vi.mock('./components/CalendarView.jsx', () => ({
  default: () => {
    throw new Error('calendar could not draw');
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

describe('the app when a page cannot be shown', () => {
  it('answers an unknown link inside the app shell, with a way back to Tasks', async () => {
    openAppAt('/an-old-link');
    expect(await screen.findByRole('heading', { name: 'This page does not exist' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'GYLIO' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Tasks' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Hey developer|Unexpected Application Error/);
  });

  it('keeps the header and the tabs when one tab fails to render', async () => {
    openAppAt('/calendar');
    expect(await screen.findByRole('heading', { name: 'This screen ran into a problem' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'GYLIO' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Budget' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Hey developer|Unexpected Application Error/);
  });
});
