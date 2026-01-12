import React, { useMemo } from 'react';
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
import NavBar from './components/NavBar.jsx';
import TaskList from './features/tasks/components/TaskList';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import SocialPlansView from './features/social/components/SocialPlansView';
import OnboardingFlow from './onboarding/OnboardingFlow.jsx';
import useOnboardingFlow from './hooks/useOnboardingFlow.jsx';
import LanguageToggle from './components/atoms/LanguageToggle.tsx';
import { useTheme } from './core/context/ThemeContext';
import TintLayer from './components/TintLayer.jsx';

function AppHeader() {
  const { t } = useTranslation();
  const { selections, updateSelections } = useOnboardingFlow();
  const { theme } = useTheme();

  const ttsEnabled = selections?.accessibility?.tts ?? false;
  const toggleTts = () => updateSelections('accessibility', { tts: !ttsEnabled });

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        flexWrap: 'wrap'
      }}
    >
      <h1
        style={{
          margin: 0,
          color: theme.colors.text,
          fontFamily: theme.typography.heading.family,
          fontWeight: theme.typography.heading.weight
        }}
      >
        {t('appName')}
      </h1>
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        {/* Predictable header control: keep the language toggle pinned in the same place. */}
        <LanguageToggle placement="header" />
        {/* Predictable header control: align the TTS toggle with the language control. */}
        <button
          type="button"
          onClick={toggleTts}
          aria-label={t('onboarding.ttsToggle.aria')}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            cursor: 'pointer',
            background: ttsEnabled ? theme.colors.surface : theme.colors.background,
            color: ttsEnabled ? theme.colors.accent : theme.colors.text,
            fontFamily: theme.typography.body.family
          }}
        >
          {t('onboarding.accessibility.tts')}
        </button>
      </div>
    </header>
  );
}

function AppLayout() {
  const { theme } = useTheme();

  return (
    <div style={{ position: 'relative' }}>
      <TintLayer />
      <div
        className="app-container"
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: theme.typography.body.family,
          padding: theme.spacing.lg,
          maxWidth: '1200px',
          margin: '0 auto',
          color: theme.colors.text,
          backgroundColor: theme.colors.background
        }}
      >
        <AppHeader />
        <Outlet />
      </div>
    </div>
  );
}

function RootRedirect() {
  const { isOnboardingComplete } = useOnboardingFlow();
  return <Navigate to={isOnboardingComplete ? '/tasks' : '/onboarding'} replace />;
}

function OnboardingRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnboardingComplete } = useOnboardingFlow();
  const { theme } = useTheme();

  if (isOnboardingComplete) {
    return <Navigate to="/tasks" replace />;
  }

  return (
    <section style={{ marginTop: theme.spacing.lg }}>
      <p style={{ color: theme.colors.muted }}>{t('onboarding.intro')}</p>
      <OnboardingFlow onComplete={() => navigate('/tasks', { replace: true })} />
    </section>
  );
}

function TabsLayout() {
  const { t } = useTranslation();
  const { isOnboardingComplete } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const navItems = useMemo(
    () => [
      { key: 'tasks', label: t('tasks.title') },
      { key: 'calendar', label: t('calendar') },
      { key: 'social', label: t('social.title') },
      { key: 'budget', label: t('budget.title') },
      { key: 'rewards', label: t('rewards.title') },
      { key: 'settings', label: t('settings') }
    ],
    [t]
  );

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div style={{ marginTop: theme.spacing.lg }}>
      <NavBar
        items={navItems}
        activeKey={location.pathname.replace('/', '') || 'tasks'}
        onNavigate={(key) => navigate(`/${key}`)}
        languageToggle={<LanguageToggle placement="nav" />}
      />
      <main style={{ marginTop: theme.spacing.lg }}>
        <Outlet />
      </main>
    </div>
  );
}

function AppRouter() {
  const { hydrated } = useOnboardingFlow();

  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            path: '/',
            element: <AppLayout />,
            children: [
              { index: true, element: <RootRedirect /> },
              { path: 'onboarding', element: <OnboardingRoute /> },
              {
                element: <TabsLayout />,
                children: [
                  { path: 'tasks', element: <TaskList /> },
                  { path: 'calendar', element: <CalendarView /> },
                  { path: 'social', element: <SocialPlansView /> },
                  { path: 'budget', element: <BudgetView /> },
                  { path: 'rewards', element: <RewardsView /> },
                  { path: 'settings', element: <SettingsView /> }
                ]
              }
            ]
          }
        ],
        { basename: import.meta.env.BASE_URL }
      ),
    []
  );

  if (!hydrated) {
    return null;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  const { paperTheme } = useTheme();

  return (
    <PaperProvider theme={paperTheme}>
      <AppRouter />
    </PaperProvider>
  );
}
