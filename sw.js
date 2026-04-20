/* 
  VERSION: 3.0 
  ⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОДА УВЕЛИЧИВАЙТЕ ЭТУ ВЕРСИЮ (напр. 3.1 → 3.2)
*/
const CACHE_NAME = 'zp-calc-v3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// 1. Установка: кэшируем статику
self.addEventListener('install', (event) => {
  console.log('[SW] Установка кэша:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  clients.claim();
});

// 3. Стратегия: Cache First + Network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});