/** Only a build has service-worker.js; the dev server answers it with the app page, which only logs an error. */
export const registerServiceWorker = (production: boolean = import.meta.env.PROD) => {
  if (!production || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const base = import.meta.env.BASE_URL || '/';
  const url = new URL('service-worker.js', window.location.origin + base).toString();

  navigator.serviceWorker.register(url).catch((error) => {
    console.warn('Service worker registration failed', error);
  });
};
