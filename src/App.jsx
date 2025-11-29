import React, { useMemo } from 'react';
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
import TaskList from './components/TaskList.jsx';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import OnboardingFlow from './onboarding/OnboardingFlow.jsx';
import useOnboardingFlow from './hooks/useOnboardingFlow.jsx';

const appShellStyle = {
  fontFamily: 'OpenDyslexic, Open Sans, sans-serif',
  padding: '1rem',
  maxWidth: '1200px',
  margin: '0 auto'
};

function AppHeader() {
  const { t, i18n } = useTranslation();
  const { selections, updateSelections } = useOnboardingFlow();

  const toggleLanguage = () => {
    const newLng = i18n.language === 'en' ? 'es-PE' : 'en';
    i18n.changeLanguage(newLng);
  };

  const ttsEnabled = selections?.accessibility?.tts ?? false;
  const toggleTts = () => updateSelections('accessibility', { tts: !ttsEnabled });

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}
    >
      <h1 style={{ margin: 0 }}>{t('appName')}</h1>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Predictable header control: keep the language toggle pinned in the same place. */}
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={t('languageToggleHelper')}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
            background: '#fff'
          }}
        >
          {t('languageToggle')}
        </button>
        {/* Predictable header control: align the TTS toggle with the language control. */}
        <button
          type="button"
          onClick={toggleTts}
          aria-label={t('onboarding.ttsToggle.aria')}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
            background: ttsEnabled ? '#eef2ff' : '#fff',
            color: ttsEnabled ? '#1d2f6f' : '#222'
          }}
        >
          {t('onboarding.accessibility.tts')}
        </button>
      </div>
    </header>
  );
}

function AppLayout() {
  return (
    <div className="app-container" style={appShellStyle}>
      <AppHeader />
      <Outlet />
    </div>
  );
}

function RootRedirect() {
  const { isOnboardingComplete } = useOnboardingFlow();
  return <Navigate to={isOnboardingComplete ? '/tasks' : '/onboarding'} replace />;
}

function OnboardingRoute() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isOnboardingComplete } = useOnboardingFlow();

  if (isOnboardingComplete) {
    return <Navigate to="/tasks" replace />;
  }

  return (
    <section style={{ marginTop: '1rem' }}>
      <p style={{ color: '#444' }}>{t('onboarding.intro')}</p>
      <OnboardingFlow
        onComplete={() => navigate('/tasks', { replace: true })}
        onToggleLanguage={() => {
          const newLng = i18n.language === 'en' ? 'es-PE' : 'en';
          i18n.changeLanguage(newLng);
        }}
        languageLabel={t('languageToggle')}
      />
    </section>
  );
}

function TabsLayout() {
  const { t } = useTranslation();
  const { isOnboardingComplete } = useOnboardingFlow();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = useMemo(
    () => [
      { key: 'tasks', label: t('tasks') },
      { key: 'calendar', label: t('calendar') },
      { key: 'budget', label: t('budget') },
      { key: 'rewards', label: t('rewards') },
      { key: 'settings', label: t('settings') }
    ],
    [t]
  );

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <NavBar
        items={navItems}
        activeKey={location.pathname.replace('/', '') || 'tasks'}
        onNavigate={(key) => navigate(`/${key}`)}
        onToggleLanguage={() => {}}
        languageLabel={t('languageToggle')}
      />
      <main style={{ marginTop: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

function AppRouter() {
  const { hydrated } = useOnboardingFlow();

  const router = useMemo(
    () =>
      createBrowserRouter([
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
                { path: 'budget', element: <BudgetView /> },
                { path: 'rewards', element: <RewardsView /> },
                { path: 'settings', element: <SettingsView /> }
              ]
            }
          ]
        }
      ]),
    []
  );

  if (!hydrated) {
    return null;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return <AppRouter />;
}
