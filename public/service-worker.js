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
  // Cache-first for same-origin navigations (app shell)
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.match('/gylio/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }
  // Network-first for everything else
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
