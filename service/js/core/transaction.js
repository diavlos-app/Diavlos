// /service/js/core/transaction.js
// Μοντέλο συναλλαγής: όλοι οι κανόνες ροής. Τρέχει ΜΟΝΟ στον υπάλληλο (πηγή αλήθειας).
// Ο πολίτης στέλνει ενέργειες → act(). Ο υπάλληλος χρησιμοποιεί τις εντολές του (requestField κλπ).
// Καμία γνώση δικτύου εδώ.
(function (global) {
  'use strict';
  var S = global.DiavlosState;

  function formatId(n) { return '#' + (n < 10 ? '0' : '') + n; }
  function now() { return Date.now(); }

  function findService(txn) {
    var cats = global.DiavlosData.categories;
    for (var i = 0; i < cats.length; i++) if (cats[i].id === txn.categoryId) {
      for (var j = 0; j < cats[i].services.length; j++) if (cats[i].services[j].id === txn.serviceId) return cats[i].services[j];
    }
    return null;
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
  function enterDocs(txn, svc) {
    txn.docsList = svc.docs.map(function (d) { return { key: d.key, label: d.label }; });
    txn.docsList.forEach(function (d) { S.upsertItem(txn, 'doc', d.key, d.label); });   // γκρι στη μπάρα προόδου
  }
  function endTxn(st, reason) {
    st.phase = 'closed'; st.ball = 'officer';
    if (st.txn) st.txn.endReason = reason;
    if (reason === 'done' || reason === 'online') st.stats.done++; else st.stats.cancelled++;
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
          st.phase = 'paths'; st.ball = 'citizen'; break;
        case 'path':
          if (!t) return;
          if (d.p === 'online') { st.phase = 'online'; }
          else if (d.p === 'unknown') { st.phase = 'chat'; st.ball = 'officer'; }
          else { st.phase = 'category'; }
          break;
        case 'more': st.phase = 'paths'; st.ball = 'citizen'; break;     // «ΝΑΙ, ΚΑΤΙ ΑΛΛΟ» / «ΝΑΙ»
        case 'end':                                   // «ΟΧΙ» (online) ή «ΟΧΙ, ΕΥΧΑΡΙΣΤΩ»
          if (!t) return;
          endTxn(st, d.r === 'online' ? 'online' : 'done');
          if (global.DiavlosTxn._autoReset && d.r === 'online') global.DiavlosTxn._autoReset(store, 5000);
          break;
        case 'timeout_end':                           // «ΟΧΙ, ΤΕΛΟΣ» στο «Είστε ακόμα εκεί;»
          if (!t) return;
          endTxn(st, 'timeout'); st.banner = 'Ο πολίτης τερμάτισε τη συνεδρία'; break;
        case 'category': if (!t) return; t.categoryId = d.id; st.phase = 'service'; break;
        case 'service':
          if (!t) return;
          t.serviceId = d.id; t.answers = []; t.qIndex = 0; svc = findService(t);
          if (!svc) return;
          if (svc.questions.length) st.phase = 'questions'; else { enterDocs(t, svc); st.phase = 'docs'; }
          break;
        case 'answer':
          if (!t || st.phase !== 'questions') return;
          svc = findService(t); if (!svc) return;
          t.answers.push({ q: svc.questions[t.qIndex].text, a: d.a }); t.qIndex++;
          if (t.qIndex >= svc.questions.length) { enterDocs(t, svc); st.phase = 'docs'; }
          break;
        case 'proceed':                               // [ΠΡΟΧΩΡΑ] → η μπάλα στον υπάλληλο
          if (!t) return;
          st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'submit':                                // [ΑΠΟΣΤΟΛΗ] πεδίου
          if (!t) return;
          it = S.findItem(t, d.id); if (!it || it.kind !== 'field') return;
          var err = global.DiavlosValidation.check(it.key, d.value);
          if (err) { t.error = err; return; }        // ίδιο πεδίο ανοιχτό για διόρθωση
          it.value = String(d.value).trim(); it.status = 'submitted'; it.flag = ''; t.error = null;
          t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'dontknow':                              // [ΔΕΝ ΤΟ ΞΕΡΩ] → σήμα υπαλλήλου
          if (!t) return;
          it = S.findItem(t, d.id); if (!it) return;
          it.flag = 'dontknow'; it.value = ''; t.error = null; t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'delete':                                // [ΔΙΑΓΡΑΦΗ] → σβήνει, περιμένει νέα οδηγία
          if (!t) return;
          it = S.findItem(t, d.id); if (!it) return;
          it.flag = 'deleted'; it.value = ''; t.error = null; t.current = null; st.phase = 'waiting'; st.ball = 'officer'; break;
        case 'missing_ok':                            // [ΕΝΤΑΞΕΙ, ΘΑ ΞΑΝΑΕΡΘΩ]
          if (!t) return; endTxn(st, 'missing'); break;
        case 'home':                                  // [🏠 ΑΡΧΙΚΗ] σβήνει όλα
          if (!t) return;
          st.txn = S.newTransaction(t.id); st.chat = []; st.popup = null;
          st.phase = 'paths'; st.ball = 'citizen'; break;
        case 'back':                                  // [↩ ΠΙΣΩ] βήμα-βήμα
          if (!t) return;
          if (st.phase === 'online' || st.phase === 'category') st.phase = 'paths';
          else if (st.phase === 'service') st.phase = 'category';
          else if (st.phase === 'questions' || st.phase === 'docs') {
            svc = findService(t);
            if (st.phase === 'docs') {               // καθάρισμα εγγράφων που δεν έχουν ζητηθεί
              t.items = t.items.filter(function (i) { return !(i.kind === 'doc' && i.status === 'idle'); });
              t.docsList = [];
              if (svc && svc.questions.length) { t.answers.pop(); t.qIndex = svc.questions.length - 1; st.phase = 'questions'; }
              else st.phase = 'service';
            } else if (t.qIndex > 0) { t.answers.pop(); t.qIndex--; }
            else st.phase = 'service';
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
      if (it.status === 'approved') { it.status = 'requested'; it.value = ''; }
      else if (it.status === 'idle') it.status = 'requested';
      it.flag = '';
      // Interrupt: αν ο πολίτης ήδη γράφει, δεν χάνει το κείμενο — ειδοποίηση και ουρά
      if (st.phase === 'field' && t.current && t.current !== it.id) {
        st.popup = { text: 'Ο υπάλληλος ζητάει: ' + f.label, ts: now(), system: true };
      } else if (st.phase === 'waiting' || st.phase === 'docs') syncQueue(st);
    });
  }
  function requestDoc(store, key) {
    store.update(function (st) {
      var t = st.txn; if (!t) return;
      var all = global.DiavlosData.allDocs(), label = key;
      all.forEach(function (d) { if (d.key === key) label = d.label; });
      t.docsList.forEach(function (d) { if (d.key === key) label = d.label; });
      var it = S.upsertItem(t, 'doc', key, label, 'requested');
      t.docAsk = it.label;
      st.popup = { text: 'Ο υπάλληλος ζητάει: ' + it.label, ts: now(), system: true };
    });
  }
  // Έγκριση πεδίου ή εγγράφου
  function approve(store, id) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id); if (!it) return;
      it.status = 'approved'; it.flag = '';
      if (it.kind === 'field') { st.lastOk = { text: it.label + ': εντάξει', ts: now() }; if (st.phase === 'waiting') syncQueue(st); }
      else if (t.docAsk === it.label) t.docAsk = null;
    });
  }
  // Απόρριψη. Πεδίο: errIdx 0-2 = ένα από τα 3 μηνύματα → ξανανοίγει το modal. Έγγραφο: κόκκινο.
  function reject(store, id, errIdx) {
    store.update(function (st) {
      var t = st.txn, it = t && S.findItem(t, id); if (!it) return;
      it.status = 'rejected'; it.flag = '';
      if (it.kind === 'field') {
        t.error = global.DiavlosValidation.MESSAGES[errIdx || 0];
        t.current = it.id; st.phase = 'field'; st.ball = 'citizen';
      }
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
  // [ΕΝΗΜΕΡΩΣΕ ΓΙΑ ΕΛΛΕΙΨΗ] — keys = κλειδιά εγγράφων που λείπουν
  function missing(store, keys) {
    store.update(function (st) {
      var t = st.txn; if (!t) return;
      t.missing = (t.docsList || []).filter(function (d) { return keys.indexOf(d.key) >= 0; }).map(function (d) {
        var g = global.DiavlosData.docGroupOf(d.key);
        return { key: d.key, label: d.label, where: g ? g.where : '' };
      });
      st.phase = 'missing'; st.ball = 'citizen';
    });
  }
  // Ο υπάλληλος συνεχίζει χωρίς το έγγραφο
  function proceedAfterMissing(store) {
    store.update(function (st) { if (st.phase === 'missing') { st.txn.missing = []; syncQueue(st); } });
  }
  function terminate(store) { store.update(function (st) { if (st.txn) endTxn(st, 'terminated'); }); }   // [ΔΙΑΚΟΠΗ]
  function redirect(store) { store.update(function (st) { if (st.txn) { st.txn.redirected = true; st.phase = 'category'; st.ball = 'citizen'; } }); }
  // [ΕΠΙΒΕΒΑΙΩΣΗ ΤΕΛΟΥΣ] — farewell = προαιρετικό μήνυμα προς τον πολίτη
  function confirmEnd(store, farewell) {
    store.update(function (st) { if (st.txn) { st.txn.farewell = farewell || ''; st.phase = 'done'; st.ball = 'citizen'; } });
  }
  // [↺ ΕΠΑΝΑΦΟΡΑ] μετά την επιβεβαίωση «Να χαθούν τα δεδομένα;»
  function cancelAll(store) {
    store.update(function (st) { if (st.txn) endTxn(st, 'cancelled'); });
    autoReset(store, 2500);                                    // «Η συναλλαγή ακυρώθηκε» 2-3"
  }
  function autoReset(store, ms) { setTimeout(function () { store.reset(); }, ms); }
  // Κλείσιμο banner / τέλος συναλλαγής → οθόνη welcome ξανά
  function dismiss(store) { store.reset(); }
  // Μήνυμα υπαλλήλου: chat + popup bubble (σύνοψη 60 χαρακτήρων)
  function say(store, text) {
    store.update(function (st) {
      text = String(text || '').slice(0, 300); if (!text) return;
      st.chat.push({ from: 'officer', text: text, ts: now() });
      st.popup = { text: text.length > 60 ? text.slice(0, 60) + '…' : text, ts: now() };
    });
  }
  function closePopup(store) { store.update(function (st) { st.popup = null; }); }   // το κλείνει ΜΟΝΟ ο υπάλληλος

  global.DiavlosTxn = {
    formatId: formatId, findService: findService, act: act, _autoReset: autoReset,
    requestField: requestField, requestDoc: requestDoc, approve: approve, reject: reject,
    decideDontKnow: decideDontKnow, missing: missing, proceedAfterMissing: proceedAfterMissing,
    terminate: terminate, redirect: redirect, confirmEnd: confirmEnd, cancelAll: cancelAll,
    dismiss: dismiss, say: say, closePopup: closePopup
  };
})(window);
