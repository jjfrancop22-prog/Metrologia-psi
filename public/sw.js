const APP_VERSION = '1.1.136';
const CACHE = `erp-metrologico-v${APP_VERSION}`;
const APP_SHELL = ['/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('erp-metrologico-v') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: siempre intentar red primero para evitar que la PWA quede en una versión vieja.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(new Request(req, { cache: 'no-store' }));
        const cache = await caches.open(CACHE);
        cache.put('/index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // El propio SW y manifiesto nunca deben quedar pegados a una caché antigua.
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(fetch(new Request(req, { cache: 'no-store' })).catch(() => caches.match(req)));
    return;
  }

  // Assets con hash de Vite: cache-first seguro. El nombre cambia al cambiar el contenido.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    })());
    return;
  }

  // Resto de recursos locales: red primero y fallback offline.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
