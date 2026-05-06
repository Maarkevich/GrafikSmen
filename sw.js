/*
VERSION: 4.1
⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ УВЕЛИЧИВАЙТЕ ВЕРСИЮ
*/
const CACHE_NAME = 'zp-calc-v4.1';
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

// 1. Установка — кэшируем все статические файлы
self.addEventListener('install', (event) => {
  console.log('[SW] Установка кэша:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. Активация — удаляем старые версии кэша
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

// 3. Cache First + фоновое обновление (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Фоновое обновление кэша
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(err => console.warn('[SW] Фоновое обновление не удалось:', err));

      // Возвращаем из кэша немедленно, если есть, иначе ждём сеть
      return cachedResponse || fetchPromise;
    })
  );
});