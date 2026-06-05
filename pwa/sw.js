const SW_CACHE_NAMESPACE = "ai2m2ia-pwa";
const SW_CACHE_VERSION_FALLBACK = "20260601a";

const SW_CACHE_SEEDS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/app.js",
  "./assets/styles.css",
  "./sw.js",
  "../app.js",
  "../styles.css",
  "../theme-init.js",
  "../lib/sanitize.js",
  "../assets/fonts/fonts.css"
];

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/app.js",
  "./assets/styles.css",
  "./assets/icon.svg"
];

let cacheVersionPromise = null;
let activeCacheVersion = null;

const encoder = new TextEncoder();

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hashString(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest).slice(0, 16);
}

async function fetchSeedText(path) {
  try {
    const response = await fetch(path, { cache: "reload" });
    if (!response.ok) return `!${path}:${response.status}`;
    return await response.text();
  } catch (error) {
    return `!${path}:${error?.message || "fetch-error"}`;
  }
}

async function collectApiSeedPayloads() {
  const catalogPath = "../api/catalog.json";
  const payloads = [await fetchSeedText(catalogPath)];

  try {
    const catalog = JSON.parse(payloads[0]);
    const manifestUrls = (catalog.books || [])
      .map(book => book?.manifestUrl)
      .filter(url => typeof url === "string");
    const uniqueManifestUrls = Array.from(new Set(manifestUrls));
    const contentPayloads = await Promise.all(uniqueManifestUrls.map(url => fetchSeedText(url)));
    payloads.push(...contentPayloads);
  } catch {
    // catalog unavailable or unexpected format: keep the existing catalog payload marker
  }

  return payloads;
}

async function computeCacheVersionFromSeedFiles() {
  const filePayloads = await Promise.all(SW_CACHE_SEEDS.map(fetchSeedText));
  const apiPayloads = await collectApiSeedPayloads();
  const payloads = [...filePayloads, ...apiPayloads];
  return await hashString(payloads.join("\n"));
}

async function getCacheVersion() {
  if (activeCacheVersion) return activeCacheVersion;
  if (!cacheVersionPromise) {
    cacheVersionPromise = (async () => {
      try {
        return `h${await computeCacheVersionFromSeedFiles()}`;
      } catch {
        return SW_CACHE_VERSION_FALLBACK;
      }
    })();
  }
  activeCacheVersion = await cacheVersionPromise;
  return activeCacheVersion;
}

function cacheNames(version) {
  return {
    static: `${SW_CACHE_NAMESPACE}-static-${version}`,
    assets: `${SW_CACHE_NAMESPACE}-assets-${version}`,
    api: `${SW_CACHE_NAMESPACE}-api-${version}`,
    version: `${SW_CACHE_NAMESPACE}-version`
  };
}

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const version = await getCacheVersion();
      const names = cacheNames(version);

      await caches.open(names.version).then(cache => {
        return cache.put(
          "meta",
          new Response(JSON.stringify({
            version,
            versionedAt: new Date().toISOString()
          }), {
            headers: { "content-type": "application/json; charset=utf-8" }
          })
        );
      });

      await caches.open(names.static)
        .then(cache => cache.addAll(STATIC_ASSETS));

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = cacheNames(await getCacheVersion());
      const expectedNames = new Set(Object.values(names).filter(name => name !== names.version));

      const existing = await caches.keys();
      await Promise.all(
        existing
          .filter(key => key.startsWith(SW_CACHE_NAMESPACE) && !expectedNames.has(key))
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
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
    if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
      event.respondWith(staleWhileRevalidateForAssets(request));
      return;
    }

    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const version = await getCacheVersion();
  const names = cacheNames(version);
  const cache = await caches.open(names.static);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200 && response.type === "basic") {
      await cache.put(request, response.clone());
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
  const version = await getCacheVersion();
  const names = cacheNames(version);
  const cache = await caches.open(names.assets);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || offlineResponse(request));

  return cached || networkPromise;
}

async function staleWhileRevalidate(request) {
  const version = await getCacheVersion();
  const names = cacheNames(version);
  const cache = await caches.open(names.api);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(response => {
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
