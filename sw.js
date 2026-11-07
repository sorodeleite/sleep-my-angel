const CACHE = 'sleep-my-angel-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/utils.js',
  './js/storage.js',
  './js/ambience.js',
  './js/player.js',
  './js/library.js',
  './js/affirmations.js',
  './js/recipes.js',
  './js/timer.js',
  './js/script.js',
  './js/app.js',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './assets/readme-photos/tumblr_095bd1f9adbbfc70eabb0168b575af87_0802485b_1280.jpg',
  './assets/readme-photos/tumblr_3627acec240809122de5d5afa6912f5b_16b02d5f_1280.webp',
  './assets/readme-photos/tumblr_91662fd1300010d18e42efd98b8460b6_324119a2_1280.jpg',
  './assets/readme-photos/tumblr_bd8e9efc0a9c6fd799342197e304508b_3adc1fa5_1280.jpg',
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

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/audios/') !== -1 || url.pathname.indexOf('/api/') !== -1) return;
  if (request.headers.has('range')) return;

  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
