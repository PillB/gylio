import React from 'react';
import { themes } from '../core/themes';

const { colors, typography } = themes.light;

/**
 * Shown when the text for the person's language could not be fetched at start-up (the connection dropped between
 * the app's code and its text, or a new version replaced the file). It is the one screen written here in both
 * languages instead of through the catalogue: the catalogue is the thing that did not arrive.
 */
export const START_PROBLEM_TEXT = {
  en: { message: 'GYLIO could not finish loading. Check your connection, then reload.', reload: 'Reload' },
  es: { message: 'GYLIO no pudo terminar de cargar. Revisa tu conexión y vuelve a cargar.', reload: 'Recargar' },
};

const StartProblem = () => (
  <main style={{ maxWidth: 480, margin: '15vh auto 0', padding: 24, fontFamily: typography.body.family, color: colors.text, lineHeight: 1.5 }}>
    <div role="alert">
      <p lang="en" style={{ margin: '0 0 8px' }}>{START_PROBLEM_TEXT.en.message}</p>
      <p lang="es" style={{ margin: '0 0 20px' }}>{START_PROBLEM_TEXT.es.message}</p>
    </div>
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{ minHeight: 44, padding: '8px 20px', borderRadius: 12, border: `1px solid ${colors.primary}`, background: colors.primary, color: colors.primaryForeground, font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
    >
      <span lang="en">{START_PROBLEM_TEXT.en.reload}</span> / <span lang="es">{START_PROBLEM_TEXT.es.reload}</span>
    </button>
  </main>
);

export default StartProblem;
