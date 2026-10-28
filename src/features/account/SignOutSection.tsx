/**
 * Settings: sign out and keep the data on this device (the usual case: it is there again offline), or sign out and
 * remove it, for a shared or borrowed device (src/core/account/removeDeviceData.ts). Removing says first what would
 * be lost, offers a download, and changes nothing unless sign-out went through.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../components/SectionCard.jsx';
import { requestRemoval } from '../../core/account/removeDeviceData';
import { Events, track } from '../../core/analytics';
import { useAppAuth } from '../../core/context/AuthContext';
import { useTheme } from '../../core/context/ThemeContext';
import { syncEnabled } from '../../core/sync/flag';
import { useSync } from '../../core/sync/SyncContext';
import { useAccountSync } from './AccountSyncContext';
import { downloadDataFile } from './download';

type Line = { key: string; values?: Record<string, unknown> };

/**
 * What removing would lose, as translation keys. With account sync, the five kinds of record the server keeps come
 * back at sign-in, and only changes not sent yet are lost; the rest of the app is kept on this device only.
 */
export const whatRemovalLoses = ({ syncOn, pending, savedAt }: { syncOn: boolean; pending: number; savedAt: string | null }): Line[] => {
  if (syncOn) {
    const lines: Line[] = [{ key: 'account.signOut.synced' }];
    if (pending > 0) lines.push({ key: 'account.signOut.pending', values: { count: pending } });
    return lines;
  }
  return [savedAt ? { key: 'account.signOut.savedCopy', values: { when: savedAt } } : { key: 'account.signOut.deviceOnly' }];
};

type Step = 'idle' | 'confirm' | 'busy' | 'failed';

const signInUrl = () => `${import.meta.env.BASE_URL}sign-in`;

function useButtonStyle(strong = false): React.CSSProperties {
  const { theme } = useTheme();
  return {
    minHeight: 44, padding: `0 ${theme.spacing.md}px`, borderRadius: theme.shape.radiusFull,
    border: `1.5px solid ${theme.colors.primary}`, background: strong ? theme.colors.primary : 'transparent',
    color: strong ? theme.colors.primaryForeground : theme.colors.primary, fontWeight: 600, cursor: 'pointer',
  };
}

type ConfirmProps = { onRemove: () => void; onCancel: () => void; onDownload: () => void; busy: boolean };

function Confirm({ onRemove, onCancel, onDownload, busy }: ConfirmProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { snapshot } = useSync();
  const { status, lastSavedAt } = useAccountSync();
  const button = useButtonStyle();
  const strong = useButtonStyle(true);
  const savedAt = status === 'saved' && lastSavedAt ? new Date(lastSavedAt).toLocaleString(i18n.language) : null;
  const lines = whatRemovalLoses({ syncOn: syncEnabled(), pending: snapshot?.pending ?? 0, savedAt });

  // Keyboard and screen reader users land on the question they now have to answer.
  useEffect(() => titleRef.current?.focus(), []);

  return (
    <div role="group" aria-labelledby={titleId} style={{ display: 'grid', gap: theme.spacing.sm }}>
      <h3 id={titleId} ref={titleRef} tabIndex={-1} style={{ margin: 0, fontSize: '1rem' }}>{t('account.signOut.confirmTitle')}</h3>
      {lines.map((line) => <p key={line.key} style={{ margin: 0 }}>{t(line.key, line.values)}</p>)}
      <p style={{ margin: 0 }}>{t('account.signOut.staysHere')}</p>
      <p style={{ margin: 0, color: theme.colors.muted }}>{t('account.signOut.downloadHint')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <button type="button" style={button} onClick={onDownload}>{t('account.download')}</button>
        <button type="button" style={strong} onClick={onRemove} disabled={busy}>{t('account.signOut.confirm')}</button>
        <button type="button" style={button} onClick={onCancel} disabled={busy}>{t('account.signOut.cancel')}</button>
      </div>
    </div>
  );
}

export function SignOutSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { userId, signOut } = useAppAuth();
  const [step, setStep] = useState<Step>('idle');
  const [removing, setRemoving] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);
  const button = useButtonStyle();
  if (!userId || !signOut) return null;

  // The funnel from the question to a finished sign-out; nothing about the person or their data.
  const count = (step: string, removeData: boolean) => track(Events.SIGN_OUT, { step, removeData });
  const leave = (remove: boolean) => {
    setRemoving(remove);
    setStep('busy');
    signOut(() => {
      count('signed_out', remove);
      if (remove) requestRemoval(userId);
      window.location.replace(signInUrl());
    }).catch(() => {
      count('failed', remove);
      setStep('failed');
    });
  };
  const ask = () => {
    count('asked', true);
    setStep('confirm');
  };
  const download = () => {
    count('downloaded', true);
    downloadDataFile();
  };
  const cancel = () => {
    count('cancelled', true);
    setStep('idle');
    // Back where the person was, rather than at the top of the page.
    requestAnimationFrame(() => removeRef.current?.focus());
  };
  const confirming = step === 'confirm' || (step === 'busy' && removing) || (step === 'failed' && removing);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: theme.spacing.md }}>
      <p style={{ margin: 0 }}>{t('account.signOut.intro')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <button type="button" style={button} onClick={() => leave(false)} disabled={step === 'busy'}>{t('account.signOut.keep')}</button>
        <button type="button" ref={removeRef} style={button} onClick={ask} disabled={step === 'busy'} aria-expanded={confirming}>
          {t('account.signOut.remove')}
        </button>
      </div>
      {confirming && <Confirm onRemove={() => leave(true)} onCancel={cancel} onDownload={download} busy={step === 'busy'} />}
      <p role="status" style={{ margin: 0 }}>{step === 'busy' ? t('account.signOut.busy') : ''}</p>
      {step === 'failed' && <p role="alert" style={{ margin: 0, color: theme.colors.errorStrong }}>{t('account.signOut.failed')}</p>}
    </div>
  );
}

/** The Settings card, only for someone signed in with Clerk. */
export function SignOutCard() {
  const { t } = useTranslation();
  const { userId, signOut } = useAppAuth();
  const anchorRef = useRef<HTMLDivElement>(null);

  // The account menu links here (#sign-out); after a full page load the browser cannot scroll to it on its own.
  const shown = Boolean(userId && signOut);
  useEffect(() => {
    if (!shown || window.location.hash !== '#sign-out') return;
    anchorRef.current?.scrollIntoView?.({ block: 'start' });
    anchorRef.current?.focus();
  }, [shown]);

  if (!shown) return null;
  return (
    <div id="sign-out" ref={anchorRef} tabIndex={-1}>
      <SectionCard title={t('account.signOut.heading')}>
        <SignOutSection />
      </SectionCard>
    </div>
  );
}

export default SignOutCard;
