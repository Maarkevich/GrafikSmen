/*
VERSION: 4.7
⚠️ МЕНЯЙ ВЕРСИЮ ПРИ КАЖДОМ ОБНОВЛЕНИИ
*/

const CACHE_NAME = 'grafik-v4.7';
const BASE = '/GrafikSmen';

const STATIC_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/styles.css`,
  `${BASE}/app.js`,
  `${BASE}/manifest.json`,
  `${BASE}/Icon-192.png`,
  `${BASE}/Icon-512.png`,
  `${BASE}/apple-touch-icon.png`
];

/* ===== INSTALL ===== */
self.addEventListener('install', (event) => {
  console.log('[SW] Install:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

/* ===== ACTIVATE ===== */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate:', CACHE_NAME);

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Delete old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );

  self.clients.claim();
});

/* ===== FETCH ===== */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // только наш scope
  if (!url.pathname.startsWith(BASE)) return;

  // ===== HTML — network first =====
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(`${BASE}/index.html`))
    );
    return;
  }

  // ===== остальное — cache first =====
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;

            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));

            return response;
          });
      })
      .catch(() => {
        return new Response('Offline', { status: 503 });
      })
  );
});