self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('pwa-music-book-v1').then(cache => {
      return cache.addAll([
        'index.html',
        'manifest.json',
        'css/style.css',
        'js/app.js',
        'views/login.html',
        'views/register.html',
        'views/recover.html',
        'views/main.html',
        'img/icon-192.png',
        'img/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});

