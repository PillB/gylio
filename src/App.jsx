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
import { getDefaultBudgetMonth } from './core/utils/date';
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

// --- Header ---

function AppHeader({ clerkEnabled }) {
  const { t } = useTranslation();
  const { selections, updateSelections } = useOnboardingFlow();
  const { theme } = useTheme();
  const navigate = useNavigate();

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
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.shape.radiusMd,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, #8B5CF6 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
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

      {/* Controls */}
      <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        <DateTimeWidget />
        <LanguageToggle placement="header" />
        <button
          type="button"
          onClick={toggleTts}
          aria-label={t('onboarding.ttsToggle.aria')}
          style={{
            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
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
        {clerkEnabled && (
          <>
            <SubscriptionBadge />
            <UserButton afterSignOutUrl={`${import.meta.env.BASE_URL}sign-in`} />
          </>
        )}
      </div>
    </header>
  );
}

// --- Subscription badge in header ---

function SubscriptionBadge() {
  const { theme } = useTheme();
  const { isFree } = useSubscription();
  const { userId } = useAppAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Don't show when signed out
  if (!userId) return null;

  if (!isFree) {
    return (
      <span
        style={{
          fontSize: '0.75rem',
          padding: `${theme.spacing.xs - 2}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusFull,
          background: `linear-gradient(135deg, ${theme.colors.primary}, #8B5CF6)`,
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        ✦ {t('upgrade.premiumBadge', 'Premium')}
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
      ✦ {t('upgrade.upgradeCta', 'Upgrade')}
    </button>
  );
}

// --- Layout wrapper ---

function AppLayout({ clerkEnabled }) {
  const { theme } = useTheme();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: theme.colors.background }}>
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
    </div>
  );
}

// --- Root redirect (with Clerk) ---

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

// --- Protected layout (with Clerk) ---

function ProtectedLayoutAuthed() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}

function ProtectedLayoutNoAuth() {
  return <Outlet />;
}

// --- Onboarding ---

function OnboardingRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnboardingComplete } = useOnboardingFlow();
  const { theme } = useTheme();
  const { ready, getTasks, insertTask, getBudgets, insertBudget } = useDB();
  const [pendingSeed, setPendingSeed] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedStarterData = useCallback(
    async (flowSelections) => {
      const starterGoal = flowSelections?.quickSetup?.starterGoal?.trim() ?? '';
      const budgetInput = flowSelections?.quickSetup?.monthlyBudget ?? '';
      const budgetValue = Number.parseFloat(String(budgetInput));
      const shouldSeedBudget = Number.isFinite(budgetValue) && budgetValue >= 0;

      if (starterGoal) {
        const existingTasks = await getTasks();
        const normalizedGoal = starterGoal.toLowerCase();
        const hasGoalTask = existingTasks.some(
          (task) => task.title.trim().toLowerCase() === normalizedGoal
        );
        if (!hasGoalTask) {
          await insertTask(starterGoal, 'pending', [], null, null, null);
        }
      }

      if (shouldSeedBudget) {
        const month = getDefaultBudgetMonth();
        const existingBudgets = await getBudgets();
        const hasMonthBudget = existingBudgets.some((budget) => budget.month === month);
        if (!hasMonthBudget) {
          await insertBudget(
            month,
            [{ source: t('onboarding.quickSetup.seedIncomeSource'), amount: budgetValue }],
            [{ name: t('budget.needsLabel'), type: 'NEED', plannedAmount: budgetValue }]
          );
        }
      }
    },
    [getBudgets, getTasks, insertBudget, insertTask, t]
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

// --- Tabs layout ---

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
        <Outlet />
      </main>
    </div>
  );
}

// --- Clerk setup screen (no key configured) ---

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

function PremiumGate({ feature, featureI18nKey }) {
  const { hasFeature } = useSubscription();
  const { t } = useTranslation();
  if (!hasFeature(feature)) return <UpgradePrompt featureName={t(featureI18nKey)} />;
  return <Outlet />;
}

// --- Router builders ---

function buildAuthRouter(clerkEnabled) {
  const premiumRoutes = [
    {
      path: 'social',
      element: <PremiumGate feature="social" featureI18nKey="social.title" />,
      children: [{ index: true, element: <SocialPlansView /> }],
    },
    {
      path: 'routines',
      element: <PremiumGate feature="routines" featureI18nKey="routines.title" />,
      children: [{ index: true, element: <RoutinesView /> }],
    },
    {
      path: 'rewards',
      element: <PremiumGate feature="rewards" featureI18nKey="rewards.title" />,
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
              {
                element: <TabsLayout />,
                children: [
                  { path: 'tasks', element: <TaskList /> },
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
    { basename: import.meta.env.BASE_URL }
  );
}

// --- App router (Clerk enabled) ---

function AppRouterAuthed() {
  const { hydrated } = useOnboardingFlow();
  const router = useMemo(() => buildAuthRouter(true), []);
  if (!hydrated) return null;
  return (
    <AuthProvider clerkEnabled={true}>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

// --- App router (no auth) ---

function AppRouterNoAuth() {
  const { hydrated } = useOnboardingFlow();
  const router = useMemo(() => buildAuthRouter(false), []);
  if (!hydrated) return null;
  return (
    <AuthProvider clerkEnabled={false}>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

// --- Root App ---

export default function App({ clerkEnabled = false }) {
  const { paperTheme } = useTheme();
  useBackgroundSync();

  // Track app open
  React.useEffect(() => {
    track(Events.APP_OPEN, { clerkEnabled });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
