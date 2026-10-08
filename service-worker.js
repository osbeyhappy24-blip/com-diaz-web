// comdiaz/frontend/service-worker.js
// Service Worker con caché offline inteligente

const CACHE_NAME = 'comdiaz-static-v1';

// Archivos a cachear al instalar
const STATIC_FILES = [
  './index.html',
  './home.html',
  './welcome.js',
  './home.js',
  './style.css',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// ─── Instalar: cachear archivos estáticos ───
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando archivos estáticos');
      return cache.addAll(STATIC_FILES).catch(err => {
        console.warn('[SW] Error cacheando:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activar: limpiar cachés de versiones anteriores ───
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando caché viejo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: estrategia según tipo ───
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== 'GET') return;

  // APIs → siempre red, nunca caché
  if (url.pathname.startsWith('/api/')) return;

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // HTML → network-first (red primero, caché si falla)
  if (path.endsWith('.html') || path === '/' || path.endsWith('/')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./home.html')))
    );
    return;
  }

  // CSS/JS → stale-while-revalidate
  if (path.endsWith('.css') || path.endsWith('.js')) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Imágenes y otros → cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
