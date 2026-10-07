// Δίαυλος Service — service worker (scope: /service/)
// Cache με πρόθεμα "service-cache-" (ΟΧΙ "diavlos-": ο SW της ρίζας σβήνει κάθε cache που ξεκινά με "diavlos-").
// Παίρνει από την cache πρώτα (offline) και ανανεώνει στο παρασκήνιο. Δεν αγγίζει τη σύνδεση PeerJS.
// Όταν αλλάζεις αρχεία: ανέβασε το CACHE.
var CACHE = 'service-cache-v1';
var FILES = [
  './', './index.html', './citizen.html', './officer.html', './manifest.json',
  './styles/base.css', './styles/citizen.css', './styles/officer.css',
  './data/fields.js', './data/documents.js', './data/services.js',
  './js/core/state.js', './js/core/transport.js', './js/core/sync.js', './js/core/transaction.js', './js/core/register-sw.js',
  './js/shared/validation.js', './js/shared/chat.js', './js/shared/pdf.js',
  './js/citizen/app.js', './js/officer/app.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
// Βιβλιοθήκες CDN που φορτώνουν οι σελίδες (ίδια ακριβώς URLs με τα <script>)
var CDN = [
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
];
var CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net'];
var SCOPE_PATH = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES).then(function () {
      // Οι βιβλιοθήκες: προσπάθεια, χωρίς να αποτύχει η εγκατάσταση αν λείπει internet
      return Promise.all(CDN.map(function (u) { return fetch(u, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); }));
    });
  }).then(function () { return self.skipWaiting(); }));
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
  var lib = CDN_HOSTS.indexOf(url.hostname) >= 0;
  if (!mine && !lib) return;                       // PeerJS cloud, STUN κλπ. περνούν ανέγγιχτα
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
