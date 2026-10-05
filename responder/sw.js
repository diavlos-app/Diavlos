// Δίαυλος Responder — service worker (scope: /responder/)
// Αλλάζει ΜΟΝΟ τα caches με πρόθεμα "diavlos-responder-". Δεν αγγίζει τα caches του Δίαυλου πολίτη.
var CACHE = 'diavlos-responder-v2';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('diavlos-responder-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Από την cache πρώτα (δουλεύει offline), και ανανέωση στο παρασκήνιο όταν υπάρχει δίκτυο.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf('/responder/') !== 0) return;
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit || c.match('./index.html'); });
        return hit || net;
      });
    })
  );
});
