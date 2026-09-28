// Δίαυλος — Service Worker
// Cache-first για το app shell, ώστε η εφαρμογή να δουλεύει offline.
//
// ΣΗΜΑΝΤΙΚΟ:
// 1. Κάθε φορά που αλλάζει οποιοδήποτε αρχείο του APP_SHELL, ανέβασε τον
//    αριθμό στο CACHE_NAME. Αλλιώς οι χρήστες θα βλέπουν την παλιά έκδοση.
// 2. Το cache.addAll είναι «όλα ή τίποτα»: αν ένα αρχείο της λίστας λείπει
//    από το repo (404), αποτυγχάνει όλη η εγκατάσταση. Πρόσθεσε νέα αρχεία
//    (π.χ. εικονίδια) στη λίστα ΜΟΝΟ αφού υπάρχουν στο repo.

const CACHE_NAME = "diavlos-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./manifest.json"
];

// Hosts που δεν περνούν ποτέ από το cache (Firebase/Google APIs για τον
// μελλοντικό χάρτη). Έτσι ο χάρτης δεν θα «παγώνει» σε παλιά δεδομένα.
// Το Firebase SDK να φορτώνεται μόνο όταν ανοίγει το tab του χάρτη και όχι
// στην εκκίνηση, ώστε η αρχική οθόνη να μη χρειάζεται σύνδεση για να ανοίξει.
const CACHE_EXCLUDE = [
  "googleapis.com",
  "gstatic.com",
  "firebaseio.com"
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

  // Μόνο GET περνά από το cache (τα POST/PUT του Firestore μένουν ανέγγιχτα)
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
