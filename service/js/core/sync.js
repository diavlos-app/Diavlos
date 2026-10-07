// /service/js/core/sync.js
// Συγχρονισμός & ανάκτηση. Ο υπάλληλος = πηγή αλήθειας.
// Ο πολίτης στέλνει ενέργειες («act»), ο υπάλληλος τις εφαρμόζει και στέλνει στιγμιότυπο («snap»).
(function (global) {
  'use strict';

  var DEMO_ROOM = '123456';

  // Ταυτότητα ζεύγους: ?room=XXXXXX → αποθηκεύεται τοπικά (μόνιμο pairing, όχι IP)
  // αλλιώς ό,τι είναι αποθηκευμένο, αλλιώς ο σταθερός κωδικός του demo.
  function resolvePairId() {
    var id = null;
    try {
      var q = new URLSearchParams(global.location.search).get('room');
      if (q && /^\d{6}$/.test(q)) { id = q; localStorage.setItem('diavlos-pair-id', q); }
      if (!id) { var s = localStorage.getItem('diavlos-pair-id'); if (s && /^\d{6}$/.test(s)) id = s; }
    } catch (e) {}
    return id || DEMO_ROOM;
  }

  // opts: { role, store, onAction(name,data) [μόνο υπάλληλος], onEvent(name,data) }
  function start(opts) {
    var role = opts.role, store = opts.store;
    var outbox = [];                 // ενέργειες πολίτη που δεν στάλθηκαν λόγω πτώσης
    var snapTimer = null, wasConnected = false;

    var transport = DiavlosTransport.create({
      role: role,
      room: resolvePairId(),
      onStatus: function (s) {
        var recovering = (s !== 'connected') && wasConnected;   // πτώση ΜΕΤΑ από σύνδεση
        if (s === 'connected') wasConnected = true;
        store.setLocal({ conn: s, recovering: recovering });
        if (s === 'connected') {
          if (role === 'citizen') {
            transport.send({ t: 'where' });                      // «πού είμαστε;»
            flushOutbox();
          } else {
            pushSnapshot();                                      // ο υπάλληλος στέλνει αμέσως την κατάσταση
          }
        }
      },
      onMessage: function (m) {
        if (!m || !m.t) return;
        if (role === 'officer') {
          if (m.t === 'where') pushSnapshot();
          else if (m.t === 'act' && opts.onAction) opts.onAction(m.a, m.d);
        } else if (m.t === 'snap') {
          store.restore(m.snap);
        }
        if (m.t === 'ev' && opts.onEvent) opts.onEvent(m.n, m.d);   // π.χ. «...γράφει...»
      }
    });

    function pushSnapshot() { transport.send({ t: 'snap', snap: store.snapshot() }); }
    function flushOutbox() {
      while (outbox.length) {
        var m = outbox[0];
        if (!transport.send(m)) break;
        outbox.shift();
      }
    }

    // Ο υπάλληλος: κάθε αλλαγή του δημόσιου state → στιγμιότυπο στον πολίτη
    if (role === 'officer') {
      store.subscribe(function (s, l, kind) {
        if (kind !== 'public') return;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(pushSnapshot, 30);   // συνένωση πολλών αλλαγών
      });
    }

    transport.start();

    return {
      pairId: resolvePairId(),
      // Πολίτης → υπάλληλος. Αν δεν υπάρχει σύνδεση, μπαίνει σε ουρά (καμία απώλεια).
      act: function (name, data) {
        var m = { t: 'act', a: name, d: data || null };
        if (!transport.send(m)) outbox.push(m);
      },
      // Στιγμιαία γεγονότα χωρίς αποθήκευση (typing κλπ)
      event: function (name, data) { transport.send({ t: 'ev', n: name, d: data || null }); },
      stop: function () { transport.stop(); }
    };
  }

  global.DiavlosSync = { start: start, resolvePairId: resolvePairId, DEMO_ROOM: DEMO_ROOM };
})(window);
