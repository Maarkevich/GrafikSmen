/*
VERSION: 3.4
⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОДА УВЕЛИЧИВАЙТЕ ЭТУ ВЕРСИЮ
*/
const CACHE_NAME = 'zp-calc-v3.4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './Icon-192.png',
  './Icon-512.png',
  './apple-touch-icon.png'
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
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => {
        console.log('[SW] Удаляем старый кеш:', key);
        return caches.delete(key);
      }))
    )
  );
  clients.claim();
});

// 3. Стратегия: Network First + Cache Fallback
// Сначала пробуем сеть (чтобы получать обновления), при отказе — кеш
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Сохраняем свежую версию в кеш
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Сеть недоступна — берём из кеша
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Если нет в кеше и нет сети — возвращаем index.html для навигационных запросов
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Нет соединения', { status: 503 });
        });
      })
  );
});
