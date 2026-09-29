// GYLIO Service Worker — offline shell cache
const CACHE = 'gylio-v1';
const SHELL = [
  '/gylio/',
  '/gylio/index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  // Network-first for navigations, cached shell only when offline. Cache-first here
  // served a stale index.html (old CSP, old bundles) in dev until the cache was cleared.
  // Production builds replace this file with src/service-worker.ts, which does the same.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/gylio/index.html')));
    return;
  }
  // Network-first for everything else
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
