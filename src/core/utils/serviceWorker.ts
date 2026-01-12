export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const base = import.meta.env.BASE_URL || '/';
  const url = new URL('service-worker.js', window.location.origin + base).toString();

  navigator.serviceWorker.register(url).catch((error) => {
    console.warn('Service worker registration failed', error);
  });
};
