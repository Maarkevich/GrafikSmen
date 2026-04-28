const CACHE_NAME = 'grafik-v3';

const ASSETS = [
  '/GrafikSmen/',
  '/GrafikSmen/index.html',
  '/GrafikSmen/styles.css',
  '/GrafikSmen/app.js',
  '/GrafikSmen/manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, fetchRes.clone());
          return fetchRes;
        });
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/GrafikSmen/index.html');
        }
      });
    })
  );
});