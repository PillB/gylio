import React, { useEffect, useRef } from 'react';
import { ClerkFailed, ClerkLoading } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { track, Events } from '../../core/analytics';
import { useTheme } from '../../core/context/ThemeContext';

export type AccountForm = 'sign_in' | 'sign_up';

const TITLE_KEYS: Record<AccountForm, string> = { sign_in: 'shell.signInTitle', sign_up: 'shell.signUpTitle' };

function Failed({ form, title }: { form: AccountForm; title: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Once per page: development's strict mode runs effects twice on the same component, which keeps its refs.
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    track(Events.ACCOUNT_FORM_FAILED, { form });
  }, [form]);
  const retry = () => {
    track(Events.ACCOUNT_FORM_RETRIED, { form });
    window.location.reload();
  };
  return (
    <>
      <h1>{title}</h1>
      <p role="alert" style={{ margin: 0 }}>{t('shell.accountFormFailed')}</p>
      <button
        type="button"
        onClick={retry}
        style={{
          minHeight: 44,
          padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
          borderRadius: theme.shape.radiusMd,
          fontFamily: theme.typography.body.family,
          fontSize: '0.9375rem',
          fontWeight: 600,
          cursor: 'pointer',
          background: theme.colors.primary,
          color: theme.colors.primaryForeground,
          border: `1px solid ${theme.colors.primary}`,
        }}
      >{t('shell.accountFormRetry')}</button>
    </>
  );
}

/**
 * What the sign-in and sign-up pages show until the account form itself arrives, or when it cannot: the form brings
 * its own page title, so without these the page would have no title, and no words at all, while it loads or after it
 * fails (offline, or the account service blocked).
 */
export default function AccountFormStatus({ form }: { form: AccountForm }) {
  const { t } = useTranslation();
  const title = t(TITLE_KEYS[form]);
  return (
    <>
      <ClerkLoading>
        <h1>{title}</h1>
        <p role="status" style={{ margin: 0 }}>{t('shell.accountFormLoading')}</p>
      </ClerkLoading>
      <ClerkFailed>
        <Failed form={form} title={title} />
      </ClerkFailed>
    </>
  );
}
