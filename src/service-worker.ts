/// <reference lib="webworker" />
// Checked by tsconfig.sw.json: service-worker globals (WebWorker lib) clash with the DOM lib.
declare const self: ServiceWorkerGlobalScope;
export {};

// v2: v1 caches held only the start page, because the worker read the wrong file list.
const STATIC_CACHE = 'gylio-static-v2';
/** Written by the build (vite.config.ts, precacheList): every script, style, font and image it emitted. */
const PRECACHE_URL = new URL('precache.json', self.registration.scope).toString();

const fetchPrecacheList = async (): Promise<string[]> => {
  try {
    const response = await fetch(PRECACHE_URL, { cache: 'no-store' });
    if (!response.ok) return [];
    const files = (await response.json()) as unknown;
    if (!Array.isArray(files)) return [];
    return files.filter((file): file is string => typeof file === 'string').map((file) => new URL(file, self.registration.scope).toString());
  } catch {
    return [];
  }
};

/**
 * Caches each file on its own: `cache.addAll` fails the whole install when one file is missing, and a worker
 * that never installs leaves the app with no offline copy at all.
 */
const precache = async () => {
  const cache = await caches.open(STATIC_CACHE);
  const start = [self.registration.scope, new URL('index.html', self.registration.scope).toString()];
  const assets = Array.from(new Set([...start, ...(await fetchPrecacheList())]));
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
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
          // Response.error() when nothing is cached yet, instead of an invalid undefined response.
          return (await cache.match(request)) ?? (await cache.match(self.registration.scope)) ?? Response.error();
        })
    );
    return;
  }

  if (isSameOriginRequest(request) && ['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      // ignoreVary: the precache stored these without the Origin header a module script sends, and a server that
      // answers `Vary: Origin` then made every lookup miss, so the app could not start offline. File names
      // carry a content hash, so any stored copy of the same URL is the right one.
      caches.match(request, { ignoreVary: true }).then((cached) =>
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

// Background Sync (Chromium only) is not in the WebWorker lib typings.
type SyncEvent = ExtendableEvent & { tag: string };

self.addEventListener('sync' as keyof ServiceWorkerGlobalScopeEventMap, (rawEvent) => {
  const event = rawEvent as SyncEvent;
  if (event.tag === 'gylio-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'gylio-sync' }));
      })
    );
  }
});
