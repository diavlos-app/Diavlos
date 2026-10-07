// /service/js/shared/pdf.js — PDF συναλλαγής (ΣΥΝΟΨΗ / ΠΛΗΡΗΣ ΑΝΑΦΟΡΑ) με html2pdf.
// Τα ελληνικά αποδίδονται σωστά γιατί το html2pdf ζωγραφίζει τη σελίδα όπως τη δείχνει ο browser.
// Κατεβαίνει ΜΟΝΟ τοπικά στη συσκευή του υπαλλήλου. Χωρίς chat, χωρίς υπογραφή/σφραγίδα.
(function (global) {
  'use strict';
  var D = global.DiavlosData, S = global.DiavlosState;

  // Ομαδοποίηση πεδίων στην πλήρη αναφορά
  var GROUPS = [
    { label: 'Ταυτότητα', keys: ['onomateponymo', 'patronymo', 'mitronymo', 'imgennisis', 'adt', 'amka'] },
    { label: 'Φορολογικά', keys: ['afm', 'doy'] },
    { label: 'Επικοινωνία', keys: ['dieythynsi', 'tk', 'kinito', 'stathero', 'email'] },
    { label: 'Ειδικά', keys: ['foreas', 'iban', 'arprotokollou', 'arkykloforias', 'amkatexnou', 'syzygos', 'afmergodoti'] }
  ];
  var SUMMARY_KEYS = ['onomateponymo', 'afm', 'amka', 'adt'];   // κρίσιμα πεδία (σειρά του spec)

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(ts) { return new Date(ts).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' }); }
  function fileName(t) {
    var d = new Date(t.startedAt);
    return 'diavlos-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '-' + pad(t.id) + '.pdf';
  }
  function service(t) {
    var cat = D.categories.filter(function (c) { return c.id === t.categoryId; })[0], svc = null;
    if (cat) svc = cat.services.filter(function (s) { return s.id === t.serviceId; })[0] || null;
    return { cat: cat ? cat.icon + ' ' + cat.label : '—', svc: svc ? svc.label : '—' };
  }
  // Τιμή πεδίου για το PDF: τιμή, ή «δεν δόθηκε» (παράλειψη), ή «—»
  function fieldValue(t, key) {
    var it = S.findItem(t, 'field:' + key);
    if (!it) return null;
    if (it.status === 'skipped') return 'δεν δόθηκε';
    if (it.value) return it.value;
    return it.status === 'idle' ? null : '—';
  }

  // Καθαρά δεδομένα (χωρίς DOM) — εύκολο να δοκιμαστούν
  function model(st) {
    var t = st.txn, sv = service(t);
    return {
      file: fileName(t), kep: D.kepName, when: fmtDate(t.startedAt), id: '#' + pad(t.id), cat: sv.cat, svc: sv.svc,
      summary: [
        ['Ονοματεπώνυμο', fieldValue(t, 'onomateponymo') || '—'], ['ΑΦΜ', fieldValue(t, 'afm') || '—'],
        ['ΑΜΚΑ', fieldValue(t, 'amka') || '—'], ['ΑΔΤ', fieldValue(t, 'adt') || '—'],
        ['Κατηγορία + Υπηρεσία', sv.cat + ' › ' + sv.svc], ['Ημερομηνία / ώρα', fmtDate(t.startedAt)]
      ],
      answers: t.answers || [],
      docs: t.items.filter(function (i) { return i.kind === 'doc'; }).map(function (i) { var m = S.STATUS_META[i.status]; return [i.label, m.symbol + ' ' + m.label]; }),
      groups: GROUPS.map(function (g) {
        return { label: g.label, rows: g.keys.map(function (k) {
          var v = fieldValue(t, k), f = D.fieldByKey(k); return v == null ? null : [f.label, v];
        }).filter(Boolean) };
      }).filter(function (g) { return g.rows.length; })
    };
  }

  function h(tag, style, kids) {
    var e = document.createElement(tag); if (style) e.setAttribute('style', style);
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var TH = 'text-align:left;padding:6px 8px;border:1px solid #475569;background:#F1F5F9;width:38%;';
  var TD = 'padding:6px 8px;border:1px solid #475569;';
  function table(rows) {
    return h('table', 'width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:14px;', rows.map(function (r) {
      return h('tr', 'page-break-inside:avoid;', [h('th', TH, [r[0]]), h('td', TD, [r[1]])]);
    }));
  }
  function title(txt) { return h('h2', 'font-size:16px;margin:14px 0 4px;color:#0F172A;', [txt]); }

  function render(m, full) {
    var box = h('div', 'width:720px;padding:8px;background:#fff;color:#0F172A;font-family:Arial,"Segoe UI",sans-serif;');
    box.appendChild(h('h1', 'font-size:20px;margin:0 0 4px;', ['Δίαυλος — ΚΕΠ ' + m.kep]));
    box.appendChild(h('div', 'font-size:14px;margin-bottom:10px;', ['Συναλλαγή ' + m.id + ' · ' + m.when]));
    if (!full) { box.appendChild(title('Σύνοψη')); box.appendChild(table(m.summary)); return box; }
    box.appendChild(title('Περιγραφή συναλλαγής')); box.appendChild(table([['Κατηγορία', m.cat], ['Υπηρεσία', m.svc]]));
    if (m.answers.length) { box.appendChild(title('Ερωτήσεις διευκρίνισης')); box.appendChild(table(m.answers.map(function (a) { return [a.q, a.a]; }))); }
    if (m.docs.length) { box.appendChild(title('Απαιτούμενα έγγραφα')); box.appendChild(table(m.docs)); }
    m.groups.forEach(function (g) { box.appendChild(title(g.label)); box.appendChild(table(g.rows)); });
    return box;
  }

  function make(st, full) {
    if (!st || !st.txn) return;
    if (!global.html2pdf) { alert('Η βιβλιοθήκη PDF δεν φορτώθηκε. Χρειάζεται σύνδεση στο internet.'); return; }
    var m = model(st);
    var host = h('div', 'position:fixed;left:-10000px;top:0;'); host.appendChild(render(m, full)); document.body.appendChild(host);
    var done = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    global.html2pdf().set({
      margin: 10, filename: m.file, image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'avoid-all'] }
    }).from(host.firstChild).save().then(done, done);
  }

  global.DiavlosPdf = {
    summary: function (st) { make(st, false); },
    full: function (st) { make(st, true); },
    _model: model
  };
})(window);
