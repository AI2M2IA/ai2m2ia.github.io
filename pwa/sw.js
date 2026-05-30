const STATIC_CACHE = "ai2m2ia-pwa-static-v9";
const API_CACHE = "ai2m2ia-api-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/app.js?v=9",
  "./assets/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, API_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
