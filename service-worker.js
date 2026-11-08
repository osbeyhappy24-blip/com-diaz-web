// ═══ PROFITTOLIFE MARKETPLACE - SERVICE WORKER (Offline-First) ═══
const CACHE_VERSION = 'ptl-20261108-v24-gold-clean'; // Cambiar versión para forzar actualización
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
const OFFLINE_URL = 'offline.html';

// Recursos estáticos que siempre deben estar en caché (Shell de la app)
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'shop.html',
  'seller.html',
  'seller-panel.html',
  'producto.html',
  'tienda.html',
  'home.html',
  'brand-ptl.css',
  'style.css',
  'manifest.json',
  'icon-ptl.svg'
];

// 1. INSTALL: Precargar los recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('✅ [SW] Precargando assets estáticos');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('🗑️ [SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Estrategia de intercepción
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones a APIs externas (Google, Supabase, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Estrategia para navegación (HTML): Network-First con fallback a caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clonedResponse));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Estrategia para recursos estáticos: Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        const clonedResponse = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clonedResponse));
        return response;
      });
    })
  );
});

// 4. BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-productos') {
    event.waitUntil(
      console.log('🔄 [SW] Sincronizando productos pendientes...')
    );
  }
});
