import React from 'react';
import { useTheme } from '../../core/context/ThemeContext';

/**
 * Shown when VITE_CLERK_PUBLISHABLE_KEY is not configured.
 * Guides the developer through the one-time Clerk setup.
 */
const ClerkSetupBanner: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div
      role="alert"
      style={{
        margin: `${theme.spacing.lg}px auto`,
        maxWidth: 600,
        padding: `${theme.spacing.lg}px`,
        border: `2px solid ${theme.colors.accent}`,
        borderRadius: theme.shape.radiusMd,
        backgroundColor: theme.colors.surface,
        fontFamily: theme.typography.body.family,
        color: theme.colors.text,
        lineHeight: 1.6,
      }}
    >
      <h2 style={{ margin: `0 0 ${theme.spacing.sm}px`, fontFamily: theme.typography.heading.family }}>
        Auth setup needed
      </h2>
      <p style={{ margin: `0 0 ${theme.spacing.sm}px`, color: theme.colors.muted }}>
        GYLIO uses <strong>Clerk</strong> for secure sign-in. Follow these steps to enable it:
      </p>
      <ol style={{ margin: 0, paddingLeft: `${theme.spacing.lg}px`, display: 'grid', gap: `${theme.spacing.xs}px` }}>
        <li>
          Create a free account at{' '}
          <a
            href="https://clerk.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.colors.primary }}
          >
            clerk.com
          </a>
        </li>
        <li>Create a new <strong>React</strong> application in the Clerk Dashboard</li>
        <li>Copy your <strong>Publishable Key</strong> (starts with <code>pk_test_</code>)</li>
        <li>
          Create a file called <code>.env.local</code> in the project root and add:
          <pre
            style={{
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusSm,
              padding: `${theme.spacing.sm}px`,
              margin: `${theme.spacing.xs}px 0 0`,
              overflowX: 'auto',
              fontSize: '0.85rem',
            }}
          >
            {'VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here'}
          </pre>
        </li>
        <li>Restart the dev server with <code>npm run dev</code></li>
      </ol>
    </div>
  );
};

export default ClerkSetupBanner;
