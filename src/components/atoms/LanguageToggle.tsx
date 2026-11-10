/**
 * LanguageToggle — production-language selector.
 *
 * Only locales that have passed translation and UX QA are exposed. Language names use autonyms instead of country
 * flags: languages and countries are not a one-to-one relationship.
 *
 * A language's text is fetched the first time it is chosen (src/i18n/catalogs.js). The app changes language once
 * the text has arrived; if it cannot be fetched, the language stays as it was and the person is told.
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import type { ThemeTokens } from '../../core/themes';
import { track, Events } from '../../core/analytics';
import { catalogFor, loadCatalog } from '../../i18n/catalogs.js';

export type LanguageToggleProps = {
  ariaLabel?: string;
  placement?: 'header' | 'nav' | 'inline';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es-PE', label: 'Español (Perú)' },
];

const placementStyles: Record<NonNullable<LanguageToggleProps['placement']>, React.CSSProperties> = {
  header: { alignSelf: 'center' },
  nav:    { alignSelf: 'center' },
  inline: {},
};

const LanguageToggle: React.FC<LanguageToggleProps> = ({
  ariaLabel,
  placement = 'inline',
  className,
  style,
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  // The language being fetched, shown as chosen while it loads so the control does not snap back.
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Counts the choices made. A language chosen and then replaced by another choice before its text arrived must not
  // take effect when it finally does: the last choice is the one the person wants.
  const choices = useRef(0);

  // Generic browser Spanish intentionally maps to the reviewed es-PE catalog.
  const currentCode = catalogFor(i18n.language);
  const defaultAriaLabel = currentCode === 'es-PE' ? 'Seleccionar idioma' : 'Select language';

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    const choice = ++choices.current;
    const replaced = () => choice !== choices.current;
    setPending(next);
    setFailed(false);
    try {
      await loadCatalog(next);
      if (replaced()) return;
      await i18n.changeLanguage(next);
      track(Events.LANGUAGE_CHANGED, { to: next });
    } catch {
      if (replaced()) return;
      setFailed(true);
      track(Events.LANGUAGE_LOAD_FAILED, { to: next });
    } finally {
      if (!replaced()) setPending(null);
    }
  };

  const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: (theme.shape as ThemeTokens['shape']).radiusSm,
    cursor: 'pointer',
    background: theme.colors.surface,
    color: theme.colors.text,
    fontSize: '0.85rem',
    fontFamily: theme.typography.body.family,
    ...placementStyles[placement],
    ...style,
  };

  return (
    <>
      <select
        value={pending ?? currentCode}
        onChange={(event) => void handleChange(event)}
        aria-label={ariaLabel ?? defaultAriaLabel}
        aria-busy={pending !== null}
        className={className}
        style={selectStyle}
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      {failed && (
        <span role="alert" style={{ fontSize: '0.8125rem', color: theme.colors.text, alignSelf: 'center' }}>
          {t('shell.languageLoadFailed')}
        </span>
      )}
    </>
  );
};

export default LanguageToggle;
