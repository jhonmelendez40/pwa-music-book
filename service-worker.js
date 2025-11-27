// Nombre del caché
const CACHE_NAME = "pwa-music-book-v1";

// Archivos para usar offline
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/js/app.js",
  "/views/login.html",
  "/views/register.html",
  "/views/recover.html",
  "/views/main.html",
  "/img/icon-192.png",
  "/img/icon-512.png"
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

// Activar el SW (limpia cachés viejas)
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

// Interceptar peticiones y servir desde caché cuando no haya internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          return caches.match("/index.html"); // fallback offline
        })
      );
    })
  );
});
