// Nombre del caché
const CACHE_NAME = "pwa-music-book-v2";

// Archivos que se almacenarán en caché
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/app.js",
  "views/login.html",
  "views/register.html",
  "views/recover.html",
  "views/main.html",
  "img/icon-192.png",
  "img/icon-512.png"
];

// Instalar el service worker y guardar archivos en caché
self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar el SW (limpia versiones antiguas)
self.addEventListener("activate", (event) => {
  console.log("Service Worker activado");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

// Interceptar peticiones y responder desde caché cuando sea posible
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Fallback offline si falla
          return caches.match("index.html");
        })
      );
    })
  );
});
