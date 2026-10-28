/**
 * What the app shows while sign-in is still being checked (see signInWait in accountGate.ts). Sign-in loads from
 * another address, so offline it never finishes, and on a slow line it can take seconds: before this the screen
 * stayed blank in both cases, even for the person whose data is on this device.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QUIET_MS, signInWait, SLOW_SIGN_IN_MS, type SignInWait } from './accountGate';
import { ownerSignedIn } from './deviceOwner';

/** Roughly when the page started loading; sign-in started then too. */
const PAGE_STARTED_AT = Date.now();

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function useSignInWait(isLoaded: boolean, startedAt = PAGE_STARTED_AT): SignInWait {
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    if (isLoaded) return undefined;
    const timers = [QUIET_MS, SLOW_SIGN_IN_MS].map((ms) => window.setTimeout(() => setNow(Date.now()), Math.max(0, startedAt + ms - Date.now())));
    const update = () => setOnline(isOnline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [isLoaded, startedAt]);

  return signInWait({ ownerSignedIn: ownerSignedIn(), online, waitedMs: now - startedAt });
}

/** The live region is there from the start, empty, so the words are announced when they appear. */
export function SignInWaitNotice({ quiet }: { quiet: boolean }) {
  const { t } = useTranslation();
  return (
    <main>
      <p role="status" style={{ margin: 0 }}>
        {quiet ? '' : t('device.checkingSignIn')}
      </p>
    </main>
  );
}
