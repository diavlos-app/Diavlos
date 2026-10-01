// Δίαυλος — Service Worker
// Cache-first για το app shell, ώστε η εφαρμογή να δουλεύει offline.

const CACHE_NAME = "diavlos-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./manifest.json"
];

// Hosts που δεν περνούν ποτέ από το cache:
// - Firebase/Google APIs (για μελλοντικό shared χάρτη)
// - CartoDB tiles (χιλιάδες tiles — θα γέμιζαν τον χώρο)
const CACHE_EXCLUDE = [
  "googleapis.com",
  "gstatic.com",
  "firebaseio.com",
  "basemaps.cartocdn.com",
  "tiles.openfreemap.org"     // ← ΝΕΟ
];

function isExcludedHost(hostname) {
  return CACHE_EXCLUDE.some(
    (host) => hostname === host || hostname.endsWith("." + host)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("diavlos-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Μόνο GET περνά από το cache
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isExcludedHost(url.hostname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
        // Πάντα Response, ποτέ undefined
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
