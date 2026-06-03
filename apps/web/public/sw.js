// SPDX-License-Identifier: GPL-3.0-or-later
// gira-scrumlord service worker. Deliberately conservative:
//   • NEVER touches /api/* — those are cookie-authenticated, per-user responses; caching
//     them would leak one user's data to another across sessions/logout. Pass straight
//     through to the network.
//   • Navigations are network-first (so a new deploy is picked up immediately), falling
//     back to the cached app shell only when offline.
//   • Static assets are cached so the shell loads offline; the cache is versioned and old
//     versions are purged on activate.
const CACHE = 'gira-shell-v1';
const SHELL = ['/', '/icon.svg', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only same-origin GETs are eligible; the API is never cached or intercepted.
  if (
    req.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // App navigations: network-first → cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/').then((r) => r || fetch(req))));
    return;
  }

  // Static assets: serve from cache, revalidate in the background (stale-while-revalidate).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
