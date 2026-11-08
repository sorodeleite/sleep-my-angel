const CACHE = 'sleep-my-angel-v9';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/vendor/jszip.min.js',
  './js/vendor/epub.min.js',
  './js/vendor/fflate.min.js',
  './js/vendor/pdf.min.js',
  './js/vendor/pdf.worker.min.js',
  './js/utils.js',
  './js/track-name.js',
  './js/storage.js',
  './js/ambience.js',
  './js/keepalive.js',
  './js/player.js',
  './js/library.js',
  './js/affirmations.js',
  './js/recipes.js',
  './js/rain.js',
  './js/timer.js',
  './js/books.js',
  './js/moodboard.js',
  './js/updater.js',
  './js/app.js',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './assets/images/default_meditacao.jpg',
  './assets/recips/leite_dos_sonhos.webp',
  './assets/recips/waffles.webp',
  './assets/recips/cookies.webp',
  './assets/recips/brownie_na_air_fryer.webp',
  './assets/recips/cupcake.webp',
  './assets/audio-manifest.json',
  './assets/books/manifest.json',
  './assets/readme-photos/tumblr_db6ab36987b578f88c6ed96f4578a05c_fcb8ffe3_400.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      const fallback = cached || new Response('offline', {
        status: 503,
        statusText: 'offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
      const network = fetch(request).then(function (response) {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function () {
        return fallback;
      });
      return cached || network;
    });
  });
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/audios/') !== -1 || url.pathname.indexOf('/api/') !== -1) return;
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
