// Service Worker for Realm of the Trinity — offline PWA cache.
//
// Strategy: cache-first with network fallback. Every fetch goes through
// the SW. If the response is in the cache, serve it instantly. If not,
// fetch from network, cache a copy, then return it. This makes the game
// fully playable offline after the first visit (all JS/CSS/images/CDN
// scripts get cached on first load).
//
// The cache name includes a version number. Bump it to force a cache
// refresh on the next visit after a deploy.

const CACHE_NAME = 'rot-v11';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

// === Install: pre-cache the shell ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// === Activate: clean up old caches ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// === Fetch: cache-first, network fallback ===
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache immediately
        return cached;
      }
      // Not in cache — fetch from network, cache it, return it
      return fetch(event.request).then((response) => {
        // Don't cache non-ok responses or opaque responses (CDN CORS)
        if (!response || response.status !== 200) {
          return response;
        }
        // Clone the response because it can only be consumed once
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Network failed and not in cache — return the cached index.html
        // as a fallback (handles offline navigation requests)
        return caches.match('/index.html');
      });
    })
  );
});
