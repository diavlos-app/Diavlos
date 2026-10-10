// service/js/officer/app.js — dashboard υπαλλήλου. Ο υπάλληλος είναι η πηγή αλήθειας.
(function () {
  'use strict';
  var S = DiavlosState, D = DiavlosData, T = DiavlosTxn;
  var store = S.createStore();
  var SPRITE = 'vendor/icons-sprite.svg';

  // ---- Στατιστικά (ανώνυμα, sessionStorage, ξεκινούν από #01 κάθε νέα μέρα) ----
  var DAY = new Date().toLocaleDateString('en-CA');
  function load(key, def) {
    try { var o = JSON.parse(sessionStorage.getItem(key)); if (o && o.day === DAY) return o.v; } catch (e) {}
    return def;
  }
  function save(key, v) { try { sessionStorage.setItem(key, JSON.stringify({ day: DAY, v: v })); } catch (e) {} }
  var log = load('diavlos-log', []), loggedId = null;
  store.update(function (st) { st.stats = load('diavlos-stats', { total: 0, done: 0, cancelled: 0 }); });

  var sync = DiavlosSync.start({ role: 'officer', store: store, onAction: function (n, d) { T.act(store, n, d); },
    onEvent: function (n, d) { DiavlosChat.onEvent(n, d); } });

  // ---- Τοπική κατάσταση UI ----
  var modal = null, showMore = false, showGen = false, missSel = {}, barScroll = 0;
  var rejectFor = null;     // id εγγράφου για το οποίο φαίνονται οι λόγοι απόρριψης

  // ---- Βοηθητικά DOM ----
  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  // Εικονίδιο από το sprite (πάντα με κείμενο δίπλα, γι' αυτό aria-hidden)
  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : '')); svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', SPRITE + '#i-' + name); svg.appendChild(use);
    return svg;
  }
  function btn(label, cls, fn, iconName, disabled) {
    return h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: fn, disabled: disabled ? 'disabled' : null },
      iconName ? [icon(iconName), h('span', {}, [label])] : [label]);
  }
  function region(el, sig, build) {
    if (el._sig === sig) return;
    el._sig = sig; el.textContent = '';
    var n = build(); if (n) el.appendChild(n);
  }
  function $(id) { return document.getElementById(id); }
  function hhmm(ts) { return new Date(ts).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }); }

  // ---- Περιγραφές ----
  function catSvc(t) {
    var c = D.categories.filter(function (x) { return x.id === t.categoryId; })[0], s = T.findService(t);
    return (c ? c.label : '—') + (s ? ' / ' + s.label : '');
  }
  function describe(st) {   // τι βλέπει ο πολίτης τώρα (και για το MIRROR)
    var t = st.txn, p = st.phase;
    if (!t) return 'Οθόνη καλωσορίσματος';
    var f = t.current && S.findItem(t, t.current), s = T.findService(t);
    return ({
      home: 'Βλέπει την αρχική οθόνη (αναζήτηση, δημοφιλή, κατηγορίες)', category: 'Βλέπει τις υπηρεσίες μιας κατηγορίας',
      questions: 'Απαντά: ' + (s && s.questions[t.qIndex] ? s.questions[t.qIndex].text : ''),
      waiting: 'Περιμένει τον υπάλληλο',
      field: f ? 'Συμπληρώνει: ' + f.label + (t.error ? ' (λάθος: ' + t.error + ')' : '') : 'Συμπληρώνει πεδίο',
      missing: 'Βλέπει τη λίστα ελλείψεων',
      chat: t.catalogOnly && s ? 'Ζητά: ' + s.label + ' (περιμένει απάντηση στο chat)' : 'Περιμένει απάντηση στο chat',
      done: 'Ερώτηση «θα χρειαστείτε κάτι άλλο;»', closed: 'Η οθόνη είναι κλειδωμένη'
    })[p] || p;
  }
  var END = { done: 'ολοκληρώθηκε', cancelled: 'ακυρώθηκε', timeout: 'έληξε (timeout)', missing: 'έκλεισε λόγω ελλείψεων', terminated: 'διακόπηκε' };

  // ---- Απαντήσεις ερωτήσεων του πολίτη (το «Δεν ξέρω» ξεχωρίζει) ----
  function answersPanel(t) {
    if (!t.answers || !t.answers.length) return null;
    return h('div', { class: 'card' }, [h('h2', {}, ['Απαντήσεις πολίτη'])].concat(t.answers.map(function (a) {
      return h('div', { class: 'row ans' + (a.a === 'Δεν ξέρω' ? ' unknown' : '') }, [h('span', {}, [a.q]), h('strong', {}, [a.a])]);
    })));
  }

  // ---- Γραμμή πεδίου ----
  function fieldRow(it) {
    var m = S.STATUS_META[it.status], acts = [], info = [m.icon ? icon(m.icon, 'icon-inline') : null, it.label + ': ' + m.label];
    if (it.flag === 'dontknow') {
      info = [it.label + ': ο πολίτης δεν ξέρει'];
      acts = [btn('Ακύρωση', 'mini', function () { T.decideDontKnow(store, it.id, 'cancel'); }),
        btn('Επανάληψη', 'mini', function () { T.decideDontKnow(store, it.id, 'repeat'); }),
        btn('Παράλειψη', 'mini', function () { T.decideDontKnow(store, it.id, 'skip'); })];
    } else if (it.flag === 'deleted') {
      info = [it.label + ': διαγράφηκε από τον πολίτη'];
      acts = [btn('Ζήτα ξανά', 'mini', function () { T.decideDontKnow(store, it.id, 'repeat'); })];
    } else if (it.status === 'submitted') {
      acts = [btn('ΕΓΚΡΙΣΗ', 'mini btn-primary', function () { T.approve(store, it.id); }, 'check')]
        .concat(DiavlosValidation.MESSAGES.map(function (msg, i) { return btn(msg, 'mini btn-danger', function () { T.reject(store, it.id, i); }, 'x'); }));
    } else if (it.status === 'approved') {
      acts = [btn('Ζήτα ξανά', 'mini', function () { T.requestField(store, it.key); })];
    }
    return h('div', { class: 'card item st-' + it.status }, [
      h('div', { class: 'sym st-' + it.status }, info),
      it.value ? h('div', { class: 'val' }, [it.value]) : null,
      acts.length ? h('div', { class: 'row' }, acts) : null]);
  }

  // ---- Έγγραφα: λίστα αναφοράς της υπηρεσίας + όσα ζητήθηκαν επιπλέον (ο πολίτης δεν τη βλέπει ποτέ) ----
  function docRows(t) {
    var rows = T.officerDocs(t), seen = {};
    rows.forEach(function (r) { seen[r.key] = true; });
    t.items.forEach(function (i) { if (i.kind === 'doc' && !seen[i.key]) rows.push({ id: i.id, key: i.key, label: i.label, status: i.status }); });
    return rows.map(function (r) { var it = S.findItem(t, r.id); r.reason = it && it.reason ? it.reason : ''; return r; });
  }
  function docTab(r) {
    var m = S.STATUS_META[r.status];
    var main = btn(r.label + ' - ' + m.label + (r.status === 'rejected' && r.reason ? ' (' + r.reason + ')' : ''), 'st-' + r.status, function () {
      if (r.status === 'requested' || r.status === 'submitted') T.approve(store, r.id);   // πατάει μέσα στο tab: εγκρίθηκε
      else if (r.status !== 'approved') T.requestDoc(store, r.key);
    }, m.icon);
    var kids = [main];
    if (r.status === 'requested' || r.status === 'approved') kids.push(btn('ΑΠΟΡΡΙΨΗ', 'mini btn-danger', function () { rejectFor = rejectFor === r.id ? null : r.id; render(); }, 'x'));
    return h('div', { class: 'col' }, [h('div', { class: 'row' }, kids),
      rejectFor === r.id ? h('div', { class: 'row' }, T.DOC_REJECT_REASONS.map(function (reason, i) {
        return btn(reason, 'mini btn-danger', function () { rejectFor = null; T.rejectDoc(store, r.id, i); });
      })) : null]);
  }

  // ---- Κύριο περιεχόμενο ----
  function buildMain(st, t) {
    var left = h('div', { class: 'col' }), right = h('div', { class: 'col' });
    var closed = st.phase === 'closed', svc = T.findService(t);
    left.appendChild(h('div', { class: 'sub' }, ['Πολίτης: ' + describe(st)]));
    if (t.catalogOnly && svc) left.appendChild(h('div', { class: 'alert warn' }, ['Ο πολίτης ζητά: ' + svc.label + '. Δεν υπάρχει έτοιμη ροή, απαντήστε στο chat.']));
    var ans = answersPanel(t); if (ans) left.appendChild(ans);

    function fieldBtn(f) {
      var it = S.findItem(t, 'field:' + f.key);
      return btn(f.label, it && it.status !== 'idle' ? 'st-' + it.status : '', function () { T.requestField(store, f.key); });
    }
    // Προτεινόμενα πεδία για την υπηρεσία (πρώτα), μετά η γενική παλέτα
    if (!closed && svc && svc.fields.length) {
      left.appendChild(h('h2', {}, ['Προτεινόμενα πεδία για αυτή την υπηρεσία']));
      left.appendChild(h('div', { class: 'bar' }, svc.fields.map(D.fieldByKey).filter(Boolean).map(fieldBtn)));
    }
    var palette = h('div', { class: 'bar', id: 'palette' }, D.fields.filter(function (f) { return f.level === 1 || showMore; }).map(fieldBtn)
      .concat([btn(showMore ? '- Λιγότερα' : '+ Περισσότερα', 'btn-secondary', function () { showMore = !showMore; render(); })]));
    palette.addEventListener('scroll', function () { barScroll = palette.scrollLeft; });
    if (!closed) { left.appendChild(h('h2', {}, ['Όλα τα πεδία (ελεύθερη σειρά)'])); left.appendChild(palette); }

    var fields = t.items.filter(function (i) { return i.kind === 'field'; });
    left.appendChild(fields.length ? h('div', { class: 'col' }, fields.map(fieldRow)) : h('div', { class: 'sub' }, ['Κανένα πεδίο δεν έχει ζητηθεί ακόμα.']));

    right.appendChild(h('h2', {}, ['Έγγραφα (λίστα αναφοράς)']));
    var docs = docRows(t);
    right.appendChild(docs.length ? h('div', { class: 'col' }, docs.map(docTab)) : h('div', { class: 'sub' }, ['Η υπηρεσία δεν έχει προκαθορισμένα έγγραφα.']));
    if (!closed) {
      right.appendChild(btn(showGen ? '- Κλείσιμο λίστας' : '+ Άλλο έγγραφο (γενική λίστα)', 'btn-secondary', function () { showGen = !showGen; render(); }));
      if (showGen) D.docGroups.forEach(function (g) {
        right.appendChild(h('div', { class: 'sub' }, [g.label]));
        right.appendChild(h('div', { class: 'row' }, g.docs.map(function (d) { return btn(d.label, 'mini', function () { T.requestDoc(store, d.key); }); })));
      });
    }
    return [left, right];
  }

  // ---- Modals ----
  function buildModal(st, t) {
    var close = function () { modal = null; render(); };
    if (modal === 'reset') return h('div', { class: 'modal' }, [h('h2', {}, ['Να χαθούν τα δεδομένα;']),
      h('div', { class: 'row' }, [btn('ΝΑΙ', 'btn-danger', function () { modal = null; T.cancelAll(store); render(); }), btn('ΟΧΙ', 'btn-primary', close)])]);
    if (modal === 'mirror') return h('div', { class: 'modal' }, [h('h2', {}, ['Οθόνη πολίτη (mirror)']),
      h('div', { class: 'card' }, [describe(st)]),
      t.answers && t.answers.length ? h('div', { class: 'sub' }, ['Απαντήσεις: ' + t.answers.map(function (a) { return a.a; }).join(', ')]) : null,
      btn('ΚΛΕΙΣΙΜΟ', 'btn-primary', close)]);
    if (modal === 'missing') {
      var list = docRows(t).map(function (d) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = !!missSel[d.key];
        cb.addEventListener('change', function () { missSel[d.key] = cb.checked; });
        return h('label', { class: 'chk' }, [cb, d.label]);
      });
      return h('div', { class: 'modal' }, [h('h2', {}, ['Ποια έγγραφα λείπουν;'])].concat(list, [h('div', { class: 'row' }, [
        btn('ΕΝΗΜΕΡΩΣΕ ΤΟΝ ΠΟΛΙΤΗ', 'btn-primary', function () {
          var keys = Object.keys(missSel).filter(function (k) { return missSel[k]; });
          if (keys.length) T.missing(store, keys);
          modal = null; render();
        }), btn('ΑΚΥΡΩΣΗ', '', close)])]));
    }
    if (modal === 'end') {
      var done = t.items.filter(function (i) { return i.kind === 'field' && i.status === 'approved'; });
      var inp = h('input', { type: 'text', maxlength: '300', placeholder: 'Προαιρετικό μήνυμα προς τον πολίτη' });
      var pdf = window.DiavlosPdf;
      return h('div', { class: 'modal' }, [h('h2', {}, ['Ολοκλήρωση συναλλαγής']),
        h('div', { class: 'row' }, [
          btn('ΣΥΝΟΨΗ', 'btn-primary', function () { if (pdf) pdf.summary(store.get()); }, 'file-text', !pdf),
          btn('ΠΛΗΡΗΣ ΑΝΑΦΟΡΑ', 'btn-primary', function () { if (pdf) pdf.full(store.get()); }, 'file-text', !pdf)]),
        h('div', { class: 'sub' }, ['Συμπληρώθηκαν ' + done.length + ' πεδία: ' + done.map(function (i) { return i.label; }).join(', ')]),
        inp, h('div', { class: 'row' }, [
          btn('ΑΠΟΣΤΟΛΗ ΜΗΝΥΜΑΤΟΣ', '', function () { var v = inp.value.trim(); if (v) store.update(function (s) { if (s.txn) s.txn.farewell = v.slice(0, 300); }); }),
          btn('ΚΛΕΙΣΙΜΟ', 'btn-secondary', function () { modal = null; if (store.get().phase === 'closed') T.dismiss(store); render(); })])]);
    }
    return null;
  }

  // ---- Κεντρική ζωγραφική ----
  function render() {
    var st = store.get(), lo = store.local(), t = st.txn;
    var active = !!t && st.phase !== 'welcome';

    region($('top'), JSON.stringify([lo.conn, t && [t.id, t.startedAt, t.endReason, t.categoryId, t.serviceId]]), function () {
      var box = h('div', { style: 'display:contents' });
      box.appendChild(h('span', { class: 'dot ' + lo.conn, role: 'img', 'aria-label': { connected: 'Συνδεδεμένο', disconnected: 'Αποσυνδεδεμένο', reconnecting: 'Επανασύνδεση...' }[lo.conn] }));
      box.appendChild(h('h1', {}, [active
        ? 'Συναλλαγή ' + T.formatId(t.id) + (t.endReason ? ' — ' + END[t.endReason] : ' — ενεργή από ' + hhmm(t.startedAt))
        : 'Καμία ενεργή συναλλαγή']));
      if (active) box.appendChild(h('div', { class: 'sub' }, [catSvc(t)]));
      return box;
    });

    region($('alerts'), JSON.stringify([lo.recovering, st.banner]), function () {
      var box = h('div', { style: 'display:contents' });
      if (lo.recovering) box.appendChild(h('div', { class: 'alert err' }, ['Σφάλμα δικτύου']));
      if (st.banner) box.appendChild(h('div', { class: 'alert warn' }, [st.banner, btn('ΟΚ', 'mini', function () { T.dismiss(store); })]));
      return box;
    });

    var main = $('main');
    region(main, JSON.stringify([st, showMore, showGen, rejectFor]), function () {
      main.className = active ? '' : 'idle';
      if (!active) return h('div', {}, ['Καμία ενεργή συναλλαγή']);
      var box = h('div', { style: 'display:contents' }); buildMain(st, t).forEach(function (n) { box.appendChild(n); });
      return box;
    });
    var pal = $('palette'); if (pal) pal.scrollLeft = barScroll;

    region($('actions'), JSON.stringify([active, st.phase, !!(t && T.officerDocs(t).length)]), function () {
      if (!active) return null;
      var box = h('div', { style: 'display:contents' }), closed = st.phase === 'closed';
      box.appendChild(btn('MIRROR', 'btn-secondary', function () { modal = 'mirror'; render(); }));
      if (!closed && T.officerDocs(t).length) box.appendChild(btn('ΕΝΗΜΕΡΩΣΕ ΓΙΑ ΕΛΛΕΙΨΗ', '', function () { missSel = {}; modal = 'missing'; render(); }));
      if (st.phase === 'missing') box.appendChild(btn('ΠΡΟΧΩΡΑ', 'btn-primary', function () { T.proceedAfterMissing(store); }));
      if (st.phase === 'chat') box.appendChild(btn('ΜΕΤΑΦΟΡΑ ΣΕ ΡΟΗ ΥΠΗΡΕΣΙΑΣ', '', function () { T.redirect(store); }));
      if (!closed) {
        box.appendChild(btn('ΔΙΑΚΟΠΗ', 'btn-danger', function () { T.terminate(store); }));
        box.appendChild(btn('ΕΠΙΒΕΒΑΙΩΣΗ ΤΕΛΟΥΣ', 'btn-primary', function () {
          var s = store.get(); if (s.phase !== 'done') T.confirmEnd(store, '');   // ο πολίτης βλέπει «θα χρειαστείτε κάτι άλλο;»
          modal = 'end'; render();
        }));
        box.appendChild(btn('ΕΠΑΝΑΦΟΡΑ', 'btn-danger', function () { modal = 'reset'; render(); }, 'rotate-ccw'));
      } else {
        box.appendChild(btn('ΑΝΑΦΟΡΕΣ', '', function () { modal = 'end'; render(); }, 'file-text'));
        box.appendChild(btn('ΚΛΕΙΣΙΜΟ ΣΥΝΑΛΛΑΓΗΣ', 'btn-primary', function () { T.dismiss(store); }));
      }
      return box;
    });

    var s = st.stats;
    region($('stats'), JSON.stringify(s), function () {
      return h('span', {}, ['Σήμερα: ' + s.total + ' συναλλαγές (' + s.done + ' ολοκληρωμένες, ' + s.cancelled + ' ακυρωμένες)']);
    });
    region($('modalLayer'), modal ? modal + (modal === 'mirror' ? JSON.stringify([st.phase, t && [t.current, t.qIndex, t.error]]) : '') + (t ? '' : 'x') : 'none', function () { return modal && t ? buildModal(st, t) : null; });
  }

  // Αν κλείσει η συναλλαγή (reset) ενώ είναι ανοιχτό modal, κλείνει κι αυτό
  store.subscribe(function (st, lo, kind) {
    if (kind === 'public') {
      save('diavlos-stats', st.stats);
      if (!st.txn) { modal = null; rejectFor = null; }
      if (st.txn && st.txn.endReason && loggedId !== st.txn.id) {      // ανώνυμη εγγραφή: ώρα, κατηγορία, υπηρεσία, αποτέλεσμα
        loggedId = st.txn.id;
        var s = T.findService(st.txn);
        log.push({ time: hhmm(Date.now()), cat: st.txn.categoryId, svc: s ? s.id : null, result: st.txn.endReason });
        save('diavlos-log', log);
      }
    }
    render();
  });
  DiavlosChat.mount({ role: 'officer', store: store, sync: sync, container: $('chatPanel') });
  render();
})();