/**
 * upload — sends queued analytics events to the Gylio API in small batches.
 *
 * Runs when the build has an API to send them to: the Cloudflare build (the
 * Worker stores them; VITE_SYNC_ENABLED=true) or a build with the old server
 * (VITE_BILLING_ENABLED=true). The GitHub Pages preview keeps events local. Events leave the queue only after the server
 * accepted them, so going offline loses nothing.
 */
import { authHeaders } from '../utils/authToken';
import { apiUrl } from '../utils/apiUrl';
import { serverFeaturesEnabled } from '../utils/serverFeatures';
import { syncEnabled } from '../sync/flag';

const QUEUE_KEY = 'analytics:queue';
const BATCH = 50;
const INTERVAL_MS = 20_000;

type Queued = { id?: string; signedIn?: boolean; name: string; props?: Record<string, unknown>; sessionId: string };

function readQueue(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Drop the first `count` events: the ones just sent. Newer events stay queued. */
function dropSent(count: number) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(readQueue().slice(count)));
  } catch {
    // Storage blocked: nothing to clean up.
  }
}

let sending = false;

export async function uploadOnce(fetchImpl: typeof fetch = fetch): Promise<number> {
  if (sending) return 0;
  const batch = readQueue().slice(0, BATCH);
  if (!batch.length) return 0;
  sending = true;
  try {
    const body = JSON.stringify({ events: batch.map(({ id, signedIn, name, props, sessionId }) => ({ id, signedIn, name, props, sessionId })) });
    const response = await fetchImpl(apiUrl('/api/analytics/events'), {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body,
      keepalive: body.length < 60_000,
    });
    // 400 means the batch itself is unusable; drop it so it can't block the queue forever.
    if (response.ok || response.status === 400) {
      dropSent(batch.length);
      return batch.length;
    }
    return 0;
  } catch {
    return 0;
  } finally {
    sending = false;
  }
}

/** Whether this build has an API that stores analytics. */
export const analyticsUploadEnabled = (): boolean => syncEnabled() || serverFeaturesEnabled();

export function startAnalyticsUpload(): () => void {
  if (!analyticsUploadEnabled()) return () => undefined;
  const timer = window.setInterval(() => { void uploadOnce(); }, INTERVAL_MS);
  const onHide = () => { if (document.visibilityState === 'hidden') void uploadOnce(); };
  document.addEventListener('visibilitychange', onHide);
  void uploadOnce();
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onHide);
  };
}
