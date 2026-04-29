// ChickenCrew service worker — minimal, PWA-installable.
//
// Cache strategy:
//   - HTML:  always network-first (fall back to cache only if offline)
//   - hashed JS/CSS chunks (/static/...): NEVER cached by us. The server
//       already sets long-lived immutable cache headers on hashed chunks,
//       and chunk filenames change every deploy — caching them here causes
//       "stuck on old build" bugs after deploys.
//   - other static assets (logo, icons, manifest): cache-first
//   - API / Supabase / Razorpay: never touched by us
//
// IMPORTANT: bump CACHE_VERSION every deploy so old caches are purged.
const CACHE_VERSION = 'v3-2026-04-29';
const CACHE = `fresh-cluck-${CACHE_VERSION}`;
const CORE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Allow page to force-skipWaiting (so newly opened tab gets new SW immediately)
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch APIs / Supabase / Razorpay — let the browser handle them.
  if (
    url.pathname.startsWith('/api/') ||
    url.host.includes('supabase.co') ||
    url.host.includes('razorpay.com') ||
    url.host.includes('cloudflare.com') ||
    url.host.includes('cdn-cgi')
  ) {
    return;
  }

  // Hashed build chunks — ALWAYS go to network. They are deploy-specific and
  // must never be served from a previous deploy's cache.
  if (
    url.pathname.startsWith('/static/js/') ||
    url.pathname.startsWith('/static/css/') ||
    url.pathname.startsWith('/static/media/')
  ) {
    return;
  }

  // HTML documents: network-first, fall back to cached / index for offline.
  if (req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const resCopy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, resCopy)).catch(() => null);
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Other same-origin assets (images, fonts, manifest): cache-first.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
          }
          return res;
        });
      })
    );
  }
});
