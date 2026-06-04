const STATIC_CACHE = "ai2m2ia-pwa-static-v15";
const API_CACHE = "ai2m2ia-api-v1";
const ASSETS_CACHE = "ai2m2ia-pwa-assets-v15";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/app.js?v=14",
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
          .filter(key => ![STATIC_CACHE, API_CACHE, ASSETS_CACHE].includes(key))
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
    // Use stale-while-revalidate for JS/CSS to ensure fresh assets
    if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
      event.respondWith(staleWhileRevalidateForAssets(request));
    } else {
      event.respondWith(cacheFirst(request));
    }
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Validate response before caching
    if (response.ok && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    if (request.mode === "navigate") {
      return caches.match("./offline.html");
    }
    return offlineResponse(request);
  }
}

async function staleWhileRevalidateForAssets(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);
  
  // Return cached version immediately while updating in background
  const networkPromise = fetch(request)
    .then(response => {
      // Validate response before caching
      if (response.ok && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || offlineResponse(request));
  
  return cached || networkPromise;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      // Validate response before caching
      if (response.ok && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || offlineResponse(request));
  return cached || network;
}

function offlineResponse(request) {
  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json") || new URL(request.url).pathname.endsWith(".json");
  if (isJson) {
    return new Response(
      JSON.stringify({ error: "offline", message: "Resource unavailable offline and not yet cached." }),
      { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  return new Response("Resource unavailable offline and not yet cached.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
