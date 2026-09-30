import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, UserButton } from '@clerk/clerk-react';
import NavBar from './components/NavBar.jsx';
import TaskList from './features/tasks/components/TaskList';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import SocialPlansView from './features/social/components/SocialPlansView';
import RoutinesView from './features/routines/components/RoutinesView';
import OnboardingFlow from './onboarding/OnboardingFlow.jsx';
import useOnboardingFlow from './hooks/useOnboardingFlow.jsx';
import LanguageToggle from './components/atoms/LanguageToggle.tsx';
import DateTimeWidget from './components/atoms/DateTimeWidget.tsx';
import { useTheme } from './core/context/ThemeContext';
import TintLayer from './components/TintLayer.jsx';
import useDB from './core/hooks/useDB';
import { getLocalDateKey } from './core/hooks/useClock';
import useBackgroundSync from './core/hooks/useBackgroundSync';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';
import ClerkSetupBanner from './features/auth/ClerkSetupBanner';
import { AuthProvider } from './core/context/AuthContext';
import { useSubscription } from './features/subscription/useSubscription';
import PricingPage from './features/subscription/PricingPage';
import UpgradePrompt from './features/subscription/UpgradePrompt';
import { useAppAuth } from './core/context/AuthContext';
import WelcomeBackBanner from './components/WelcomeBackBanner';
import { track, Events } from './core/analytics';
import GuidedTourOverlay from './components/GuidedTourOverlay';
import TourFlowSelector from './components/TourFlowSelector';
import { useGuidedTour } from './core/context/GuidedTourContext';
import { useDailyMode } from './features/dashboard/useDailyMode';
import DailyCommandCenter from './features/dashboard/DailyCommandCenter';
import { EntitlementProvider } from './features/billing/EntitlementContext';
import TrialBanner from './features/billing/TrialBanner';
import FeedbackButton from './features/feedback/FeedbackButton';
import QaPage from './features/feedback/QaPage';
import AdminPage from './features/admin/AdminPage';
import { installErrorCapture } from './features/feedback/diagnostics';
import { AccountSyncProvider } from './features/account/AccountSyncContext';
import SyncConflictBanner from './features/account/SyncConflictBanner';

function AppHeader({ clerkEnabled }) {
  const { t } = useTranslation();
  const { selections, updateSelections } = useOnboardingFlow();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { tourState, openSelector } = useGuidedTour();
  const isOnboarding = location.pathname === '/onboarding';
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 520px)').matches;

  const ttsEnabled = selections?.accessibility?.tts ?? false;
  const toggleTts = () => updateSelections('accessibility', { tts: !ttsEnabled });

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        flexWrap: 'wrap',
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing.lg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.shape.radiusMd,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primaryForeground,
            fontWeight: 700,
            fontSize: '0.875rem',
            boxShadow: theme.shadow.sm,
            flexShrink: 0,
          }}
        >
          G
        </div>
        <h1
          style={{
            margin: 0,
            color: theme.colors.text,
            fontFamily: theme.typography.heading.family,
            fontWeight: theme.typography.heading.weight,
            fontSize: '1.125rem',
            letterSpacing: '-0.02em',
          }}
        >
          {t('appName')}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Hidden on mobile — system status bar shows time */}
        {!isOnboarding && <span className="header-dt"><DateTimeWidget /></span>}
        {!isOnboarding && (
          <button
            type="button"
            onClick={openSelector}
            aria-label={tourState.active ? t('tour.activeAria', 'Tour active') : tourState.completed ? t('tour.restartAria', 'Restart guide') : t('tour.startAria', 'Start interactive guide')}
            title={tourState.completed ? t('tour.restartButton', 'Restart guide') : t('tour.startButton', 'Start guide')}
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              minHeight: '44px',
              border: `1px solid ${tourState.active ? theme.colors.primary : theme.colors.border}`,
              borderRadius: theme.shape.radiusFull,
              cursor: 'pointer',
              background: tourState.active ? theme.colors.overlay : 'transparent',
              color: tourState.active ? theme.colors.primary : theme.colors.muted,
              fontFamily: theme.typography.body.family,
              fontSize: '0.8125rem',
              fontWeight: tourState.active ? 600 : 400,
              transition: 'all 150ms',
            }}
          >
            ? {tourState.active ? t('tour.activeLabel', 'Guide on') : t('tour.startButton', 'Guide')}
          </button>
        )}
        <LanguageToggle placement="header" />
        {!isOnboarding && <FeedbackButton />}
        {/* Hidden on mobile — accessible from Settings */}
        {!isOnboarding && (
          <button
            type="button"
            onClick={toggleTts}
            aria-label={t('onboarding.ttsToggle.aria')}
            className="header-tts"
            style={{
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              minHeight: '36px',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusFull,
              cursor: 'pointer',
              background: ttsEnabled ? theme.colors.overlay : 'transparent',
              color: ttsEnabled ? theme.colors.primary : theme.colors.muted,
              fontFamily: theme.typography.body.family,
              fontSize: '0.8125rem',
              fontWeight: ttsEnabled ? 600 : 400,
            }}
          >
            {ttsEnabled ? '🔊' : '🔇'} {t('onboarding.accessibility.tts')}
          </button>
        )}
        {clerkEnabled && !isOnboarding && (
          <>
            {!isMobile && <SubscriptionBadge />}
            <div style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserButton afterSignOutUrl={`${import.meta.env.BASE_URL}sign-in`} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function SubscriptionBadge() {
  const { theme } = useTheme();
  const { isFree } = useSubscription();
  const { userId } = useAppAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!userId) return null;

  if (!isFree) {
    return (
      <span
        style={{
          fontSize: '0.75rem',
          padding: `${theme.spacing.xs - 2}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusFull,
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
          color: theme.colors.primaryForeground,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {t('upgrade.premiumBadge', '✦ Premium')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/pricing')}
      style={{
        fontSize: '0.75rem',
        padding: `${theme.spacing.xs - 2}px ${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusFull,
        background: theme.colors.overlay,
        color: theme.colors.primary,
        fontWeight: 600,
        border: `1px solid ${theme.colors.primary}`,
        cursor: 'pointer',
        letterSpacing: '0.01em',
      }}
    >
      {t('upgrade.upgradeCta', '✦ Upgrade')}
    </button>
  );
}

function AppLayout({ clerkEnabled }) {
  const { theme } = useTheme();

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh',
      backgroundColor: theme.colors.background,
      // Safe area: push content away from notch (top) and home indicator (bottom)
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
    }}>
      <TintLayer />
      <div
        className="app-container"
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: theme.typography.body.family,
          padding: `${theme.spacing.lg}px ${theme.spacing.xl}px`,
          maxWidth: '1100px',
          margin: '0 auto',
          color: theme.colors.text,
        }}
      >
        <AppHeader clerkEnabled={clerkEnabled} />
        <Outlet />
      </div>
      <GuidedTourOverlay />
      <TourFlowSelector />
    </div>
  );
}

function RootRedirectAuthed() {
  const { isOnboardingComplete } = useOnboardingFlow();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <Navigate to={isOnboardingComplete ? '/tasks' : '/onboarding'} replace />;
}

function RootRedirectNoAuth() {
  const { isOnboardingComplete } = useOnboardingFlow();
  return <Navigate to={isOnboardingComplete ? '/tasks' : '/onboarding'} replace />;
}

function ProtectedLayoutAuthed() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}

function ProtectedLayoutNoAuth() {
  return <Outlet />;
}

function OnboardingRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnboardingComplete } = useOnboardingFlow();
  const { theme } = useTheme();
  const { ready, getTasks, insertTask } = useDB();
  const [pendingSeed, setPendingSeed] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedStarterData = useCallback(
    async (flowSelections) => {
      const starterGoal = flowSelections?.quickSetup?.starterGoal?.trim() ?? '';
      if (!starterGoal) return;

      const existingTasks = await getTasks();
      const normalizedGoal = starterGoal.toLowerCase();
      const hasGoalTask = existingTasks.some(
        (task) => task.title.trim().toLowerCase() === normalizedGoal
      );

      if (!hasGoalTask) {
        // The destination opens on Today. Scheduling the optional starter task
        // for the user's local day keeps the onboarding promise that it will be
        // immediately visible and actionable when setup finishes.
        await insertTask(starterGoal, 'pending', [], getLocalDateKey(), null, null);
      }
    },
    [getTasks, insertTask]
  );

  const handleOnboardingComplete = useCallback((selections) => {
    setPendingSeed(selections);
  }, []);

  useEffect(() => {
    if (!pendingSeed || !ready || isSeeding) return;
    setIsSeeding(true);
    seedStarterData(pendingSeed)
      .catch((error) => {
        console.error('Failed to seed onboarding data', error);
      })
      .finally(() => {
        setIsSeeding(false);
        setPendingSeed(null);
        navigate('/tasks', { replace: true });
      });
  }, [isSeeding, navigate, pendingSeed, ready, seedStarterData]);

  if (isOnboardingComplete && !pendingSeed && !isSeeding) {
    return <Navigate to="/tasks" replace />;
  }

  return (
    <section style={{ marginTop: theme.spacing.lg }}>
      <p style={{ color: theme.colors.muted }}>{t('onboarding.intro')}</p>
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    </section>
  );
}

function TabsLayout() {
  const { t } = useTranslation();
  const { isOnboardingComplete } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { hasFeature } = useSubscription();

  const navItems = useMemo(
    () => [
      { key: 'tasks', label: t('tasks.title'), locked: false },
      { key: 'calendar', label: t('calendar'), locked: false },
      { key: 'budget', label: t('budget.title'), locked: false },
      { key: 'social', label: t('social.title'), locked: !hasFeature('social') },
      { key: 'routines', label: t('routines.title'), locked: !hasFeature('routines') },
      { key: 'rewards', label: t('rewards.title'), locked: !hasFeature('rewards') },
      { key: 'settings', label: t('settings'), locked: false },
    ],
    [t, hasFeature]
  );

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div style={{ marginTop: theme.spacing.sm }}>
      <NavBar
        items={navItems}
        activeKey={location.pathname.replace('/', '') || 'tasks'}
        onNavigate={(key) => navigate(`/${key}`)}
      />
      <main>
        <WelcomeBackBanner />
        <SyncConflictBanner />
        <TrialBanner />
        <Outlet />
      </main>
    </div>
  );
}

function ClerkSetupScreen() {
  const { theme } = useTheme();
  return (
    <div
      style={{
        fontFamily: theme.typography.body.family,
        padding: theme.spacing.xl,
        maxWidth: '1100px',
        margin: '0 auto',
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          margin: `0 0 ${theme.spacing.lg}px`,
          color: theme.colors.text,
          fontFamily: theme.typography.heading.family,
        }}
      >
        GYLIO
      </h1>
      <ClerkSetupBanner />
    </div>
  );
}

// --- Premium gate ---

const PREMIUM_GATE_CONFIG = {
  social: (t) => ({
    featureName: t('social.title'),
    outcomes: [
      t('upgrade.social.outcome1', 'Share your streaks and wins with friends'),
      t('upgrade.social.outcome2', 'Join accountability groups and group challenges'),
    ],
    freeAlternative: t('upgrade.social.freeAlt', 'track your own progress privately'),
  }),
  routines: (t) => ({
    featureName: t('routines.title'),
    outcomes: [
      t('upgrade.routines.outcome1', 'Build unlimited morning, evening, and custom routines'),
      t('upgrade.routines.outcome2', 'Get gentle nudges timed to your energy levels'),
    ],
    freeAlternative: t('upgrade.routines.freeAlt', 'add up to 3 tasks to your daily routine'),
  }),
  rewards: (t) => ({
    featureName: t('rewards.title'),
    outcomes: [
      t('upgrade.rewards.outcome1', 'Create your own custom rewards and milestones'),
      t('upgrade.rewards.outcome2', 'Unlock animated celebrations for big achievements'),
    ],
    freeAlternative: t('upgrade.rewards.freeAlt', 'earn the three built-in milestone badges'),
  }),
};

function PremiumGate({ feature }) {
  const { hasFeature } = useSubscription();
  const { t } = useTranslation();
  if (!hasFeature(feature)) {
    const config = PREMIUM_GATE_CONFIG[feature]?.(t) ?? { featureName: feature };
    return <UpgradePrompt {...config} />;
  }
  return <Outlet />;
}

// --- Daily Mode task route ---

function TasksRoute() {
  const { dailyMode, setDailyMode } = useDailyMode();
  if (dailyMode) {
    return <DailyCommandCenter onExitSimplified={() => setDailyMode(false)} />;
  }
  return <TaskList />;
}

// --- Router builders ---

function buildAuthRouter(clerkEnabled) {
  const premiumRoutes = [
    {
      path: 'social',
      element: <PremiumGate feature="social" />,
      children: [{ index: true, element: <SocialPlansView /> }],
    },
    {
      path: 'routines',
      element: <PremiumGate feature="routines" />,
      children: [{ index: true, element: <RoutinesView /> }],
    },
    {
      path: 'rewards',
      element: <PremiumGate feature="rewards" />,
      children: [{ index: true, element: <RewardsView /> }],
    },
  ];

  return createBrowserRouter(
    [
      {
        path: '/',
        element: <AppLayout clerkEnabled={clerkEnabled} />,
        children: [
          { index: true, element: clerkEnabled ? <RootRedirectAuthed /> : <RootRedirectNoAuth /> },
          { path: 'sign-in/*', element: <SignInPage /> },
          { path: 'sign-up/*', element: <SignUpPage /> },
          { path: 'pricing', element: <PricingPage /> },
          {
            element: clerkEnabled ? <ProtectedLayoutAuthed /> : <ProtectedLayoutNoAuth />,
            children: [
              { path: 'onboarding', element: <OnboardingRoute /> },
              { path: 'qa', element: <QaPage /> },
              { path: 'admin', element: <AdminPage /> },
              {
                element: <TabsLayout />,
                children: [
                  { path: 'tasks', element: <TasksRoute /> },
                  { path: 'calendar', element: <CalendarView /> },
                  { path: 'budget', element: <BudgetView /> },
                  ...premiumRoutes,
                  { path: 'settings', element: <SettingsView /> },
                ],
              },
            ],
          },
        ],
      },
    ],
    { basename: import.meta.env.BASE_URL, future: { v7_startTransition: true } }
  );
}

function AppRouterAuthed() {
  const { hydrated } = useOnboardingFlow();
  const router = useMemo(() => buildAuthRouter(true), []);
  if (!hydrated) return null;
  return (
    <AuthProvider clerkEnabled={true}>
      <EntitlementProvider>
        <AccountSyncProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </AccountSyncProvider>
      </EntitlementProvider>
    </AuthProvider>
  );
}

function AppRouterNoAuth() {
  const { hydrated } = useOnboardingFlow();
  const router = useMemo(() => buildAuthRouter(false), []);
  if (!hydrated) return null;
  return (
    <AuthProvider clerkEnabled={false}>
      <EntitlementProvider>
        <AccountSyncProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </AccountSyncProvider>
      </EntitlementProvider>
    </AuthProvider>
  );
}

export default function App({ clerkEnabled = false }) {
  const { paperTheme } = useTheme();
  useBackgroundSync();

  React.useEffect(() => {
    installErrorCapture();
    track(Events.APP_OPEN, { clerkEnabled });
  }, []);

  if (!clerkEnabled) {
    return (
      <PaperProvider theme={paperTheme}>
        <AppRouterNoAuth />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <AppRouterAuthed />
    </PaperProvider>
  );
}
