import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useTheme } from '../../core/context/ThemeContext';

const SignInPage: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        // Use dynamic viewport height and cap height so Clerk form stays accessible
        // when the on-screen keyboard is open on mobile (especially iPhone SE)
        minHeight: '60dvh',
        maxHeight: 'calc(100dvh - 80px)',
        overflowY: 'auto',
        padding: `${theme.spacing.lg}px`,
        paddingBottom: `calc(${theme.spacing.lg}px + env(safe-area-inset-bottom, 0px))`,
        WebkitOverflowScrolling: 'touch' as const,
      }}
    >
      <SignIn
        routing="path"
        path={`${import.meta.env.BASE_URL}sign-in`}
        fallbackRedirectUrl={`${import.meta.env.BASE_URL}tasks`}
        signUpUrl={`${import.meta.env.BASE_URL}sign-up`}
      />
    </div>
  );
};

export default SignInPage;
