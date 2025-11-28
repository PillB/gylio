import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Import view components
import TaskList from './components/TaskList.jsx';
import CalendarView from './components/CalendarView.jsx';
import BudgetView from './components/BudgetView.jsx';
import RewardsView from './components/RewardsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import OnboardingFlow from './components/onboarding/OnboardingFlow.jsx';
import { OnboardingProvider, useOnboardingFlow } from './hooks/useOnboardingFlow';
import { useSpeech } from './hooks/useSpeech';

function AppContent() {
  const { t, i18n } = useTranslation();
  const { state, updateSection } = useOnboardingFlow();
  const speak = useSpeech();
  const [view, setView] = useState('tasks');

  useEffect(() => {
    if (state.accessibility?.language) {
      i18n.changeLanguage(state.accessibility.language);
    }
  }, [i18n, state.accessibility?.language]);

  const toggleLanguage = () => {
    const newLng = i18n.language === 'en' ? 'es-PE' : 'en';
    updateSection('accessibility', { language: newLng });
    i18n.changeLanguage(newLng);
  };

  const toggleTts = () => {
    const nextValue = !state.accessibility?.ttsEnabled;
    updateSection('accessibility', { ttsEnabled: nextValue });
    if (nextValue) {
      speak(t('ttsEnabledConfirmation'));
    }
  };

  const handleComplete = () => {
    if (state.accessibility?.language) {
      i18n.changeLanguage(state.accessibility.language);
    }
  };

  if (!state.completed) {
    return (
      <div className="app-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        <OnboardingFlow onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        fontFamily: state.accessibility?.dyslexiaFont
          ? 'OpenDyslexic, Open Sans, sans-serif'
          : 'Open Sans, sans-serif',
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
          <button onClick={toggleTts} aria-pressed={state.accessibility?.ttsEnabled} aria-label={t('ttsToggle')}>
            {state.accessibility?.ttsEnabled ? t('ttsOn') : t('ttsOff')}
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

/**
 * Root application component.
 *
 * Provides navigation between modules (Tasks, Calendar, Budget, Rewards, Settings) and
 * includes a language and TTS toggle. The layout emphasises simplicity: a header with nav
 * buttons and a main area that displays one view at a time. Onboarding gates the main
 * views until the user completes required accessibility and preference choices.
 */
function App() {
  return (
    <OnboardingProvider>
      <AppContent />
    </OnboardingProvider>
  );
}

export default App;
