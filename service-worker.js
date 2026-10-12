// comdiaz/frontend/service-worker.js
// Service Worker con cache offline inteligente - Shop + Admin

const CACHE_NAME = 'comdiaz-static-v3';
const API_CACHE = 'comdiaz-api-v1';

const STATIC_FILES = [
  // Admin
  './index.html',
  './home.html',
  './welcome.js',
  './home.js',
  './style.css',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  // Shop
  './shop.html',
  './shop.css',
  './shop.js',
  './favicon-shop.png',
  './icon-shop-192.png',
  './icon-shop-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './manifest-shop-v2.json'
];

// ─── Instalar: cachear archivos estaticos ───
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando archivos estaticos v3');
      return Promise.all(
        STATIC_FILES.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Skip:', url, err.message))
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activar: limpiar caches viejos ───
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => {
          console.log('[SW] Eliminando cache viejo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // API publica → network-first con fallback a cache
  if (url.pathname.startsWith('/api/public/') || url.pathname === '/api/featured') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(API_CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || new Response(
          JSON.stringify({ ok: false, offline: true, error: 'Sin conexion', products: [], featured: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ))
      )
    );
    return;
  }

  // Otras APIs → dejar pasar (no cachear, son admin)
  if (url.pathname.startsWith('/api/')) return;

  // Imagenes de eBay (proxy wsrv.nl) → stale-while-revalidate
  if (url.hostname === 'wsrv.nl' || url.hostname === 'i.ebayimg.com') {
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

  // Solo mismo origen de aqui en adelante
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // HTML → network-first
  if (path.endsWith('.html') || path === '/' || path.endsWith('/')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('./shop.html') || caches.match('./home.html'))
      )
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

  // Resto → cache-first
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
