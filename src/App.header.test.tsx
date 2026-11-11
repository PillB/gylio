/**
 * The header in the real app: every page has one page title (the app name on the tabs, the page's own title where it
 * has one), and the header's wide-screen controls follow the window when it is resized or a tablet is turned.
 */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n, { ready as languageReady } from './i18n/i18n.js';

// The language file arrives after the module loads; render only once it has.
beforeAll(() => languageReady);

// Stand-ins that open with a title, as the real pages do: this file checks the header around them.
vi.mock('./features/subscription/PricingPage', () => ({ default: () => <h1>Pricing title</h1> }));
vi.mock('./features/legal/LegalPage', () => ({ default: ({ doc }: { doc: string }) => <h1>{`${doc} title`}</h1> }));
vi.mock('./features/feedback/QaPage', () => ({ default: () => <h1>Report title</h1> }));
vi.mock('./features/admin/AdminPage', () => ({ default: () => <h1>Admin title</h1> }));
// The account forms bring their own title (the account service draws it as a first-level heading).
vi.mock('./features/auth/SignInPage', () => ({ default: () => <h1>Sign in title</h1> }));
vi.mock('./features/auth/SignUpPage', () => ({ default: () => <h1>Sign up title</h1> }));

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

const PHONE = '(max-width: 520px)';
/** `matchMedia` whose answer for the phone width the test can change, the way a resize does. */
const media = { phone: false, listeners: new Set<() => void>() };
const resizeTo = (phone: boolean) => {
  media.phone = phone;
  media.listeners.forEach((listener) => listener());
};

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

const pageTitles = () => screen.queryAllByRole('heading', { level: 1 }).map((heading) => heading.textContent);

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('onboardingFlowState', ONBOARDED);
  await i18n.changeLanguage('en');
  // The report and admin pages, and the header's Feedback button, exist only in a build with the full server.
  vi.stubEnv('VITE_BILLING_ENABLED', 'true');
  media.phone = false;
  media.listeners.clear();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === PHONE && media.phone;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (query === PHONE) media.listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: () => void) => media.listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('one page title per page', () => {
  it.each([
    ['/pricing', 'Pricing title'],
    ['/privacy', 'privacy title'],
    ['/terms', 'terms title'],
    ['/qa', 'Report title'],
    ['/admin', 'Admin title'],
    ['/sign-in', 'Sign in title'],
    ['/sign-up', 'Sign up title'],
  ])('%s is titled by the page itself; the app name stays in the header as plain text', async (path, title) => {
    openAppAt(path);
    await screen.findByText(title);
    expect(pageTitles()).toEqual([title]);
    expect(screen.getByRole('banner').textContent).toContain('GYLIO');
  });

  it('a tab, which has no title of its own, is titled by the app name', async () => {
    openAppAt('/settings');
    await screen.findByRole('heading', { level: 2, name: 'Settings' });
    expect(pageTitles()).toEqual(['GYLIO']);
  });
});

describe('the header when the window changes width', () => {
  it('drops the Feedback button at phone width and brings it back, without a reload', async () => {
    openAppAt('/settings');
    expect(await screen.findByRole('button', { name: 'Feedback' })).toBeTruthy();
    act(() => resizeTo(true));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull());
    act(() => resizeTo(false));
    expect(await screen.findByRole('button', { name: 'Feedback' })).toBeTruthy();
  });

  it('opens without it on a phone', async () => {
    media.phone = true;
    openAppAt('/settings');
    await screen.findByRole('heading', { level: 2, name: 'Settings' });
    expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull();
  });
});
