// Minimal service worker: just enough for installability + a basic offline
// shell. Cache-first for static assets, network passthrough for everything
// else (never touches API/auth responses, so nothing sensitive is cached).
const CACHE_NAME = "metrocinemas-static-v1";

const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {
        // Best-effort: don't fail install if an asset is missing.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/logo.png" ||
    url.pathname === "/icon-192.png" ||
    url.pathname === "/icon-512.png" ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/favicon-32.png"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intersect API routes, auth, or dynamic app pages — only cache
  // static, immutable-ish assets. Everything else goes straight to network.
  if (url.pathname.startsWith("/api/")) return;

  if (!isStaticAsset(url)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
