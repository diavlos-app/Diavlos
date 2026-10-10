// service/js/citizen/app.js — οθόνη πολίτη.
// Μόνο εμφάνιση + αποστολή ενεργειών. Η κατάσταση έρχεται από τον υπάλληλο (πηγή αλήθειας).
(function () {
  'use strict';
  var S = DiavlosState, D = DiavlosData, Se = DiavlosSearch;
  var store = S.createStore();
  var sync = DiavlosSync.start({ role: 'citizen', store: store,
    onEvent: function (n, d) { if (window.DiavlosChat) DiavlosChat.onEvent(n, d); } });
  function act(n, d) { sync.act(n, d); }

  var SPRITE = 'vendor/icons-sprite.svg';
  var IDLE_MS = 90000;
  var IDLE_COUNTDOWN = 15;

  var drafts = {};
  var hiddenId = null;
  var showWhere = false;
  var query = '';
  var okUntil = 0, okText = '', seenOk = null, adopt = true;
  var errEl = null, autoChat = false;

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
  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : '')); svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', SPRITE + '#i-' + name); svg.appendChild(use);
    return svg;
  }
  function btn(label, cls, fn, iconName) {
    return h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: fn },
      iconName ? [icon(iconName), h('span', {}, [label])] : [label]);
  }
  function region(el, sig, build) {
    if (el._sig === sig) return;
    el._sig = sig; el.textContent = '';
    var n = build(); if (n) el.appendChild(n);
  }
  function $(id) { return document.getElementById(id); }
  var spinner = function (txt) { return [h('div', { class: 'spinner', role: 'status' }), h('h2', {}, [txt])]; };
  function setErr(el, msg) {
    el.textContent = '';
    if (msg) { el.appendChild(icon('x', 'icon-inline')); el.appendChild(document.createTextNode(' ' + msg)); }
  }
  function openChat() { if (window.DiavlosChat) DiavlosChat.open(); }

  function buildHome(t) {
    var T = Se.TIMING, timerSearch = null, timerFallback = null;
    var box = h('div', { class: 'home' });

    var input = h('input', { type: 'text', id: 'q', class: 'search', placeholder: 'Γράψτε τι θέλετε να κάνετε',
      'aria-label': 'Αναζήτηση υπηρεσίας', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      lang: 'el', enterkeyhint: 'search', maxlength: '60' });
    var clearBtn = h('button', { type: 'button', class: 'btn btn-secondary clear', 'aria-label': 'Καθαρισμός αναζήτησης' }, [icon('x')]);
    clearBtn.hidden = true;
    var row = h('div', { class: 'search-row', role: 'search' }, [
      h('div', { class: 'search-field' }, [icon('search', 'search-icon'), input, clearBtn]),
      btn('Δεν ξέρω', 'btn-outline btn-small', function () { act('unknown'); }, 'message-circle')]);

    var browse = h('div', { class: 'browse' }, [
      h('h2', {}, ['Συχνές υπηρεσίες']),
      h('div', { class: 'grid popular' }, D.popular.map(function (id) {
        var s = D.serviceById(id);
        return s ? btn(s.label, 'btn-primary tile', function () { pick(s.id); }) : null;
      })),
      h('h2', {}, ['Κατηγορίες']),
      h('div', { class: 'grid categories' }, D.categories.map(function (c) {
        return btn(c.label, 'tile', function () { query = ''; act('category', { id: c.id }); }, c.icon);
      }))]);

    var results = h('div', { class: 'list results' });
    var status = h('p', { class: 'sr-only', 'aria-live': 'polite' });

    var qrBox = h('div', { class: 'qr', role: 'img', 'aria-label': 'QR code προς το gov.gr' });
    var fallback = h('div', { class: 'fallback-card' }, [
      h('h2', {}, ['Δεν βρέθηκε αντίστοιχη υπηρεσία ΚΕΠ']),
      h('p', {}, ['Αυτό γίνεται ηλεκτρονικά.']), qrBox,
      btn('Ρωτήστε τον υπάλληλο', 'btn-outline', openChat, 'message-circle')]);
    fallback.hidden = true; results.hidden = true;

    var intro = t.redirected ? h('h2', {}, ['Ο υπάλληλος σας κατευθύνει σε νέα ροή']) : null;
    [intro, row, browse, results, fallback, status].forEach(function (n) { if (n) box.appendChild(n); });

    function pick(id) { query = ''; act('service', { id: id }); }
    function clearTimers() { clearTimeout(timerSearch); clearTimeout(timerFallback); }

    function run() {
      var q = input.value.trim();
      if (q.length < T.MIN_CHARS) return;
      var found = Se.search(q, 12);
      results.textContent = ''; fallback.hidden = true; clearTimeout(timerFallback);
      results.hidden = !found.length;
      if (found.length) {
        found.forEach(function (s) { results.appendChild(btn(s.label, 'result', function () { pick(s.id); })); });
        status.textContent = 'Βρέθηκαν ' + found.length + ' υπηρεσίες';
      } else {
        status.textContent = '';
        timerFallback = setTimeout(function () {
          if (input.value.trim() !== q) return;
          fallback.hidden = false;
          if (!qrBox.firstChild && window.QRCode) new QRCode(qrBox, { text: D.qrUrl, width: 200, height: 200 });
          status.textContent = 'Δεν βρέθηκε αντίστοιχη υπηρεσία ΚΕΠ';
        }, T.FALLBACK_MS);
      }
    }
    function update(immediate) {
      clearTimers();
      query = input.value; clearBtn.hidden = !query;
      var q = query.trim();
      if (q.length < T.MIN_CHARS) {
        browse.hidden = false; results.hidden = true; results.textContent = ''; fallback.hidden = true; status.textContent = '';
        return;
      }
      browse.hidden = true; fallback.hidden = true;
      if (immediate || /\s$/.test(query)) run(); else timerSearch = setTimeout(run, T.DEBOUNCE_MS);
    }
    input.addEventListener('input', function () { update(false); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); update(true); } });
    clearBtn.addEventListener('click', function () { input.value = ''; update(true); input.focus(); });
    if (query) { input.value = query; update(true); }
    return box;
  }

  function build(st, t) {
    var out = [], p = st.phase, svc;
    if (p === 'welcome') {
      out.push(h('img', { src: 'icons/icon-192.png', class: 'logo', alt: 'Δίαυλος', width: '96', height: '96' }),
        h('h1', {}, ['Καλώς ήρθατε στα ΚΕΠ ' + D.kepName]),
        h('p', {}, ['Αυτή η συσκευή σας βοηθά να συνεννοηθείτε με τον υπάλληλο γραπτά.']),
        btn('ΕΝΤΑΞΕΙ', 'btn-primary', function () { act('ok'); }));
    } else if (!t) {
      out.push.apply(out, spinner('Περιμένετε...'));
    } else if (p === 'home') {
      out.push(buildHome(t));
    } else if (p === 'category') {
      var cat = D.categories.filter(function (c) { return c.id === t.categoryId; })[0];
      out.push(h('h1', {}, [cat ? cat.label : 'Υπηρεσίες']));
      out.push(h('div', { class: 'list' }, (cat ? cat.services : []).map(function (s) {
        return btn(s.label, 'result', function () { act('service', { id: s.id }); });
      })));
    } else if (p === 'questions') {
      svc = D.serviceById(t.serviceId);
      var q = svc && svc.questions[t.qIndex];
      if (q) out.push(h('h1', {}, [q.text]), h('div', { class: 'grid' }, q.answers.map(function (a) {
        return btn(a, a === 'Δεν ξέρω' ? '' : 'btn-primary', function () { act('answer', { a: a }); });
      })));
    } else if (p === 'field') {
      var cur = S.findItem(t, t.current);
      out.push(h('h1', {}, ['Ο υπάλληλος ζητάει' + (cur ? ': ' + cur.label : ' στοιχεία')]));
      if (hiddenId) out.push(btn('ΣΥΝΕΧΕΙΑ', 'btn-primary', function () { hiddenId = null; render(); }));
    } else if (p === 'waiting') {
      var asked = t.items.filter(function (i) { return i.status !== 'idle'; });
      var pending = asked.some(function (i) { return i.status === 'requested' || i.status === 'submitted' || i.flag; });
      var anyOk = asked.some(function (i) { return i.kind === 'field' && i.status === 'approved'; });
      out.push.apply(out, spinner(!pending && anyOk ? 'Ο υπάλληλος επεξεργάζεται τα στοιχεία σας' : 'Περιμένετε...'));
      if (t.docAsk) out.push(h('h2', {}, ['Ο υπάλληλος ζητάει: ' + t.docAsk]));
    } else if (p === 'missing') {
      out.push(h('h1', {}, ['Λείπουν τα παρακάτω έγγραφα']), h('div', { class: 'list' }, (t.missing || []).map(function (m) {
        return h('div', { class: 'card' }, [icon('file-text'), h('span', {}, [m.label + (showWhere && m.where ? ' — ' + m.where : '')])]);
      })), h('div', { class: 'grid' }, [
        btn('ΕΝΤΑΞΕΙ, ΘΑ ΞΑΝΑΕΡΘΩ', 'btn-primary', function () { act('missing_ok'); }),
        btn('ΑΠΟ ΠΟΥ ΘΑ ΤΟ ΒΡΩ;', '', function () { showWhere = !showWhere; render(); })]));
    } else if (p === 'chat') {
      svc = t.catalogOnly ? D.serviceById(t.serviceId) : null;
      if (svc) out.push(h('h2', {}, [svc.label]));
      out.push.apply(out, spinner('Ο υπάλληλος θα σας απαντήσει στο chat'));
      out.push(btn('Άνοιγμα chat', 'btn-primary', openChat, 'message-circle'));
    } else if (p === 'done') {
      out.push(h('h1', {}, ['Ευχαριστούμε. Θα χρειαστείτε κάτι άλλο;']), h('div', { class: 'grid' }, [
        btn('ΝΑΙ, ΚΑΤΙ ΑΛΛΟ', 'btn-primary', function () { act('more'); }),
        btn('ΟΧΙ, ΕΥΧΑΡΙΣΤΩ', '', function () { act('end', { r: 'done' }); })]));
    } else if (p === 'closed') {
      var r = t.endReason, msg = {
        done: 'Ευχαριστούμε, θα ενημερωθείτε για την πορεία του αιτήματός σας',
        cancelled: 'Η συναλλαγή ακυρώθηκε', timeout: 'Η συνεδρία έληξε. Ευχαριστούμε.',
        missing: 'Σας περιμένουμε ξανά όταν έχετε τα έγγραφα. Καλή σας μέρα.', terminated: 'Η συναλλαγή διακόπηκε. Ευχαριστούμε'
      }[r] || 'Ευχαριστούμε.';
      out.push(h('h1', {}, [msg]));
      if (r === 'done' && t.farewell) out.push(h('h2', {}, [t.farewell]));
    }
    return out;
  }

  function buildModal(t) {
    var it = S.findItem(t, t.current), f = it && D.fieldByKey(it.key);
    if (!f) return null;
    var input = f.kb === 'date'
      ? h('input', { type: 'date', max: new Date().toISOString().slice(0, 10) })
      : h('input', { type: 'text', inputmode: f.kb === 'numeric' ? 'numeric' : (f.kb === 'latin' ? 'email' : 'text'),
          lang: f.kb === 'greek' ? 'el' : 'en', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '100' });
    input.value = drafts[it.id] || '';
    errEl = h('div', { class: 'err', role: 'alert' });
    setErr(errEl, t.error);
    input.addEventListener('input', function () { drafts[it.id] = input.value; setErr(errEl, ''); });
    function send() {
      var v = input.value, e = DiavlosValidation.explain(it.key, v);
      if (e) { setErr(errEl, e); return; }
      delete drafts[it.id]; act('submit', { id: it.id, value: v });
    }
    return h('div', { class: 'modal', role: 'dialog' }, [
      h('h1', {}, [f.label]), h('p', {}, [f.hint]), input, errEl,
      h('div', { class: 'row' }, [
        btn('ΑΠΟΣΤΟΛΗ', 'btn-primary', send),
        btn('ΔΕΝ ΤΟ ΞΕΡΩ', '', function () { delete drafts[it.id]; act('dontknow', { id: it.id }); }),
        btn('ΔΙΑΓΡΑΦΗ', 'btn-danger', function () { delete drafts[it.id]; input.value = ''; act('delete', { id: it.id }); }),
        btn('ΠΙΣΩ', 'btn-secondary', function () { hiddenId = it.id; render(); })])
    ]);
  }

  function buildBar(t) {
    var done = t ? S.approvedFields(t) : [];
    if (!done.length) return null;
    var box = h('div', { style: 'display:contents' }), color = S.STATUS_META.approved.color;
    done.forEach(function (i) {
      box.appendChild(h('span', { class: 'tab', style: 'border-color:' + color + ';color:' + color }, [icon('check'), h('span', {}, [i.label])]));
    });
    box.appendChild(h('span', { class: 'count' }, ['Ολοκληρώθηκαν ' + done.length]));
    return box;
  }

  function render() {
    var st = store.get(), lo = store.local(), t = st.txn, now = Date.now();
    if (st.phase === 'chat') { if (!autoChat) { autoChat = true; openChat(); } } else autoChat = false;
    if (hiddenId && (!t || t.current !== hiddenId || st.phase !== 'field')) hiddenId = null;

    $('dot').className = 'dot ' + lo.conn;
    $('dot').setAttribute('aria-label', { connected: 'Συνδεδεμένο', disconnected: 'Αποσυνδεδεμένο', reconnecting: 'Επανασύνδεση...' }[lo.conn]);
    region($('connLayer'), 'c' + lo.recovering, function () {
      return lo.recovering ? h('div', { class: 'modal' }, [h('div', { class: 'spinner', style: 'align-self:center' }),
        h('h1', {}, ['Η σύνδεση με το ΚΕΠ διακόπηκε. Παρακαλούμε περιμένετε.'])]) : null;
    });
    region($('bar'), JSON.stringify(t && S.approvedFields(t).map(function (i) { return i.id; })), function () { return buildBar(t); });

    var nav = ['category', 'questions', 'chat'].indexOf(st.phase) >= 0;
    region($('screen'), JSON.stringify([st.phase, t && [t.categoryId, t.serviceId, t.qIndex, t.catalogOnly, t.missing, t.endReason, t.farewell, t.redirected, t.docAsk,
        t.items.map(function (i) { return i.status + (i.flag || ''); })], hiddenId, showWhere, st.ball]), function () {
      var box = h('div', { style: 'display:contents' }); build(st, t).forEach(function (n) { box.appendChild(n); });
      return box;
    });
    $('screen').className = (['home', 'category', 'field', 'missing'].indexOf(st.phase) >= 0) ? 'top' : '';
    region($('nav'), 'n' + nav + st.phase, function () {
      if (!nav) return null;
      return h('div', { style: 'display:contents' }, [btn('ΠΙΣΩ', 'btn-secondary', function () { act('back'); }, 'arrow-left'),
        btn('ΑΡΧΙΚΗ', 'btn-secondary', function () { drafts = {}; query = ''; act('home'); }, 'home')]);
    });

    var showModal = st.phase === 'field' && t && t.current && hiddenId !== t.current && now >= okUntil && !DiavlosChat.isOpen();
    region($('modalLayer'), showModal ? 'm' + t.current + '|' + t.error : 'none', function () { return showModal ? buildModal(t) : null; });
    region($('okLayer'), now < okUntil ? 'ok' + okText : 'none', function () {
      return now < okUntil ? h('div', { class: 'ok-big', role: 'status' }, [icon('check'), h('span', {}, [okText])]) : null;
    });
    region($('popup'), JSON.stringify(st.popup), function () {
      if (!st.popup) return null;
      var kids = [h('div', {}, [st.popup.text])];
      if (st.popup.sub) kids.push(h('div', { class: 'sub' }, [st.popup.sub]));
      var b = h('div', { class: 'bubble' + (st.popup.sticky ? ' bubble-alert' : ''), role: 'status' }, kids);
      b.addEventListener('click', openChat);
      return b;
    });
  }

  var idleT = null, cdT = null, cd = 0, asking = false;
  function idleActive() {
    var st = store.get(), lo = store.local();
    return !!st.txn && st.ball === 'citizen' && st.phase !== 'welcome' && st.phase !== 'closed' && !lo.recovering && lo.conn === 'connected' &&
      !st.popup && !(window.DiavlosChat && DiavlosChat.isOpen());
  }
  function cancelAsk() { asking = false; clearInterval(cdT); $('idleLayer')._sig = null; $('idleLayer').textContent = ''; }
  function ask() {
    if (asking || !idleActive()) return;
    asking = true; cd = IDLE_COUNTDOWN;
    function tick() {
      if (!asking) return;
      if (cd <= 0) { cancelAsk(); act('timeout_end'); return; }
      region($('idleLayer'), 'idle' + cd, function () {
        return h('div', { class: 'modal' }, [
          h('h1', {}, ['Είστε ακόμα εκεί;']),
          h('p', {}, ['Η συνεδρία θα λήξει σε ' + cd + ' δευτερόλεπτα.']),
          h('div', { class: 'row' }, [
            btn('ΝΑΙ, ΣΥΝΕΧΙΖΩ', 'btn-primary', function () { cancelAsk(); resetIdle(); }),
            btn('ΟΧΙ, ΤΕΛΟΣ', 'btn-danger', function () { cancelAsk(); act('timeout_end'); })])
        ]);
      });
      cd--;
    }
    tick(); cdT = setInterval(tick, 1000);
  }
  function resetIdle() {
    if (asking) return;
    clearTimeout(idleT);
    if (idleActive()) idleT = setTimeout(ask, IDLE_MS);
  }

  var prevConn = '';
  store.subscribe(function (st, lo, kind) {
    if (kind === 'public') {
      var first = adopt; adopt = false;
      if (st.lastOk && st.lastOk.ts !== seenOk) {
        seenOk = st.lastOk.ts;
        if (!first) { okText = st.lastOk.text; okUntil = Date.now() + 1500; setTimeout(render, 1600); }
      }
    }
    if (lo.conn !== prevConn) { if (lo.conn === 'connected') adopt = true; prevConn = lo.conn; }
    if (asking && !idleActive()) cancelAsk();
    render(); resetIdle();
  });

  ['pointerdown', 'touchstart', 'keydown', 'input', 'wheel'].forEach(function (e) { document.addEventListener(e, resetIdle, true); });
  document.addEventListener('scroll', resetIdle, true);
  DiavlosChat.mount({ role: 'citizen', store: store, sync: sync, onChange: function () { render(); resetIdle(); } });
  render();
})();
