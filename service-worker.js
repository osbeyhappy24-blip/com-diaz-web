// comdiaz/frontend/service-worker.js
// Service Worker con caché offline

const CACHE_NAME = 'comdiaz-v1';
const CACHE_STATIC = [
  './',
  './index.html',
  './home.html',
  './catalog.html',
  './welcome.js',
  './home.js',
  './style.css',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Instalar → cachear archivos estáticos
self.addEventListener('install', (e) => {
  console.log('[SW] Instalando...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_STATIC).catch(err => {
        console.log('[SW] Error cacheando algunos archivos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar → limpiar cachés viejos
self.addEventListener('activate', (e) => {
  console.log('[SW] Activando...');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando caché viejo:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch → estrategia según el tipo
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Ignorar métodos no GET
  if (req.method !== 'GET') return;

  // Para APIs → siempre red (no cachear)
  if (url.pathname.startsWith('/api/')) return;

  // Para archivos estáticos del mismo origen → stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
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
});
