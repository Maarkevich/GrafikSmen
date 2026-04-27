/*
VERSION: 3.3
⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОДА УВЕЛИЧИВАЙТЕ ЭТУ ВЕРСИЮ
*/
const CACHE_NAME = 'zp-calc-v3.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
  // ✅ Иконки добавлены ТОЛЬКО если они реально лежат в корне рядом с этими файлами:
  // './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

// 1. Установка
self.addEventListener('install', (event) => {
  console.log('[SW] Установка кэша:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. Активация
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  clients.claim();
});

// 3. Стратегия: Cache First + Network Fallback (с обработкой ошибок)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      
      return cachedResponse || fetchPromise;
    })
  );
});