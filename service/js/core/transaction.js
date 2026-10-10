// service/js/core/transaction.js
// Μοντέλο συναλλαγής: όλοι οι κανόνες ροής. Τρέχει ΜΟΝΟ στον υπάλληλο (πηγή αλήθειας).
// Ο πολίτης στέλνει ενέργειες -> act(). Ο υπάλληλος χρησιμοποιεί τις εντολές του (requestField κλπ).
// Καμία γνώση δικτύου εδώ.
(function (global) {
  'use strict';
  var S = global.DiavlosState;

  // Λόγοι απόρριψης εγγράφου (ο υπάλληλος διαλέγει έναν)
  var DOC_REJECT_REASONS = ['Δεν είναι ευανάγνωστο', 'Είναι ληγμένο', 'Δεν είναι το σωστό έγγραφο', 'Είναι ελλιπές'];

  function formatId(n) { return '#' + (n < 10 ? '0' : '') + n; }
  function now() { return Date.now(); }

  function findService(txn) {
    return txn && txn.serviceId ? global.DiavlosData.serviceById(txn.serviceId) : null;
  }

  // Ετικέτα εγγράφου: πρώτα από τα έγγραφα της υπηρεσίας, μετά από τη γενική λίστα
  function docLabel(txn, key) {
    var svc = findService(txn), label = key;
    global.DiavlosData.allDocs().forEach(function (d) { if (d.key === key) label = d.label; });
    if (svc) svc.docs.forEach(function (d) { if (d.key === key) label = d.label; });
    return label;
  }

  // Λίστα αναφοράς για τον ΥΠΑΛΛΗΛΟ: τα έγγραφα της υπηρεσίας + η κατάστασή τους.
  // Ο πολίτης δεν βλέπει ποτέ αυτή τη λίστα.
  function officerDocs(txn) {
    var svc = findService(txn);
    if (!svc) return [];
    return svc.docs.map(function (d) {
      var it = S.findItem(txn, 'doc:' + d.key);
      return { id: 'doc:' + d.key, key: d.key, label: d.label, status: it ? it.status : 'idle' };
    });
  }

  // Επόμενο πεδίο που περιμένει τον πολίτη (όχι «δεν ξέρω» / «διαγράφηκε»)
  function nextAskable(txn) {
    for (var i = 0; i < txn.items.length; i++) {
      var it = txn.items[i];
      if (it.kind === 'field' && !it.flag && (it.status === 'requested' || it.status === 'rejected')) return it;
    }
    return null;
  }
  // Ορίζει τι βλέπει ο πολίτης μετά από αλλαγή στην ουρά πεδίων
  function syncQueue(st) {
    var nxt = nextAskable(st.txn);
    st.txn.current = nxt ? nxt.id : null;
    st.phase = nxt ? 'field' : 'waiting';
    st.ball = nxt ? 'citizen' : 'officer';
  }
  function endTxn(st, reason) {
    st.phase = 'closed'; st.ball = 'officer';
    if (st.txn) st.txn.endReason = reason;
    if (reason === 'done') st.stats.done++; else st.stats.cancelled++;
  }

  // ---------- Ενέργειες ΠΟΛΙΤΗ ----------
  function act(store, name, d) {
    d = d || {};
    store.update(function (st) {
      var t = st.txn, it, svc;
      switch (name) {
        case 'ok':                                    // [ΕΝΤΑΞΕΙ] στο welcome
          if (st.phase !== 'welcome') return;
          st.stats.total++; st.txn = S.newTransaction(st.stats.total);
          st.phase = 'home'; st.ball = 'citizen'; break;
        case 'unknown':                               // [Δεν ξέρω] -> chat με τον υπάλληλο
          if (!t) return;
          t.catalogOnly = false; st.phase = 'chat'; st.ball = 'officer'; break;
        case 'more':                                  // «ΝΑΙ, ΚΑΤΙ ΑΛΛΟ»
          if (!t) return;
          st.phase = 'home'; st.ball = 'citizen'; break;
        case 'end':                                   // «ΟΧΙ, ΕΥΧΑΡΙΣΤΩ»
          if (!t) return;
          endTxn(st, 'done'); break;
        case 'timeout_end':                           // «ΟΧΙ, ΤΕΛΟΣ» στο «Είστε ακόμα εκεί;»
          if (!t) return;
          endTxn(st, 'timeout'); st.banner = 'Ο πολίτης τερμάτισε τη συνεδρία'; break;
        case 'category':                              // κατηγορία -> λίστα υπηρεσιών της
          if (!t) return;
          t.categoryId = d.id; st.phase = 'category'; break;
        case 'service':                               // από αναζήτηση, δημοφιλές ή κατηγορία
          if (!t) return;
          svc = global.DiavlosData.serviceById(d.id);
          if (!svc) return;
          t.origin = st.phase === 'category' ? 'category' : 'home';
          t.serviceId = svc.id; t.categoryId = svc.categoryId;
          t.answers = []; t.qIndex = 0; t.error = null;
          if (svc.status !== 'implemented') {         // υπηρεσία χωρίς ροή: συνεχίζει στο chat
            t.catalogOnly = true; st.phase = 'chat'; st.ball = 'officer';
            st.chat.push({ from: 'citizen', text: ('Ενδιαφέρομαι για: ' + svc.label).slice(0, 300), ts: now() });
          } else {
            t.catalogOnly = false;
            if (svc.questions.length) { st.phase = 'questions'; st.ball = 'citizen'; }
            else syncQueue(st);                       // κατευθείαν «Περιμένετε...»
          }
          break;
        case 'answer':
          if (!t || st.phase !== 'questions') return;
          svc = findService(t); if (!svc) return;
          var q = svc.questions[t.qIndex];
          if (!q || q.answers.indexOf(d.a) < 0) return;   // μόνο έγκυρη απάντηση
          t.answers.push({ q: q.text, a: d.a }); t.qIndex++;
          if (t.qIndex >= svc.questions.length) syncQueue(st);   // τέλος ερωτήσεων: η μπάλα στον υπάλληλο
          break;
        case 'proceed':                               // ο πολίτης κλείνει το modal πεδίου -> αναμονή
          if (!t) return;
          if (st.phase === 'field') { st.phase = 'waiting'; st.ball = 'officer'; }
          else if (st.phase === 'waiting') syncQueue(st);
          break;
        case 'submit':                                // [ΑΠΟΣΤΟΛΗ] πεδίου
          if (!t) return;
          it = S.findItem(t, d.id); if (!it || it.kind !== 'field') return;
          var err = global.DiavlosValidation.check(it.key, d.value);
          if (err) { t.error = err; return; }        // ίδιο πεδίο ανοιχτό για διόρθωση
          it.value = String(d.value).trim(); it.status = 'submitted'; it.flag = ''; t.error = null;
          t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'dontknow':                              // [ΔΕΝ ΤΟ ΞΕΡΩ] -> σήμα υπαλλήλου
          if (!t) return;
          it = S.findItem(t, d.id); if (!it) return;
          it.flag = 'dontknow'; it.value = ''; t.error = null; t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'delete':                                // [ΔΙΑΓΡΑΦΗ] -> σβήνει, περιμένει νέα οδηγία
          if (!t) return;
          it = S.findItem(t, d.id); if (!it) return;
          it.flag = 'deleted'; it.value = ''; t.error = null; t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'missing_ok':                            // [ΕΝΤΑΞΕΙ, ΘΑ ΞΑΝΑΕΡΘΩ]
          if (!t) return; endTxn(st, 'missing'); break;
        case 'home':                                  // [ΑΡΧΙΚΗ] σβήνει όλα
          if (!t) return;
          st.txn = S.newTransaction(t.id); st.chat = []; st.popup = null;
          st.phase = 'home'; st.ball = 'citizen'; break;
        case 'back':                                  // [ΠΙΣΩ] βήμα-βήμα
          if (!t) return;
          if (st.phase === 'category') st.phase = 'home';
          else if (st.phase === 'questions') {
            if (t.qIndex > 0) { t.answers.pop(); t.qIndex--; }
            else { st.phase = t.origin || 'home'; t.serviceId = null; }
          } else if (st.phase === 'chat') {
            st.phase = t.catalogOnly ? (t.origin || 'home') : 'home';
            st.ball = 'citizen'; t.catalogOnly = false; t.serviceId = null;
          }
          break;
        case 'chat':
          if (!d.text) return;
          st.chat.push({ from: 'citizen', text: String(d.text).slice(0, 300), ts: now() }); break;
      }
    });
  }

  // ---------- Εντολές ΥΠΑΛΛΗΛΟΥ ----------
  function requestField(store, key) {
    store.update(function (st) {
      var t = st.txn, f = global.DiavlosData.fieldByKey(key);
      if (!t || !f) return;
      var it = S.upsertItem(t, 'field', key, f.label);
      if (it.status === 'approved') { it.status = 'requested'; it.value = ''; it.approvedAt = 0; }
      else if (it.status === 'idle') it.status = 'requested';
      it.flag = '';
      // Interrupt: αν ο πολίτης ήδη γράφει, δεν χάνει το κείμενο - ειδοποίηση και ουρά
      if (st.phase === 'field' && t.current && t.current !== it.id) {
        st.popup = { text: 'Ο υπάλληλος ζητάει: ' + f.label, ts: now(), system: true };
      } else if (st.phase === 'waiting') syncQueue(st);
    });
  }
  function requestDoc(store, key) {
    store.update(function (st) {
      var t = st.txn; if (!t) return;
      var it = S.upsertItem(t, 'doc', key, docLabel(t, key), 'requested');
      it.reason = '';
      t.docAsk = it.label;
      st.popup = { text: 'Ο υπάλληλος ζητάει: ' + it.label, ts: now(), system: true };
    });
  }
  // Έγκριση πεδίου ή εγγράφου. Η έγκριση πεδίου προσθέτει πράσινο tab στη μπάρα προόδου.
  function approve(store, id) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id); if (!it) return;
      it.status = 'approved'; it.flag = '';
      if (it.kind === 'field') {
        it.approvedAt = now();
        st.lastOk = { text: it.label + ': εντάξει', ts: now() };
        if (st.phase === 'waiting') syncQueue(st);
      } else if (t.docAsk === it.label) t.docAsk = null;
    });
  }
  // Απόρριψη ΠΕΔΙΟΥ: errIdx 0-2 = ένα από τα 3 μηνύματα -> ξανανοίγει το modal. Δεν αλλάζει η μπάρα.
  function reject(store, id, errIdx) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id); if (!it || it.kind !== 'field') return;
      it.status = 'rejected'; it.flag = '';
      t.error = global.DiavlosValidation.MESSAGES[errIdx || 0];
      t.current = it.id; st.phase = 'field'; st.ball = 'citizen';
    });
  }
  // Απόρριψη ΕΓΓΡΑΦΟΥ με λόγο (0-3 από DOC_REJECT_REASONS). Το popup μένει μέχρι να το κλείσει ο υπάλληλος.
  function rejectDoc(store, id, reasonIdx) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id), reason = DOC_REJECT_REASONS[reasonIdx];
      if (!it || it.kind !== 'doc' || !reason) return;
      it.status = 'rejected'; it.reason = reason; it.flag = '';
      if (t.docAsk === it.label) t.docAsk = null;
      st.popup = { text: 'Δεν έγινε δεκτό: ' + reason, sub: it.label, ts: now(), system: true, sticky: true };
    });
  }
  // Μετά από [ΔΕΝ ΤΟ ΞΕΡΩ]: 'cancel' | 'repeat' | 'skip'
  function decideDontKnow(store, id, choice) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id); if (!it) return;
      it.flag = '';
      if (choice === 'cancel') it.status = 'idle';
      else if (choice === 'skip') it.status = 'skipped';       // στο PDF: «δεν δόθηκε»
      else it.status = 'requested';                            // repeat
      if (st.phase === 'waiting') syncQueue(st);
    });
  }
  // [ΕΝΗΜΕΡΩΣΕ ΓΙΑ ΕΛΛΕΙΨΗ] - keys = κλειδιά εγγράφων που λείπουν
  function missing(store, keys) {
    store.update(function (st) {
      var t = st.txn; if (!t) return;
      t.missing = (keys || []).map(function (key) {
        var g = global.DiavlosData.docGroupOf(key);
        return { key: key, label: docLabel(t, key), where: g ? g.where : '' };
      });
      st.phase = 'missing'; st.ball = 'citizen';
    });
  }
  // Ο υπάλληλος συνεχίζει χωρίς το έγγραφο
  function proceedAfterMissing(store) {
    store.update(function (st) { if (st.phase === 'missing') { st.txn.missing = []; syncQueue(st); } });
  }
  function terminate(store) { store.update(function (st) { if (st.txn) endTxn(st, 'terminated'); }); }   // [ΔΙΑΚΟΠΗ]
  // [ΜΕΤΑΦΟΡΑ ΣΕ ΡΟΗ ΥΠΗΡΕΣΙΑΣ]: ο πολίτης επιστρέφει στην αρχική οθόνη για να διαλέξει υπηρεσία
  function redirect(store) { store.update(function (st) { if (st.txn) { st.txn.redirected = true; st.txn.catalogOnly = false; st.phase = 'home'; st.ball = 'citizen'; } }); }
  // [ΕΠΙΒΕΒΑΙΩΣΗ ΤΕΛΟΥΣ] - farewell = προαιρετικό μήνυμα προς τον πολίτη
  function confirmEnd(store, farewell) {
    store.update(function (st) { if (st.txn) { st.txn.farewell = farewell || ''; st.phase = 'done'; st.ball = 'citizen'; } });
  }
  // [ΕΠΑΝΑΦΟΡΑ] μετά την επιβεβαίωση «Να χαθούν τα δεδομένα;»
  function cancelAll(store) {
    store.update(function (st) { if (st.txn) endTxn(st, 'cancelled'); });
    autoReset(store, 2500);                                    // «Η συναλλαγή ακυρώθηκε» 2-3"
  }
  function autoReset(store, ms) { setTimeout(function () { store.reset(); }, ms); }
  // Κλείσιμο banner / τέλος συναλλαγής -> οθόνη welcome ξανά
  function dismiss(store) { store.reset(); }
  // Μήνυμα υπαλλήλου: chat + popup bubble (σύνοψη 60 χαρακτήρων)
  function say(store, text) {
    store.update(function (st) {
      text = String(text || '').slice(0, 300); if (!text) return;
      st.chat.push({ from: 'officer', text: text, ts: now() });
      st.popup = { text: text.length > 60 ? text.slice(0, 60) + '\u2026' : text, ts: now() };
    });
  }
  function closePopup(store) { store.update(function (st) { st.popup = null; }); }   // το κλείνει ΜΟΝΟ ο υπάλληλος

  global.DiavlosTxn = {
    formatId: formatId, findService: findService, officerDocs: officerDocs, DOC_REJECT_REASONS: DOC_REJECT_REASONS,
    act: act, requestField: requestField, requestDoc: requestDoc, approve: approve, reject: reject, rejectDoc: rejectDoc,
    decideDontKnow: decideDontKnow, missing: missing, proceedAfterMissing: proceedAfterMissing,
    terminate: terminate, redirect: redirect, confirmEnd: confirmEnd, cancelAll: cancelAll,
    dismiss: dismiss, say: say, closePopup: closePopup
  };
})(window);