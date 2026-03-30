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
        alignItems: 'center',
        minHeight: '60vh',
        padding: `${theme.spacing.lg}px`,
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
