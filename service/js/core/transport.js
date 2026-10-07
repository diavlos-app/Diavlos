// /service/js/core/transport.js
// Περιτύλιγμα PeerJS — ΜΟΝΟ μεταφορά μηνυμάτων. ΚΑΜΙΑ επιχειρησιακή λογική.
// Αν αλλάξει ο μηχανισμός (π.χ. τοπικό relay), αντικαθίσταται μόνο αυτό το αρχείο
// με το ίδιο API: create(opts) → { start, send, stop }.
(function (global) {
  'use strict';

  var PREFIX = 'diavlos-service-';
  var PING_MS = 4000;       // heartbeat
  var DEAD_MS = 12000;      // χωρίς σήμα → θεωρείται πτώση
  var RETRY_MS = 2000;      // επανάληψη σύνδεσης
  var DIAL_TIMEOUT_MS = 6000;

  // opts: { role:'officer'|'citizen', room:'123456', onMessage(msg), onStatus(status) }
  // status: 'connected' | 'disconnected' | 'reconnecting'
  function create(opts) {
    var peer = null, conn = null, status = 'disconnected';
    var lastSeen = 0, everConnected = false, stopped = false;
    var dialTimer = null, restartTimer = null, hbTimer = null, dialGuard = null;

    function setStatus(s) {
      if (s === status) return;
      status = s;
      if (opts.onStatus) opts.onStatus(s);
    }
    function lostLink() { setStatus(everConnected ? 'reconnecting' : 'disconnected'); }

    // Ο υπάλληλος έχει σταθερό ID (ώστε ο πολίτης να τον βρίσκει). Ο πολίτης τυχαίο.
    function officerId() { return PREFIX + opts.room + '-officer'; }

    function attach(c) {
      c.on('open', function () {
        if (conn && conn !== c && conn.open) { try { conn.close(); } catch (e) {} }
        conn = c; lastSeen = Date.now(); everConnected = true;
        clearTimeout(dialGuard);
        setStatus('connected');
      });
      c.on('data', function (d) {
        lastSeen = Date.now();
        if (d && d.t === '__ping') return;      // heartbeat — δεν φτάνει στην εφαρμογή
        if (opts.onMessage) opts.onMessage(d);
      });
      function gone() {
        if (conn === c) { conn = null; lostLink(); if (opts.role === 'citizen') scheduleDial(); }
      }
      c.on('close', gone);
      c.on('error', gone);
    }

    function scheduleDial() {
      clearTimeout(dialTimer);
      if (stopped) return;
      dialTimer = setTimeout(dial, RETRY_MS);
    }

    // Μόνο ο πολίτης καλεί τον υπάλληλο
    function dial() {
      if (stopped || opts.role !== 'citizen') return;
      if (conn && conn.open) return;
      if (!peer || peer.destroyed) { restart(); return; }
      if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
      if (!peer.open) { scheduleDial(); return; }
      var c = peer.connect(officerId(), { reliable: true, serialization: 'json' });
      attach(c);
      clearTimeout(dialGuard);
      dialGuard = setTimeout(function () {       // δεν άνοιξε εγκαίρως → ξανά
        if (!c.open) { try { c.close(); } catch (e) {} scheduleDial(); }
      }, DIAL_TIMEOUT_MS);
    }

    function start() {
      if (stopped) return;
      if (typeof Peer === 'undefined') { setStatus('disconnected'); restart(); return; }
      try {
        peer = opts.role === 'officer' ? new Peer(officerId(), { debug: 0 }) : new Peer({ debug: 0 });
      } catch (e) { restart(); return; }

      peer.on('open', function () {
        if (opts.role === 'citizen') dial(); else if (!everConnected) setStatus('disconnected');
      });
      peer.on('connection', function (c) { if (opts.role === 'officer') attach(c); });
      peer.on('disconnected', function () {      // χάθηκε ο signaling server — όχι απαραίτητα και το P2P
        if (stopped) return;
        try { peer.reconnect(); } catch (e) {}
      });
      peer.on('close', function () { restart(); });
      peer.on('error', function (err) {
        // 'unavailable-id' = παλιά συνεδρία ακόμα ζωντανή στον server → ξαναδοκιμάζουμε
        if (err && err.type === 'peer-unavailable') { if (opts.role === 'citizen') scheduleDial(); return; }
        restart();
      });
    }

    function restart() {
      if (stopped) return;
      clearTimeout(restartTimer);
      try { if (peer) peer.destroy(); } catch (e) {}
      peer = null; conn = null; lostLink();
      restartTimer = setTimeout(start, RETRY_MS + 500);
    }

    function heartbeat() {
      hbTimer = setInterval(function () {
        if (conn && conn.open) {
          try { conn.send({ t: '__ping' }); } catch (e) {}
          if (Date.now() - lastSeen > DEAD_MS) {  // σιωπηλή πτώση WiFi
            var c = conn; conn = null; lostLink();
            try { c.close(); } catch (e) {}
            if (opts.role === 'citizen') scheduleDial();
          }
        }
      }, PING_MS);
    }

    return {
      start: function () {
        stopped = false; start(); heartbeat();
        // Επιστροφή του δικτύου → άμεση προσπάθεια
        global.addEventListener('online', function () { if (status !== 'connected') restart(); });
      },
      // Επιστρέφει true αν στάλθηκε, false αν δεν υπάρχει σύνδεση
      send: function (msg) {
        if (conn && conn.open) { try { conn.send(msg); return true; } catch (e) {} }
        return false;
      },
      stop: function () {
        stopped = true; clearInterval(hbTimer); clearTimeout(dialTimer); clearTimeout(restartTimer);
        try { if (peer) peer.destroy(); } catch (e) {}
      }
    };
  }

  global.DiavlosTransport = { create: create };
})(window);
