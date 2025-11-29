import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Import view components
import TaskList from './components/TaskList.jsx';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import NavBar from './components/NavBar.jsx';
import OnboardingFlow from './onboarding/OnboardingFlow.jsx';

/**
 * Root application component.
 *
 * Provides navigation between modules (Tasks, Calendar, Budget, Rewards, Settings) and
 * includes a language toggle. The layout emphasises simplicity: a header with nav
 * buttons and a main area that displays one view at a time. Buttons are large and
 * spaced for accessible touch targets, and text is drawn from translation dictionaries
 * via react‑i18next.
 */
function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('tasks');
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('onboardingComplete') === 'true';
  });

  useEffect(() => {
    if (onboardingComplete) {
      localStorage.setItem('onboardingComplete', 'true');
    }
  }, [onboardingComplete]);

  const views = useMemo(
    () => ({
      tasks: <TaskList />,
      calendar: <CalendarView />,
      budget: <BudgetView />,
      rewards: <RewardsView />,
      settings: <SettingsView />
    }),
    []
  );

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

  /**
   * Toggle between English and Peruvian Spanish. Persisting the selection can be
   * added later (e.g. in localStorage).
   */
  const toggleLanguage = () => {
    const newLng = i18n.language === 'en' ? 'es-PE' : 'en';
    i18n.changeLanguage(newLng);
  };

  if (!onboardingComplete) {
    return (
      <div
        className="app-container"
        style={{
          fontFamily: 'OpenDyslexic, Open Sans, sans-serif',
          padding: '1rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        <header>
          <h1>{t('appName')}</h1>
          <p style={{ color: '#444' }}>{t('onboarding.intro')}</p>
        </header>
        <OnboardingFlow
          onComplete={() => {
            setOnboardingComplete(true);
            setView('tasks');
          }}
          onToggleLanguage={toggleLanguage}
          languageLabel={t('languageToggle')}
        />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        fontFamily: 'OpenDyslexic, Open Sans, sans-serif',
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}
    >
      <header>
        <h1>{t('appName')}</h1>
        <NavBar
          items={navItems}
          activeKey={view}
          onNavigate={setView}
          onToggleLanguage={toggleLanguage}
          languageLabel={t('languageToggle')}
        />
      </header>
      <main>{views[view]}</main>
    </div>
  );
}

export default App;
