// service/js/core/state.js
// Μηχανή κατάστασης (state engine) του Δίαυλος Service.
// Καμία γνώση δικτύου εδώ. Τα δεδομένα μένουν ΜΟΝΟ στη μνήμη (όχι αποθήκευση).
(function (global) {
  'use strict';

  // Καταστάσεις στοιχείου (πεδίου ή εγγράφου) + χρώμα + εικονίδιο (WCAG 1.4.1: όχι μόνο χρώμα)
  // icon = όνομα εικονιδίου από το vendor/icons-sprite.svg (null = μόνο κείμενο)
  var STATUS_META = {
    idle:      { label: 'Δεν ζητήθηκε',      color: '#475569', icon: null },
    requested: { label: 'Εκκρεμεί',          color: '#B45309', icon: null },
    submitted: { label: 'Περιμένει έγκριση', color: '#B45309', icon: null },
    approved:  { label: 'Εγκρίθηκε',         color: '#047857', icon: 'check' },
    rejected:  { label: 'Απορρίφθηκε',       color: '#B91C1C', icon: 'x' },
    skipped:   { label: 'Δεν δόθηκε',        color: '#475569', icon: null }
  };

  // Φάσεις οθόνης πολίτη
  //   home     = αρχική (αναζήτηση + δημοφιλή + κατηγορίες)
  //   category = λίστα υπηρεσιών μιας κατηγορίας
  //   questions = ερωτήσεις διευκρίνισης (μία-μία)
  //   waiting  = «Περιμένετε...» (η μπάλα στον υπάλληλο)
  var PHASES = ['welcome', 'home', 'category', 'questions', 'waiting', 'field',
    'missing', 'chat', 'done', 'closed'];

  function initialPublicState() {
    return {
      phase: 'welcome',     // τρέχουσα φάση οθόνης πολίτη
      txn: null,            // ενεργή συναλλαγή (βλ. newTransaction)
      chat: [],             // ιστορικό chat {from:'citizen'|'officer', text, ts}
      popup: null,          // bubble που στέλνει ο υπάλληλος {text, sub?, ts}
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
      origin: null,               // από πού διάλεξε υπηρεσία: 'home' | 'category' (για το ΠΙΣΩ)
      catalogOnly: false,         // true = υπηρεσία χωρίς ροή, συνεχίζει στο chat
      answers: [],                // [{q, a}] ερωτήσεις διευκρίνισης
      qIndex: 0,                  // ποια ερώτηση απαντά τώρα
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
  // Μπάρα προόδου πολίτη: ΜΟΝΟ τα πεδία που εγκρίθηκε, με τη σειρά έγκρισης.
  // Δεν υπάρχει «πόσα μένουν» και δεν μπαίνουν έγγραφα.
  function approvedFields(txn) {
    return txn.items.filter(function (i) { return i.kind === 'field' && i.status === 'approved'; })
      .sort(function (a, b) { return (a.approvedAt || 0) - (b.approvedAt || 0); });
  }

  global.DiavlosState = {
    STATUS_META: STATUS_META, PHASES: PHASES,
    createStore: createStore, newTransaction: newTransaction,
    findItem: findItem, upsertItem: upsertItem, setStatus: setStatus, approvedFields: approvedFields
  };
})(window);