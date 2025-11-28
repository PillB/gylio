import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Import view components
import TaskList from './components/TaskList.jsx';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';

/**
 * Root application component.
 *
 * Provides navigation between modules (Tasks, Calendar, Budget, Rewards, Settings) and
 * includes a language toggle.  The layout emphasises simplicity: a header with nav
 * buttons and a main area that displays one view at a time.  Buttons are large and
 * spaced for accessible touch targets, and text is drawn from translation dictionaries
 * via react‑i18next.
 */
function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('tasks');

  /**
   * Toggle between English and Peruvian Spanish.  Persisting the selection can be
   * added later (e.g. in localStorage).
   */
  const toggleLanguage = () => {
    const newLng = i18n.language === 'en' ? 'es-PE' : 'en';
    i18n.changeLanguage(newLng);
  };

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
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          <button onClick={() => setView('tasks')} aria-label={t('tasks')}>
            {t('tasks')}
          </button>
          <button onClick={() => setView('calendar')} aria-label={t('calendar')}>
            {t('calendar')}
          </button>
          <button onClick={() => setView('budget')} aria-label={t('budget')}>
            {t('budget')}
          </button>
          <button onClick={() => setView('rewards')} aria-label={t('rewards')}>
            {t('rewards')}
          </button>
          <button onClick={() => setView('settings')} aria-label={t('settings')}>
            {t('settings')}
          </button>
          <button onClick={toggleLanguage} aria-label="Toggle language">
            {t('languageToggle')}
          </button>
        </nav>
      </header>
      <main>
        {view === 'tasks' && <TaskList />}
        {view === 'calendar' && <CalendarView />}
        {view === 'budget' && <BudgetView />}
        {view === 'rewards' && <RewardsView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default App;