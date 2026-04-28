/*
VERSION: 5.0
⚠️ МЕНЯЙ ВЕРСИЮ ПРИ КАЖДОМ ОБНОВЛЕНИИ
/*
VERSION: 6.1
⚠️ При каждом обновлении увеличивай версию
*/

const CACHE_NAME = 'grafik-v6.1';
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
self.addEventListener('install', event => {
  console.log('[SW] Install:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );

  self.skipWaiting();
});

/* ===== ACTIVATE ===== */
self.addEventListener('activate', event => {
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

  self.clients.claim();
});

/* ===== FETCH ===== */
/*
Стратегия:
- HTML → Network First (чтобы обновлялся)
- CSS/JS → Cache First
- fallback → index.html
*/
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;

  // HTML — всегда пробуем сеть
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match(`${BASE}/index.html`)))
    );
    return;
  }

  // Остальное — cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match(`${BASE}/index.html`);
          }
        });
    })
  );
});

/* ===== FORCE UPDATE (опционально) ===== */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});