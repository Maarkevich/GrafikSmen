/*
VERSION: 5.0
⚠️ МЕНЯЙ ВЕРСИЮ ПРИ КАЖДОМ ОБНОВЛЕНИИ
*/

const CACHE_NAME = 'grafik-v5.0';
const BASE = '/GrafikSmen';

/* ===== ФАЙЛЫ ДЛЯ КЭША ===== */
const ASSETS = [
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
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );

  self.skipWaiting(); // сразу активируем
});

/* ===== ACTIVATE ===== */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate:', CACHE_NAME);

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Delete old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim(); // берём контроль сразу
});

/* ===== FETCH ===== */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Только свой домен
  if (!url.origin.includes(self.location.origin)) return;

  // Навигация (страницы)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          return res;
        })
        .catch(() => {
          return caches.match(`${BASE}/index.html`);
        })
    );
    return;
  }

  // Остальное: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        const clone = res.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });

        return res;
      });
    })
  );
});

/* ===== ОБНОВЛЕНИЕ ПРИ ОТКРЫТИИ ===== */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});