// comdiaz/frontend/service-worker.js
// Service Worker simple (limpia cachés viejas, no cachea archivos)

const CACHE_VER = 'comdiaz-cleanup-20261007';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pass-through: no intercepta peticiones
self.addEventListener('fetch', () => {});
