import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themes } from '../core/themes';
import { version as packageVersion } from '../../package.json';
import SettingsView from './SettingsView.jsx';

const state = {
  animationsEnabled: true,
  ttsEnabled: false,
  gamificationEnabled: true,
  dailyMode: false,
  isAdmin: false,
  serverFeatures: true,
};
const setAnimationsEnabled = vi.fn();
const setTtsEnabled = vi.fn();
const setGamificationEnabled = vi.fn();
const setDailyMode = vi.fn();
const resetTour = vi.fn();
const speak = vi.fn();

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light, mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({
    toggleTint: vi.fn(),
    isTinted: false,
    speak,
    isSpeaking: false,
    motionPreference: 'system',
    setMotionPreference: vi.fn(),
    animationsEnabled: state.animationsEnabled,
    setAnimationsEnabled,
    textStylePreference: 'standard',
    setTextStylePreference: vi.fn(),
    ttsEnabled: state.ttsEnabled,
    setTtsEnabled,
  }),
}));
vi.mock('../core/hooks/useGamification', () => ({
  default: () => ({ gamificationEnabled: state.gamificationEnabled, setGamificationEnabled }),
}));
vi.mock('../features/dashboard/useDailyMode', () => ({ useDailyMode: () => ({ dailyMode: state.dailyMode, setDailyMode }) }));
vi.mock('../core/utils/backgroundSync', () => ({ legacySyncEnabled: () => false }));
vi.mock('./LegacySyncReview.jsx', () => ({ default: () => null }));
vi.mock('./SyncStatus', () => ({ SyncSettingsSection: () => null }));
vi.mock('../core/context/GuidedTourContext', () => ({ useGuidedTour: () => ({ resetTour }) }));
vi.mock('../core/context/TaskTimerContext', () => ({
  useTaskTimer: () => ({
    settings: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4, autoStartBreak: false },
    updateSettings: vi.fn(),
  }),
}));
vi.mock('../features/ads/AdSlot', () => ({ default: () => null }));
vi.mock('../features/account/YourDataSection', () => ({ default: () => null }));
vi.mock('../features/account/SignOutSection', () => ({ default: () => null }));
vi.mock('../features/billing/EntitlementContext', () => ({ useEntitlement: () => ({ entitlement: { isAdmin: state.isAdmin } }) }));
vi.mock('../core/utils/serverFeatures', () => ({ serverFeaturesEnabled: () => state.serverFeatures }));

const sentAs = (name: string) =>
  (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props: unknown }[])
    .filter((event) => event.name === name)
    .map((event) => event.props);

const show = () => render(<MemoryRouter><SettingsView /></MemoryRouter>);
const section = (name: string) => screen.getByRole('region', { name });
const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

describe('SettingsView', () => {
  beforeEach(() => {
    Object.assign(state, { animationsEnabled: true, ttsEnabled: false, gamificationEnabled: true, dailyMode: false, isAdmin: false, serverFeatures: true });
    vi.clearAllMocks();
    localStorage.removeItem('analytics:queue');
  });
  afterEach(cleanup);

  it('counts each switch that is changed, by its name and new state, and nothing before one is', () => {
    show();
    expect(sentAs('setting_changed')).toEqual([]);
    fireEvent.click(box('settingsAnimationLabel'));
    fireEvent.click(box('onboarding.accessibility.tts'));
    fireEvent.click(box('settingsGamificationLabel'));
    fireEvent.click(box('dailyViewHeading'));
    expect(sentAs('setting_changed')).toEqual([
      { setting: 'animations', on: false },
      { setting: 'read_aloud', on: true },
      { setting: 'rewards', on: false },
      { setting: 'daily_view', on: true },
    ]);
  });

  it('names each on/off setting on its own checkbox and shows its saved state', () => {
    state.animationsEnabled = false;
    state.ttsEnabled = true;
    state.dailyMode = true;
    state.gamificationEnabled = false;
    show();
    expect(box('settingsAnimationLabel').checked).toBe(false);
    expect(box('onboarding.accessibility.tts').checked).toBe(true);
    expect(box('settingsGamificationLabel').checked).toBe(false);
    expect(box('dailyViewHeading').checked).toBe(true);
  });

  it('saves a switch to the setting it names', () => {
    show();
    fireEvent.click(box('settingsAnimationLabel'));
    expect(setAnimationsEnabled).toHaveBeenCalledWith(false);
    fireEvent.click(box('onboarding.accessibility.tts'));
    expect(setTtsEnabled).toHaveBeenCalledWith(true);
    fireEvent.click(box('settingsGamificationLabel'));
    expect(setGamificationEnabled).toHaveBeenCalledWith(false);
    fireEvent.click(box('dailyViewHeading'));
    expect(setDailyMode).toHaveBeenCalledWith(true);
    [setAnimationsEnabled, setTtsEnabled, setGamificationEnabled, setDailyMode].forEach((save) => expect(save).toHaveBeenCalledTimes(1));
  });

  it('does not repeat a value under the control that already shows it', () => {
    show();
    expect(document.body.textContent).not.toContain('settingsCurrentValue');
    expect(document.body.textContent).not.toContain('settingsAnimationOn');
  });

  it('keeps Daily view with the other preferences instead of in a section of its own', () => {
    show();
    expect(section('settings').contains(box('dailyViewHeading'))).toBe(true);
    expect(screen.queryByRole('region', { name: 'dailyViewHeading' })).toBeNull();
  });

  it('lists the sections in the order they are used: preferences, timer, data, help, about', () => {
    show();
    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(names).toEqual(['settings', 'timerHeading', 'account.heading', 'settingsHelpHeading', 'aboutHeading']);
  });

  it('keeps the tour targets the Settings walkthrough points at', () => {
    show();
    expect(document.querySelector('[data-tour="settings-theme"]')?.contains(screen.getByRole('combobox', { name: 'settingsThemeLabel' }))).toBe(true);
    expect(document.querySelector('[data-tour="settings-gamification"]')?.contains(box('settingsGamificationLabel'))).toBe(true);
    expect(document.querySelector('[data-tour="settings-tour"]')?.contains(screen.getByRole('button', { name: /tour\.restartButton/ }))).toBe(true);
  });

  it('puts the guide, the report link and the keyboard shortcuts under Help', () => {
    show();
    const help = within(section('settingsHelpHeading'));
    fireEvent.click(help.getByRole('button', { name: /tour\.restartButton/ }));
    expect(resetTour).toHaveBeenCalledTimes(1);
    expect(help.getByRole('link', { name: 'feedback.settings.qaLink' }).getAttribute('href')).toBe('/qa');
    expect(help.queryByRole('link', { name: 'feedback.settings.planLink' })).toBeNull();
    // Hidden on touch-only devices by the `.keyboard-only` rule in index.html.
    expect(help.getByRole('heading', { level: 3, name: 'shortcutsHeading' }).closest('.keyboard-only')).not.toBeNull();
  });

  it('leaves the report link out where reports cannot be sent', () => {
    state.serverFeatures = false;
    show();
    expect(screen.queryByRole('link', { name: 'feedback.settings.qaLink' })).toBeNull();
    expect(within(section('settingsHelpHeading')).queryByRole('navigation')).toBeNull();
  });

  it('shows the version and the plan link under About, and the admin link only to an admin', () => {
    const { unmount } = show();
    const about = within(section('aboutHeading'));
    expect(section('aboutHeading').textContent).toContain(packageVersion);
    expect(about.getByRole('link', { name: 'feedback.settings.planLink' }).getAttribute('href')).toBe('/pricing');
    expect(about.queryByRole('link', { name: 'feedback.settings.adminLink' })).toBeNull();
    expect(about.queryByRole('link', { name: 'feedback.settings.qaLink' })).toBeNull();
    unmount();
    state.isAdmin = true;
    show();
    expect(within(section('aboutHeading')).getByRole('link', { name: 'feedback.settings.adminLink' }).getAttribute('href')).toBe('/admin');
  });
});
