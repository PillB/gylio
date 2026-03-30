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
        alignItems: 'center',
        minHeight: '60vh',
        padding: `${theme.spacing.lg}px`,
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
