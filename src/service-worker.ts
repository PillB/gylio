const STATIC_CACHE = 'gylio-static-v1';
const MANIFEST_URL = new URL('manifest.json', self.registration.scope).toString();

const fetchManifestAssets = async () => {
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return [];
    const manifest = (await response.json()) as Record<string, { file: string } | undefined>;
    return Object.values(manifest)
      .map((entry) => (entry?.file ? new URL(entry.file, self.registration.scope).toString() : null))
      .filter((url): url is string => Boolean(url));
  } catch (error) {
    return [];
  }
};

const precache = async () => {
  const cache = await caches.open(STATIC_CACHE);
  const manifestAssets = await fetchManifestAssets();
  const fallbackAssets = [self.registration.scope, new URL('index.html', self.registration.scope).toString()];
  const assets = Array.from(new Set([...fallbackAssets, ...manifestAssets]));
  await cache.addAll(assets);
};

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === STATIC_CACHE ? Promise.resolve() : caches.delete(key))))
    )
  );
  self.clients.claim();
});

const isSameOriginRequest = (request: Request) => new URL(request.url).origin === self.location.origin;

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match(request)) || (await cache.match(self.registration.scope));
        })
    );
    return;
  }

  if (isSameOriginRequest(request) && ['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
      )
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'gylio-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'gylio-sync' }));
      })
    );
  }
});
