/**
 * Shows the app only once the data on this device belongs to the person signed in (see deviceOwner.ts). It sits
 * outside sync and every screen, so when someone else signs in their data is swapped in, and the page reloads,
 * before anything reads or sends the previous person's.
 */
import { useAuth } from '@clerk/clerk-react';
import React, { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { applyStep, gateNotice, gateStep, type StepOutcome } from './accountGate';
import { hasArchive, OWNER_CHANGED_EVENT, OWNER_KEY, readOwner } from './deviceOwner';

const subscribe = (onChange: () => void) => {
  window.addEventListener(OWNER_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(OWNER_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

const useDeviceOwner = () => useSyncExternalStore(subscribe, () => readOwner(), () => null);

/** Another tab swapped in someone else's data: this tab still shows, and could save over it, the previous person's. */
const useReloadWhenAnotherTabSwitches = () => {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === OWNER_KEY && event.oldValue !== null && event.newValue !== event.oldValue) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
};

function Notice({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <main style={{ display: 'grid', gap: theme.spacing.sm, padding: theme.spacing.lg, color: theme.colors.text }}>{children}</main>;
}

function NoRoom({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Notice>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{t('device.noRoom.title')}</h1>
      <p style={{ margin: 0 }}>{t('device.noRoom.body')}</p>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          justifySelf: 'start',
          minHeight: 44,
          padding: `0 ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusFull,
          border: `1.5px solid ${theme.colors.primary}`,
          background: 'transparent',
          color: theme.colors.primary,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t('device.noRoom.signOut')}
      </button>
    </Notice>
  );
}

export function AccountDataGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, userId, signOut } = useAuth();
  const owner = useDeviceOwner();
  const step = gateStep({ isLoaded, isSignedIn, userId }, owner);
  const [outcome, setOutcome] = useState<StepOutcome>('show');
  useReloadWhenAnotherTabSwitches();

  useEffect(() => {
    const result = applyStep(step, owner, userId, window.localStorage);
    // Until the page goes, keep the screens closed: they would start on the data that was just swapped in.
    if (result === 'reload' || result === 'restored') window.location.reload();
    setOutcome((current) => (current === 'reload' || current === 'restored' ? current : result));
  }, [step, owner, userId]);

  if (outcome === 'no-room') return <NoRoom onSignOut={() => void signOut()} />;
  const notice = gateNotice(step, outcome, userId ? hasArchive(userId) : false);
  if (notice) {
    return (
      <Notice>
        <p role="status" style={{ margin: 0 }}>{t(notice)}</p>
      </Notice>
    );
  }
  return <>{children}</>;
}

export default AccountDataGate;
