import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import esPE from '../i18n/es-PE.json';
import settingsViewSource from './SettingsView.jsx?raw';

type LocaleTree = Record<string, unknown>;

const SETTINGS_KEYS = [
  'settings',
  'settingsModuleAriaLabel',
  'settingsDescription',
  'enableTint',
  'disableTint',
  'announceSettings',
  'speaking',
  'theme.light',
  'theme.dark',
  'theme.highContrast',
  'settingsThemeLabel',
  'settingsThemeHelper',
  'settingsCurrentValue',
  'settingsFontLabel',
  'settingsFontHelper',
  'settingsMotionLabel',
  'settingsMotionHelper',
  'settingsAnimationLabel',
  'settingsAnimationOn',
  'settingsAnimationOff',
  'settingsAnimationHelper',
  'settingsTtsLabel',
  'settingsTtsHelper',
  'settingsGamificationLabel',
  'settingsGamificationHelper',
  'onboarding.accessibility.helper',
  'onboarding.accessibility.dyslexicFont',
  'onboarding.accessibility.largeText',
  'onboarding.accessibility.standardFont',
  'onboarding.accessibility.reduceMotion',
  'onboarding.accessibility.allowMotion',
  'onboarding.summary.enabled',
  'onboarding.summary.disabled',
  'sync.entity.task',
  'sync.entity.event',
  'sync.entity.transaction',
  'sync.reviewTitle',
  'sync.reviewHelper',
  'sync.reviewEmpty',
  'sync.reviewConflictLabel',
  'sync.reviewDetected',
  'sync.reviewKeepLocal',
  'sync.reviewUseRemote'
] as const;

const getPathValue = (source: LocaleTree, pathKey: string): string | undefined => {
  const value = pathKey.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as LocaleTree)[key];
  }, source);

  return typeof value === 'string' ? value : undefined;
};

describe('SettingsView i18n coverage', () => {
  it('uses translation keys only (no inline English fallback syntax)', () => {
    expect(settingsViewSource).not.toMatch(/t\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]/);
    expect(settingsViewSource).not.toMatch(/t\([^\)]*\)\s*\|\|\s*['"`]/);
  });

  it('contains every SettingsView translation key in English and es-PE', () => {
    for (const key of SETTINGS_KEYS) {
      expect(getPathValue(en as LocaleTree, key), `Missing key in en.json: ${key}`).toBeTypeOf('string');
      expect(getPathValue(esPE as LocaleTree, key), `Missing key in es-PE.json: ${key}`).toBeTypeOf('string');
    }
  });

  it('matches snapshots for settings labels in English and es-PE', () => {
    const buildLocaleSnapshot = (locale: LocaleTree) =>
      Object.fromEntries(
        SETTINGS_KEYS.map((key) => [key, getPathValue(locale, key)])
      );

    expect(buildLocaleSnapshot(en as LocaleTree)).toMatchSnapshot('settings labels (en)');
    expect(buildLocaleSnapshot(esPE as LocaleTree)).toMatchSnapshot('settings labels (es-PE)');
  });
});
