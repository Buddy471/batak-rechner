const CACHE_NAME = 'batak-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'style.css'
];

// Dateien in den Cache laden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Offline-Verfügbarkeit steuern
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});