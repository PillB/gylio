import React, { useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { removedOnThisPage } from '../../core/account/removeDeviceData';
import { useTheme } from '../../core/context/ThemeContext';

const SignInPage: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  // Says once, after "Sign out and remove my data from this device", that it was done.
  const [removed] = useState(removedOnThisPage);
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.md,
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
      {removed && <p role="status" style={{ margin: 0 }}>{t('device.removed')}</p>}
      <SignIn
        routing="path"
        path={`${import.meta.env.BASE_URL}sign-in`}
        fallbackRedirectUrl={`${import.meta.env.BASE_URL}tasks`}
        signUpUrl={`${import.meta.env.BASE_URL}sign-up`}
      />
    </main>
  );
};

export default SignInPage;
