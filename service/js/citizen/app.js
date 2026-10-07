// /service/js/citizen/app.js — οθόνη πολίτη.
// Μόνο εμφάνιση + αποστολή ενεργειών. Η κατάσταση έρχεται από τον υπάλληλο (πηγή αλήθειας).
(function () {
  'use strict';
  var S = DiavlosState, D = DiavlosData;
  var store = S.createStore();
  var sync = DiavlosSync.start({ role: 'citizen', store: store,
    onEvent: function (n, d) { if (window.DiavlosChat) DiavlosChat.onEvent(n, d); } });
  function act(n, d) { sync.act(n, d); }

  // ---- Τοπική κατάσταση UI (δεν συγχρονίζεται) ----
  var drafts = {};          // μισοσυμπληρωμένα πεδία (δεν χάνονται σε popup/chat)
  var hiddenId = null;      // modal που έκλεισε με [ΠΙΣΩ]
  var showWhere = false;    // «από πού θα το βρω;»
  var okUntil = 0, okText = '', seenOk = null, adopt = true;
  var errEl = null, autoChat = false;

  // ---- Βοηθητικά DOM (χωρίς innerHTML) ----
  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function btn(label, cls, fn) { return h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: fn }, [label]); }
  // Ξαναζωγραφίζει μια περιοχή μόνο όταν αλλάξει η «υπογραφή» της (δεν χάνεται το focus)
  function region(el, sig, build) {
    if (el._sig === sig) return;
    el._sig = sig; el.textContent = '';
    var n = build(); if (n) el.appendChild(n);
  }
  function $(id) { return document.getElementById(id); }
  var spinner = function (txt) { return [h('div', { class: 'spinner', role: 'status' }), h('h2', {}, [txt])]; };

  // ---- Οθόνες ----
  function docsList(t) {
    return h('div', { class: 'list' }, t.docsList.map(function (d) { return h('div', { class: 'card' }, ['📎 ' + d.label]); }));
  }
  function build(st, t) {
    var out = [], p = st.phase;
    if (p === 'welcome') {
      out.push(h('h1', {}, ['Καλώς ήρθατε στα ΚΕΠ ' + D.kepName]),
        h('p', {}, ['Αυτή η συσκευή σας βοηθά να συνεννοηθείτε με τον υπάλληλο γραπτά.']),
        btn('ΕΝΤΑΞΕΙ', 'btn-primary', function () { act('ok'); }));
    } else if (!t) {
      out.push.apply(out, spinner('Περιμένετε...'));
    } else if (p === 'paths') {
      out.push(h('h1', {}, ['Πώς θέλετε να εξυπηρετηθείτε;']), h('div', { class: 'grid' }, [
        btn('💻 Ηλεκτρονικά', '', function () { act('path', { p: 'online' }); }),
        btn('🏛️ Υπάλληλο', '', function () { act('path', { p: 'officer' }); }),
        btn('❓ Δεν ξέρω', '', function () { act('path', { p: 'unknown' }); })]));
    } else if (p === 'online') {
      var qr = h('div', { id: 'qr' });
      out.push(h('h2', {}, ['Αυτή η υπηρεσία εκτελείται μόνο ηλεκτρονικά.']),
        h('p', {}, ['Παρακαλούμε επισκεφθείτε το gov.gr ή σκανάρετε το QR code.']), qr,
        h('h2', {}, ['Μπορώ να σας βοηθήσω σε κάτι άλλο;']),
        h('div', { class: 'grid' }, [btn('ΝΑΙ', 'btn-primary', function () { act('more'); }),
          btn('ΟΧΙ', '', function () { act('end', { r: 'online' }); })]));
      setTimeout(function () {                       // το QR φτιάχνεται αφού μπει στη σελίδα
        var el = $('qr'); if (el && window.QRCode && !el.firstChild) new QRCode(el, { text: D.qrUrl, width: 200, height: 200 });
      }, 0);
    } else if (p === 'category') {
      if (t.redirected) out.push(h('h2', {}, ['Ο υπάλληλος σας κατευθύνει σε νέα ροή']));
      out.push(h('h1', {}, ['Τι υπηρεσία χρειάζεστε;']), h('div', { class: 'grid' }, D.categories.map(function (c) {
        return btn(c.icon + ' ' + c.label, '', function () { act('category', { id: c.id }); });
      })));
    } else if (p === 'service') {
      var cat = D.categories.filter(function (c) { return c.id === t.categoryId; })[0];
      out.push(h('h1', {}, ['Επιλέξτε υπηρεσία']));
      if (cat && cat.services.length) out.push(h('div', { class: 'grid' }, cat.services.map(function (s) {
        return btn(s.label, 'btn-primary', function () { act('service', { id: s.id }); });
      })));
      else out.push(h('p', {}, ['Δεν υπάρχουν διαθέσιμες υπηρεσίες σε αυτή την κατηγορία στο demo.']));
    } else if (p === 'questions') {
      var svc = DiavlosTxnLookup(t), q = svc && svc.questions[t.qIndex];
      if (q) out.push(h('h1', {}, [q.text]), h('div', { class: 'grid' }, (q.answers || ['ΝΑΙ', 'ΟΧΙ']).map(function (a) {
        return btn(a, 'btn-primary', function () { act('answer', { a: a }); });
      })));
    } else if (p === 'docs' || p === 'field') {
      out.push(h('h1', {}, ['Θα χρειαστούν τα παρακάτω έγγραφα']), docsList(t));
      if (st.ball === 'citizen' && (p === 'docs' || hiddenId)) out.push(btn('ΠΡΟΧΩΡΑ', 'btn-primary', function () { hiddenId = null; act('proceed'); }));
    } else if (p === 'waiting') {
      var asked = t.items.filter(function (i) { return i.status !== 'idle'; });
      var pending = asked.some(function (i) { return i.status === 'requested' || i.status === 'submitted' || i.flag; });
      var anyOk = asked.some(function (i) { return i.kind === 'field' && i.status === 'approved'; });
      out.push.apply(out, spinner(!pending && anyOk ? 'Ο υπάλληλος επεξεργάζεται τα στοιχεία σας' : 'Περιμένετε...'));
      if (t.docAsk) out.push(h('h2', {}, ['Ο υπάλληλος ζητάει: ' + t.docAsk]));
    } else if (p === 'missing') {
      out.push(h('h1', {}, ['Λείπουν τα παρακάτω έγγραφα']), h('div', { class: 'list' }, (t.missing || []).map(function (m) {
        return h('div', { class: 'card' }, ['📎 ' + m.label + (showWhere && m.where ? ' — ' + m.where : '')]);
      })), h('div', { class: 'grid' }, [
        btn('ΕΝΤΑΞΕΙ, ΘΑ ΞΑΝΑΕΡΘΩ', 'btn-primary', function () { act('missing_ok'); }),
        btn('ΑΠΟ ΠΟΥ ΘΑ ΤΟ ΒΡΩ;', '', function () { showWhere = !showWhere; render(); })]));
    } else if (p === 'chat') {
      out.push.apply(out, spinner('Ο υπάλληλος θα σας απαντήσει στο chat'));
      out.push(btn('💬 Άνοιγμα chat', 'btn-primary', function () { DiavlosChat.open(); }));
    } else if (p === 'done') {
      out.push(h('h1', {}, ['Ευχαριστούμε. Θα χρειαστείτε κάτι άλλο;']), h('div', { class: 'grid' }, [
        btn('ΝΑΙ, ΚΑΤΙ ΑΛΛΟ', 'btn-primary', function () { act('more'); }),
        btn('ΟΧΙ, ΕΥΧΑΡΙΣΤΩ', '', function () { act('end', { r: 'done' }); })]));
    } else if (p === 'closed') {
      var r = t.endReason, msg = {
        online: 'Σας ευχαριστούμε για την επίσκεψη. Καλή σας μέρα.',
        done: 'Ευχαριστούμε, θα ενημερωθείτε για την πορεία του αιτήματός σας',
        cancelled: 'Η συναλλαγή ακυρώθηκε', timeout: 'Η συνεδρία έληξε. Ευχαριστούμε.',
        missing: 'Σας περιμένουμε ξανά όταν έχετε τα έγγραφα. Καλή σας μέρα.', terminated: 'Η συναλλαγή διακόπηκε. Ευχαριστούμε
      }[r] || 'Ευχαριστούμε.';
      out.push(h('h1', {}, [msg]));
      if (r === 'done' && t.farewell) out.push(h('h2', {}, [t.farewell]));
    }
    return out;
  }
  // Η υπηρεσία της συναλλαγής (ο πολίτης δεν φορτώνει transaction.js)
  function DiavlosTxnLookup(t) {
    for (var i = 0; i < D.categories.length; i++) if (D.categories[i].id === t.categoryId)
      for (var j = 0; j < D.categories[i].services.length; j++) if (D.categories[i].services[j].id === t.serviceId) return D.categories[i].services[j];
    return null;
  }

  // ---- Modal πεδίου ----
  function buildModal(t) {
    var it = S.findItem(t, t.current), f = it && D.fieldByKey(it.key);
    if (!f) return null;
    var input = f.kb === 'date'
      ? h('input', { type: 'date', max: new Date().toISOString().slice(0, 10) })
      : h('input', { type: 'text', inputmode: f.kb === 'numeric' ? 'numeric' : (f.kb === 'latin' ? 'email' : 'text'),
          lang: f.kb === 'greek' ? 'el' : 'en', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '100' });
    input.value = drafts[it.id] || '';
    errEl = h('div', { class: 'err', role: 'alert' }, [t.error ? '✗ ' + t.error : '']);
    input.addEventListener('input', function () { drafts[it.id] = input.value; errEl.textContent = ''; });
    function send() {
      var v = input.value, e = DiavlosValidation.check(it.key, v);       // αυτόματη επικύρωση πρώτα
      if (e) { errEl.textContent = '✗ ' + e; return; }
      delete drafts[it.id]; act('submit', { id: it.id, value: v });
    }
    return h('div', { class: 'modal', role: 'dialog' }, [
      h('h1', {}, [f.label]), h('p', {}, [f.hint]), input, errEl,
      h('div', { class: 'row' }, [
        btn('ΑΠΟΣΤΟΛΗ', 'btn-primary', send),
        btn('ΔΕΝ ΤΟ ΞΕΡΩ', '', function () { delete drafts[it.id]; act('dontknow', { id: it.id }); }),
        btn('ΔΙΑΓΡΑΦΗ', 'btn-danger', function () { delete drafts[it.id]; input.value = ''; act('delete', { id: it.id }); }),
        btn('ΠΙΣΩ', 'btn-secondary', function () { hiddenId = it.id; render(); })])   // χωρίς ενημέρωση υπαλλήλου
    ]);
  }

  // ---- Μπάρα προόδου ----
  function buildBar(t) {
    if (!t || !t.items.length) return null;
    var pr = S.progress(t), box = h('div', { style: 'display:contents' });
    t.items.forEach(function (i) {
      var m = S.STATUS_META[i.status];
      box.appendChild(h('span', { class: 'tab', style: 'border-color:' + m.color + ';color:' + m.color },
        [(i.kind === 'field' ? '📝 ' : '📎 ') + i.label + ' ' + m.symbol]));
    });
    box.appendChild(h('span', { class: 'count' }, ['Ολοκληρώθηκαν ' + pr.done + ' · Απομένουν ' + pr.left]));
    return box;
  }

  // ---- Κεντρική ζωγραφική ----
  function render() {
    var st = store.get(), lo = store.local(), t = st.txn, now = Date.now();
    // Μονοπάτι ❓: ανοίγει απευθείας το chat (μία φορά)
    if (st.phase === 'chat') { if (!autoChat) { autoChat = true; DiavlosChat.open(); } } else autoChat = false;
    if (hiddenId && (!t || t.current !== hiddenId || st.phase !== 'field')) hiddenId = null;

    $('dot').className = 'dot ' + lo.conn;
    $('dot').setAttribute('aria-label', { connected: 'Συνδεδεμένο', disconnected: 'Αποσυνδεδεμένο', reconnecting: 'Επανασύνδεση...' }[lo.conn]);
    region($('connLayer'), 'c' + lo.recovering, function () {
      return lo.recovering ? h('div', { class: 'modal' }, [h('div', { class: 'spinner', style: 'align-self:center' }),
        h('h1', {}, ['Η σύνδεση με το ΚΕΠ διακόπηκε. Παρακαλούμε περιμένετε.'])]) : null;
    });
    region($('bar'), JSON.stringify(t && t.items), function () { return buildBar(t); });

    var nav = ['category', 'service', 'questions', 'docs', 'online'].indexOf(st.phase) >= 0 && st.ball === 'citizen';
    region($('screen'), JSON.stringify([st.phase, t && [t.categoryId, t.serviceId, t.qIndex, t.docsList && t.docsList.length, t.missing, t.endReason, t.farewell, t.redirected, t.docAsk,
        t.items.map(function (i) { return i.status + (i.flag || ''); })], hiddenId, showWhere, st.ball]), function () {
      var box = h('div', { style: 'display:contents' }); build(st, t).forEach(function (n) { box.appendChild(n); });
      return box;
    });
    $('screen').className = (st.phase === 'docs' || st.phase === 'field' || st.phase === 'missing') ? 'top' : '';
    region($('nav'), 'n' + nav + st.phase, function () {
      if (!nav) return null;
      return h('div', { style: 'display:contents' }, [btn('↩ ΠΙΣΩ', 'btn-secondary', function () { act('back'); }),
        btn('🏠 ΑΡΧΙΚΗ', 'btn-secondary', function () { drafts = {}; act('home'); })]);
    });

    // Modal πεδίου: όχι όσο φαίνεται το «εντάξει» (1-2") ή αν ο πολίτης πάτησε [ΠΙΣΩ]
    var showModal = st.phase === 'field' && t && t.current && hiddenId !== t.current && now >= okUntil && !DiavlosChat.isOpen();
    region($('modalLayer'), showModal ? 'm' + t.current + '|' + t.error : 'none', function () { return showModal ? buildModal(t) : null; });
    region($('okLayer'), now < okUntil ? 'ok' + okText : 'none', function () {
      return now < okUntil ? h('div', { class: 'ok-big', role: 'status' }, ['✓ ' + okText]) : null;
    });
    region($('popup'), JSON.stringify(st.popup), function () {      // bubble — το κλείνει ΜΟΝΟ ο υπάλληλος
      if (!st.popup) return null;
      var b = h('div', { class: 'bubble' }, [st.popup.text]);
      b.addEventListener('click', function () { if (window.DiavlosChat) DiavlosChat.open(); });
      return b;
    });
  }

  // ---- Timeout (60" idle όταν η μπάλα είναι στον πολίτη) ----
  var idleT = null, cdT = null, cd = 0, asking = false;
  function idleActive() {
    var st = store.get(), lo = store.local();
    return !!st.txn && st.ball === 'citizen' && st.phase !== 'welcome' && st.phase !== 'closed' && !lo.recovering && lo.conn === 'connected';
  }
  function cancelAsk() { asking = false; clearInterval(cdT); $('idleLayer')._sig = null; $('idleLayer').textContent = ''; }
  function resetIdle() {
    if (asking) return;
    clearTimeout(idleT);
    if (idleActive()) idleT = setTimeout(ask, 60000);
  }
  function ask() {
    if (!idleActive()) return;
    asking = true; cd = 15;
    var num = h('h1', {}, [String(cd)]);
    $('idleLayer').textContent = '';
    $('idleLayer').appendChild(h('div', { class: 'modal' }, [h('h1', {}, ['Είστε ακόμα εκεί;']), num,
      h('div', { class: 'row' }, [
        btn('ΝΑΙ, ΕΙΜΑΙ ΕΔΩ', 'btn-primary', function () { cancelAsk(); resetIdle(); }),
        btn('ΟΧΙ, ΤΕΛΟΣ', 'btn-danger', function () { cancelAsk(); act('timeout_end'); })])]));
    cdT = setInterval(function () {
      cd--; num.textContent = String(cd);
      if (cd <= 0) { cancelAsk(); act('timeout_end'); }
    }, 1000);
  }
  ['pointerdown', 'touchstart', 'keydown', 'input', 'wheel'].forEach(function (e) { document.addEventListener(e, resetIdle, true); });
  document.addEventListener('scroll', resetIdle, true);

  // ---- Σύνδεση με το store ----
  var prevConn = '';
  store.subscribe(function (st, lo, kind) {
    if (kind === 'public') {
      var first = adopt; adopt = false;
      if (st.lastOk && st.lastOk.ts !== seenOk) {            // «ΑΦΜ: εντάξει» 1-2"
        seenOk = st.lastOk.ts;
        if (!first) { okText = st.lastOk.text; okUntil = Date.now() + 1500; setTimeout(render, 1600); }
      }
    }
    if (lo.conn !== prevConn) { if (lo.conn === 'connected') adopt = true; prevConn = lo.conn; }
    if (asking && !idleActive()) cancelAsk();
    render(); resetIdle();
  });
  DiavlosChat.mount({ role: 'citizen', store: store, sync: sync, onChange: render });
  render();
})();
