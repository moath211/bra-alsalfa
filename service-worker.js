/* برا السالفة — offline cache
 * Local game data stays available offline. Supabase API calls are never cached;
 * suggestion submission and online rooms still require an internet connection.
 */
const CACHE_NAME = 'bra-alsalfa-offline-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest'];
const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_FILES);
    await Promise.allSettled(CDN_FILES.map(async url => {
      const response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
      if (response && (response.ok || response.type === 'opaque')) await cache.put(url, response.clone());
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('bra-alsalfa-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === 'supabase.co' || url.hostname.endsWith('.supabase.co')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const isNavigation = request.mode === 'navigate';
    if (!isNavigation) {
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
      if (isNavigation) {
        const home = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (home) return home;
      }
      return new Response('', { status: 503, statusText: 'Offline resource unavailable' });
    }
  })());
});
