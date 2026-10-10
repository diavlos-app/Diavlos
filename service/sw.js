// Δίαυλος Service — service worker (scope: /service/)
// Cache με πρόθεμα "service-cache-" (ΟΧΙ "diavlos-": ο SW της ρίζας σβήνει κάθε cache που ξεκινά με "diavlos-").
// Παίρνει από την cache πρώτα (offline) και ανανεώνει στο παρασκήνιο. Δεν αγγίζει τη σύνδεση PeerJS.
// Όλες οι βιβλιοθήκες είναι τοπικά αντίγραφα στο vendor/ (χωρίς CDN).
// Όταν αλλάζεις αρχεία: ανέβασε το CACHE.
var CACHE = 'service-cache-v3';
var FILES = [
  './', './index.html', './citizen.html', './officer.html', './manifest.json',
  './styles/base.css', './styles/citizen.css', './styles/officer.css',
  './data/fields.js', './data/documents.js', './data/services.js',
  './js/core/state.js', './js/core/transport.js', './js/core/sync.js', './js/core/transaction.js', './js/core/register-sw.js',
  './js/shared/validation.js', './js/shared/search.js', './js/shared/chat.js', './js/shared/pdf.js',
  './js/citizen/app.js', './js/officer/app.js',
  './vendor/peerjs.min.js', './vendor/qrcode.min.js', './vendor/html2pdf.bundle.min.js', './vendor/icons-sprite.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
var SCOPE_PATH = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('service-cache-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var mine = url.origin === location.origin && url.pathname.indexOf(SCOPE_PATH) === 0;
  if (!mine) return;                               // PeerJS cloud, STUN κλπ. περνούν ανέγγιχτα
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined); });
      return hit || net;
    });
  }));
});