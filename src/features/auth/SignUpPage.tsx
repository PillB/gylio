import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { useTheme } from '../../core/context/ThemeContext';

const SignUpPage: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '60dvh',
        maxHeight: 'calc(100dvh - 80px)',
        overflowY: 'auto',
        padding: `${theme.spacing.lg}px`,
        paddingBottom: `calc(${theme.spacing.lg}px + env(safe-area-inset-bottom, 0px))`,
        WebkitOverflowScrolling: 'touch' as const,
      }}
    >
      <SignUp
        routing="path"
        path={`${import.meta.env.BASE_URL}sign-up`}
        fallbackRedirectUrl={`${import.meta.env.BASE_URL}onboarding`}
        signInUrl={`${import.meta.env.BASE_URL}sign-in`}
      />
    </div>
  );
};

export default SignUpPage;
