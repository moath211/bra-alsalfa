/* برا السالفة — stable offline cache (no automatic reload/update loop) */
const CACHE_NAME = 'bra-alsalfa-static-v2';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  // Deliberately do not call skipWaiting(): avoid replacing a running game session.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('bra-alsalfa-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    // Deliberately do not call clients.claim() or reload open pages.
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase data and realtime must always be online; never cache private/live API responses.
  if (url.hostname.endsWith('.supabase.co')) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Cache-first for same-origin files and third-party libraries/fonts after first online load.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone());
      return response;
    } catch (err) {
      return (await cache.match(req)) || Response.error();
    }
  })());
});
