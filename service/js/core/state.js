// /service/js/core/state.js
// Μηχανή κατάστασης (state engine) του Δίαυλος Service.
// Καμία γνώση δικτύου εδώ. Τα δεδομένα μένουν ΜΟΝΟ στη μνήμη (όχι αποθήκευση).
(function (global) {
  'use strict';

  // Καταστάσεις στοιχείου (πεδίου ή εγγράφου) + χρώμα + σύμβολο (WCAG 1.4.1)
  var STATUS_META = {
    idle:      { label: 'Δεν ζητήθηκε', color: '#475569', symbol: '—' },
    requested: { label: 'Εκκρεμεί',     color: '#B45309', symbol: '⏳' },
    submitted: { label: 'Περιμένει έγκριση', color: '#B45309', symbol: '⏳' },
    approved:  { label: 'Εγκρίθηκε',    color: '#047857', symbol: '✓' },
    rejected:  { label: 'Απορρίφθηκε',  color: '#B91C1C', symbol: '✗' },
    skipped:   { label: 'Δεν δόθηκε',   color: '#475569', symbol: '—' }
  };

  // Φάσεις οθόνης πολίτη
  var PHASES = ['locked', 'welcome', 'paths', 'online', 'category', 'service',
    'questions', 'docs', 'waiting', 'field', 'missing', 'redirect', 'chat',
    'done', 'closed'];

  function initialPublicState() {
    return {
      phase: 'locked',      // τρέχουσα φάση οθόνης πολίτη
      txn: null,            // ενεργή συναλλαγή (βλ. newTransaction)
      chat: [],             // ιστορικό chat {from:'citizen'|'officer', text, ts}
      popup: null,          // bubble που στέλνει ο υπάλληλος {text, ts}
      ball: 'citizen',      // ποιος έχει τη «μπάλα»: 'citizen' | 'officer'
      lastOk: null,         // μήνυμα «ΑΦΜ: εντάξει» (1-2")
      banner: null,         // banner υπαλλήλου (π.χ. «Ο πολίτης τερμάτισε τη συνεδρία»)
      stats: { total: 0, done: 0, cancelled: 0 }
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Δημιουργία νέας συναλλαγής
  function newTransaction(number) {
    return {
      id: number,                 // αριθμός συναλλαγής (#01...)
      startedAt: Date.now(),
      categoryId: null,
      serviceId: null,
      answers: [],                // [{q, a}] ερωτήσεις διευκρίνισης
      docsList: [],               // έγγραφα που θα ζητηθούν (μόνο προβολή)
      items: [],                  // [{id, kind:'field'|'doc', key, label, status, value}]
      current: null,              // id στοιχείου που ζητείται τώρα
      error: null                 // μήνυμα λάθους επικύρωσης (ένα από τα 3)
    };
  }

  function createStore() {
    var pub = initialPublicState();
    // Τοπική κατάσταση — ΔΕΝ συγχρονίζεται (σύνδεση, ανάκτηση)
    var local = { conn: 'disconnected', recovering: false };
    var subs = [];

    function notify(kind) {
      subs.slice().forEach(function (fn) { try { fn(pub, local, kind); } catch (e) { console.error(e); } });
    }

    var api = {
      get: function () { return pub; },
      local: function () { return local; },
      // Αλλαγή δημόσιου state: fn(state) το τροποποιεί απευθείας
      update: function (fn) { fn(pub); notify('public'); },
      // Αλλαγή τοπικού state
      setLocal: function (patch) { Object.assign(local, patch); notify('local'); },
      subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      // Στιγμιότυπο για συγχρονισμό (μόνο το δημόσιο μέρος)
      snapshot: function () { return clone(pub); },
      // Αντικατάσταση από στιγμιότυπο του υπαλλήλου
      restore: function (snap) { pub = Object.assign(initialPublicState(), clone(snap)); notify('public'); },
      // Πλήρης επαναφορά (reset) — κρατά μόνο τα ανώνυμα στατιστικά
      reset: function () { var st = pub.stats; pub = initialPublicState(); pub.stats = st; notify('public'); }
    };
    return api;
  }

  // ---- Βοηθητικά συναλλαγής ----
  function findItem(txn, id) {
    for (var i = 0; i < txn.items.length; i++) if (txn.items[i].id === id) return txn.items[i];
    return null;
  }
  // Προσθήκη/ανανέωση στοιχείου: kind 'field' ή 'doc'
  function upsertItem(txn, kind, key, label, status) {
    var id = kind + ':' + key;
    var it = findItem(txn, id);
    if (!it) { it = { id: id, kind: kind, key: key, label: label, status: 'idle', value: '' }; txn.items.push(it); }
    if (status) it.status = status;
    return it;
  }
  function setStatus(txn, id, status) {
    var it = findItem(txn, id);
    if (it) it.status = status;
    return it;
  }
  // Πρόοδος: πόσα ολοκληρώθηκαν / πόσα μένουν (μόνο όσα έχουν ζητηθεί)
  function progress(txn) {
    var asked = txn.items.filter(function (i) { return i.status !== 'idle'; });
    var done = asked.filter(function (i) { return i.status === 'approved' || i.status === 'skipped'; }).length;
    return { done: done, total: asked.length, left: asked.length - done };
  }

  global.DiavlosState = {
    STATUS_META: STATUS_META, PHASES: PHASES,
    createStore: createStore, newTransaction: newTransaction,
    findItem: findItem, upsertItem: upsertItem, setStatus: setStatus, progress: progress
  };
})(window);
