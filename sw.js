// Δίαυλος — Service Worker
// Cache-first για το app shell, ώστε η εφαρμογή να δουλεύει offline.

const CACHE_NAME = "diavlos-v30";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./transcribe.js",
  "./locations-extra.js",
  "./locations-coords.js",
  "./data.js",
  "./manifest.json",
  "./privacy.html",
  "./kep.html",
  "./data/protocols/kep.json",
  "./data/protocols/pharmacy.json",
  "./data/protocols/doctor.json",
  "./data/protocols/police.json"
];

// Προαιρετικά: δεν αποτυγχάνει η εγκατάσταση αν λείπουν
const OPTIONAL_SHELL = ["./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

// Αποθηκεύονται στην πρώτη επίσκεψη ώστε ο χάρτης (Leaflet) να δουλεύει offline
const RUNTIME_CACHE_HOSTS = ["unpkg.com"];

const CACHE_EXCLUDE = [
  "googleapis.com",
  "gstatic.com",
  "firebaseio.com",
  "basemaps.cartocdn.com",
  "tiles.openfreemap.org",
  "tile.openstreetmap.org",
  "overpass-api.de"
];

function isExcludedHost(hostname) {
  return CACHE_EXCLUDE.some(
    (host) => hostname === host || hostname.endsWith("." + host)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).then(() =>
        Promise.all(OPTIONAL_SHELL.map((u) => cache.add(u).catch(() => {})))
      )
    )
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
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/responder/")) return;
  if (isExcludedHost(url.hostname)) return;

  event.respondWith(
    // ignoreSearch: το index.html ζητά data.js?v=NN / app.js?v=NN
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response && response.ok && RUNTIME_CACHE_HOSTS.includes(url.hostname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
