import React, { useEffect, useRef } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { Events, track } from '../../core/analytics';
import { rememberError } from '../feedback/diagnostics';

export type RouteProblemKind = 'notFound' | 'error' | 'update';

/**
 * A screen loaded on demand whose file is gone after a deploy fails to import. Each engine words it differently:
 * Chromium "Failed to fetch dynamically imported module", Firefox "error loading dynamically imported module",
 * Safari "Importing a module script failed".
 */
const STALE_BUILD = /dynamically imported module|importing a module script failed/i;

export function problemKind(error: unknown): RouteProblemKind {
  if (isRouteErrorResponse(error)) return error.status === 404 ? 'notFound' : 'error';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return STALE_BUILD.test(message) ? 'update' : 'error';
}

type RouteProblemProps = {
  kind: RouteProblemKind;
  /** True when no <main> surrounds the page (outside the tab layout). */
  landmark?: boolean;
  onReload?: () => void;
};

/**
 * What a person sees instead of the router's developer error page: what happened, that their data is safe, and one
 * clear way on. Focus moves to the heading so a screen reader says it.
 */
export function RouteProblem({ kind, landmark = false, onReload = () => window.location.reload() }: RouteProblemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    track(Events.ROUTE_PROBLEM, { kind });
  }, [kind]);

  const button: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
    borderRadius: theme.shape.radiusMd,
    fontFamily: theme.typography.body.family,
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  };
  const primary: React.CSSProperties = { ...button, background: theme.colors.primary, color: theme.colors.primaryForeground, border: `1px solid ${theme.colors.primary}` };
  const secondary: React.CSSProperties = { ...button, background: 'transparent', color: theme.colors.text, border: `1px solid ${theme.colors.borderStrong}` };
  const canReload = kind !== 'notFound';
  const Wrapper = landmark ? 'main' : 'div';

  return (
    <Wrapper>
      <section
        aria-labelledby="route-problem-title"
        style={{
          maxWidth: 520,
          margin: `${theme.spacing.xl}px auto`,
          padding: theme.spacing.xl,
          borderRadius: theme.shape.radiusLg,
          border: `1px solid ${theme.colors.border}`,
          background: theme.colors.surface,
          color: theme.colors.text,
          fontFamily: theme.typography.body.family,
        }}
      >
        <h2
          id="route-problem-title"
          ref={heading}
          tabIndex={-1}
          style={{ margin: 0, fontSize: '1.25rem', fontFamily: theme.typography.heading.family, outline: 'none' }}
        >
          {t(`routeProblem.${kind}.title`)}
        </h2>
        <p style={{ margin: `${theme.spacing.sm}px 0 ${theme.spacing.lg}px`, color: theme.colors.muted, lineHeight: 1.55 }}>
          {t(`routeProblem.${kind}.body`)}
        </p>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          {canReload && (
            <button type="button" onClick={onReload} style={primary}>
              {t('routeProblem.reload')}
            </button>
          )}
          <Link to="/tasks" style={canReload ? secondary : primary}>
            {t('routeProblem.goToTasks')}
          </Link>
        </div>
      </section>
    </Wrapper>
  );
}

/** For a link that matches no screen. */
export function NotFoundPage() {
  return <RouteProblem kind="notFound" landmark />;
}

/** For a screen that failed to render or to load. `landmark` as for RouteProblem. */
export function RouteErrorPage({ landmark = false }: { landmark?: boolean }) {
  const error = useRouteError();
  // An error caught here never reaches window.onerror, so a bug report would otherwise leave it out.
  useEffect(() => rememberError(error), [error]);
  return <RouteProblem kind={problemKind(error)} landmark={landmark} />;
}
