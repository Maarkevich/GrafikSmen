/*
VERSION: 3.1
⚠️ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОДА УВЕЛИЧИВАЙТЕ ЭТУ ВЕРСИЮ (напр. 3.1 → 3.2)
*/
const CACHE_NAME = 'zp-calc-v3.1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json'];

// === БЛОК 1: УСТАНОВКА ===
// Кэшируем все основные файлы при первой загрузке
self.addEventListener('install', (event) => {
  console.log('[SW] Установка кэша:', CACHE_NAME);
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting(); // Активируем сразу, не ждём закрытия вкладок
});

// === БЛОК 2: АКТИВАЦИЯ И ОЧИСТКА ===
// Удаляем старые кэши, чтобы не хранить мусор
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  clients.claim(); // Берём контроль над открытыми страницами
});

// === БЛОК 3: ОБРАБОТКА ЗАПРОСОВ ===
// Стратегия: Cache First + Network Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Фоновое обновление кэша, если есть интернет
      const fetchPromise = fetch(event.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        return res;
      }).catch(() => cached);
      
      // Отдаём кэш сразу, если есть. Иначе ждём сеть.
      return cached || fetchPromise;
    })
  );
});