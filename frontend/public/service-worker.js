// Fresh Cluck service worker — minimal, PWA-installable.
const CACHE = 'fresh-cluck-v1';
const CORE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Don't cache API or Supabase or Razorpay calls
  if (
    url.pathname.startsWith('/api/') ||
    url.host.includes('supabase.co') ||
    url.host.includes('razorpay.com')
  ) {
    return;
  }
  // Cache-first for static assets; network-first for HTML
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
});
