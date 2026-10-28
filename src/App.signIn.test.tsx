/**
 * The real app with sign-in switched on, and Clerk stood in for: what a person sees while sign-in is checked, offline,
 * and when a different account signs in on a device that holds someone else's data.
 */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/i18n.js';
import { OWNER_KEY, OWNER_SIGNED_IN_KEY } from './core/account/deviceOwner';
import { QUIET_MS } from './core/account/accountGate';

const auth = {
  isLoaded: false as boolean,
  isSignedIn: false as boolean,
  userId: null as string | null,
  getToken: vi.fn(async () => null as string | null),
  signOut: vi.fn(async () => undefined),
};
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => auth,
  useUser: () => ({ isLoaded: auth.isLoaded, isSignedIn: auth.isSignedIn, user: null }),
  useClerk: () => ({ signOut: auth.signOut }),
  UserButton: Object.assign(() => null, { MenuItems: () => null, Action: () => null, Link: () => null }),
  SignIn: () => <p>sign-in form</p>,
  SignUp: () => <p>sign-up form</p>,
}));
vi.mock('react-native-paper', () => ({ Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import App, { serverOnlyRoutes } from './App.jsx';
import { Navigate } from 'react-router-dom';
import QaPage from './features/feedback/QaPage';
import AdminPage from './features/admin/AdminPage';
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

const mountApp = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ToastProvider>
          <TaskTimerProvider>
            <TimeTrackerProvider>
              <GuidedTourProvider>
                <OnboardingFlowProvider>
                  <AccessibilityProvider>
                    <App clerkEnabled />
                  </AccessibilityProvider>
                </OnboardingFlowProvider>
              </GuidedTourProvider>
            </TimeTrackerProvider>
          </TaskTimerProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );

const setOnline = (online: boolean) => Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
let reload: ReturnType<typeof vi.fn>;
// The page's own address, kept before any test stands a copy in for it (to watch reload).
const realLocation = window.location;

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('onboardingFlowState', ONBOARDED);
  await i18n.changeLanguage('en');
  Object.assign(auth, { isLoaded: false, isSignedIn: false, userId: null });
  reload = vi.fn();
  // Open on /tasks itself: a copy made before the address changes would start the app on / and send it through an
  // in-app redirect, which on Node 24 fails in jsdom (the router's Request rejects jsdom's AbortSignal).
  window.history.replaceState(null, '', '/tasks');
  Object.defineProperty(window, 'location', { value: { ...realLocation, reload }, writable: true, configurable: true });
  setOnline(true);
  // jsdom has no matchMedia; the header asks it for the phone layout.
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
  setOnline(true);
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('the app while sign-in is checked', () => {
  it("opens the tasks of the person who was signed in, straight away, when the device is offline", async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
    setOnline(false);
    mountApp();
    await waitFor(() => expect(document.querySelector('#new-task')).not.toBeNull(), { timeout: 3000 });
    expect(screen.queryByText('Checking your sign-in…')).toBeNull();
  });

  it('says sign-in needs a connection, and shows no data, after the owner signed out', async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'false');
    setOnline(false);
    mountApp();
    expect(await screen.findByText("You're offline. Sign-in will finish when you're back online.", {}, { timeout: QUIET_MS + 2000 })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('a different account signing in on this device', () => {
  it("sets the previous person's data aside and reloads before any screen shows it", async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem('gylio_sqlite', JSON.stringify({ tasks: { rows: [{ id: 1, title: 'A: pay rent' }], nextId: 2 } }));
    Object.assign(auth, { isLoaded: true, isSignedIn: true, userId: 'user_b' });
    mountApp();
    await act(async () => undefined);
    expect(reload).toHaveBeenCalled();
    expect(screen.queryByText('A: pay rent')).toBeNull();
    expect(localStorage.getItem('gylio_sqlite')).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
  });
});

describe('a build without the full server (the Cloudflare site, GitHub Pages)', () => {
  const openSignedInOffline = async () => {
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem(OWNER_SIGNED_IN_KEY, 'true');
    setOnline(false);
    mountApp();
    await waitFor(() => expect(document.querySelector('#new-task')).not.toBeNull(), { timeout: 3000 });
  };

  it('shows no Feedback button, since a report could not be sent', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    await openSignedInOffline();
    expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull();
  });

  it('shows it in a build with the server', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    await openSignedInOffline();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeTruthy();
  });

  it('sends an old link to the report or admin page to Tasks, and opens them in a build with the server', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    const off = serverOnlyRoutes();
    expect(off.map((route) => route.path)).toEqual(['qa', 'admin']);
    off.forEach((route) => {
      expect(route.element.type).toBe(Navigate);
      expect(route.element.props.to).toBe('/tasks');
    });
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    expect(serverOnlyRoutes().map((route) => route.element.type)).toEqual([QaPage, AdminPage]);
  });
});
