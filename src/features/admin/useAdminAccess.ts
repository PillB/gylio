/**
 * Whether to open the admin console for the person signed in. The full server says it in the Pro answer
 * (entitlement.isAdmin); the Cloudflare Worker answers /api/me/admin. Either way the server checks again on every
 * admin call, so this only decides what the app shows.
 */
import { useEffect, useState } from 'react';
import { useAppAuth } from '../../core/context/AuthContext';
import { syncEnabled } from '../../core/sync/flag';
import { serverFeaturesEnabled } from '../../core/utils/serverFeatures';
import { useEntitlement } from '../billing/EntitlementContext';
import { adminApi } from '../billing/billingApi';

/** "checking" until the server has answered; "unknown" when it could not be asked (offline). */
export type AdminAccess = 'checking' | 'admin' | 'not_admin' | 'unknown';

// One question per person per visit: Settings and the console both ask, and the answer does not change in between.
const answers = new Map<string, Promise<boolean>>();

/** For tests: forget the answers, as a new visit would. */
export const forgetAdminAnswers = () => answers.clear();

function askWorker(userId: string): Promise<boolean> {
  let answer = answers.get(userId);
  if (!answer) {
    answer = adminApi.me().then((r) => r.admin === true);
    // A failed question is asked again next time, rather than remembered as "no".
    answer.catch(() => answers.delete(userId));
    answers.set(userId, answer);
  }
  return answer;
}

function useServerAnswer(): AdminAccess {
  const { entitlement, loading } = useEntitlement();
  if (entitlement?.isAdmin) return 'admin';
  // isAdmin is only known after the server answers; until then this is checking, not "not allowed".
  if (loading || entitlement === null || entitlement.isAdmin === undefined) return 'checking';
  return 'not_admin';
}

function useWorkerAnswer(ask: boolean): AdminAccess {
  const { userId, authLoaded } = useAppAuth();
  const [answer, setAnswer] = useState<{ userId: string; access: AdminAccess } | null>(null);
  useEffect(() => {
    if (!ask || !userId) return undefined;
    let current = true;
    askWorker(userId).then(
      (admin) => current && setAnswer({ userId, access: admin ? 'admin' : 'not_admin' }),
      () => current && setAnswer({ userId, access: 'unknown' }),
    );
    return () => {
      current = false;
    };
  }, [ask, userId]);
  if (!authLoaded) return 'checking';
  if (!userId) return 'not_admin';
  return answer?.userId === userId ? answer.access : 'checking';
}

export function useAdminAccess(): AdminAccess {
  const full = serverFeaturesEnabled();
  const fromServer = useServerAnswer();
  const fromWorker = useWorkerAnswer(!full && syncEnabled());
  if (full) return fromServer;
  return syncEnabled() ? fromWorker : 'not_admin';
}
