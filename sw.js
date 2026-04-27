/*
VERSION: 3.5
⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОДА УВЕЛИЧИВАЙТЕ ЭТУ ВЕРСИЮ
*/
const CACHE_NAME = 'zp-calc-v3.5';
const BASE = '/GrafikSmen';
const ASSETS_TO_CACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/styles.css`,
  `${BASE}/app.js`,
  `${BASE}/manifest.json`,
  `${BASE}/Icon-192.png`,
  `${BASE}/Icon-512.png`,
  `${BASE}/apple-touch-icon.png`
];

// 1. Установка
self.addEventListener('install', (event) => {
  console.log('[SW] Установка кэша:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. Активация — удаляем старые кеши
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Удаляем старый кеш:', key);
          return caches.delete(key);
        })
      )
    )
  );
  clients.claim();
});

// 3. Network First + Cache Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match(`${BASE}/index.html`);
          }
          return new Response('Нет соединения', { status: 503 });
        });
      })
  );
});
