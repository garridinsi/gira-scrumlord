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

// Web Push: render the notification the server encrypted to us. Payload is JSON
// { title, body, url? }; degrade gracefully if it isn't.
self.addEventListener('push', (event) => {
  let data = { title: 'gira-scrumlord', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
    }),
  );
});

// Clicking a notification focuses an existing tab (navigating it to the target) or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
