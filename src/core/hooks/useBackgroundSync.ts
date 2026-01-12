import { useEffect } from 'react';
import { processSyncQueue, requestBackgroundSync, SYNC_TAG } from '../utils/backgroundSync';

const SYNC_POLL_INTERVAL = 60_000;

const useBackgroundSync = () => {
  useEffect(() => {
    const triggerSync = () => {
      processSyncQueue().catch((error) => {
        console.warn('Background sync failed', error);
      });
    };

    triggerSync();
    requestBackgroundSync().catch(() => undefined);

    const handleOnline = () => triggerSync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(triggerSync, SYNC_POLL_INTERVAL);

    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === SYNC_TAG) {
        triggerSync();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', messageHandler);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, []);
};

export default useBackgroundSync;
