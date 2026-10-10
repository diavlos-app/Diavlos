// /service/js/shared/chat.js — chat πολίτη και υπαλλήλου (κοινό και για τις δύο οθόνες).
// Ο υπάλληλος κρατά το ιστορικό (πηγή αλήθειας). Ο πολίτης στέλνει ενέργεια 'chat'.
// Όριο 300 χαρακτήρες, ένδειξη «...γράφει...» και στις δύο πλευρές, κανένα badge/ήχος.
(function (global) {
  'use strict';
  var MAX = 300;
  var cfg = null, isOpen = false, remoteTyping = false, remoteTimer = null;
  var mine = false, lastSent = 0, myTimer = null;
  var ui = null;            // { list, typingEl, input }
  var lastSig = '';

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
  function iconNode(name) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', 'vendor/icons-sprite.svg#i-' + name); svg.appendChild(use);
    return svg;
  }
  function hhmm(ts) { return new Date(ts).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }); }

  // «...γράφει...» προς την άλλη πλευρά (περιορισμένη συχνότητα)
  function setTyping(on) {
    if (!cfg) return;
    clearTimeout(myTimer);
    if (on) {
      if (!mine || Date.now() - lastSent > 2500) { cfg.sync.event('typing', { on: true }); lastSent = Date.now(); }
      mine = true; myTimer = setTimeout(function () { setTyping(false); }, 3000);
    } else if (mine) { cfg.sync.event('typing', { on: false }); mine = false; }
  }

  // Φτιάχνει λίστα + γραμμή γραφής (μία φορά — δεν χάνεται το κείμενο στις ενημερώσεις)
  function composer(onSend) {
    var list = h('div', { class: 'chat-list', role: 'log' });
    var typingEl = h('div', { class: 'typing', 'aria-live': 'polite' });
    var cnt = h('span', { class: 'cnt' }, ['0/' + MAX]);
    var input = h('input', { type: 'text', maxlength: String(MAX), autocomplete: 'off', lang: 'el', placeholder: 'Γράψτε μήνυμα...' });
    function send() {
      var v = input.value.trim(); if (!v) return;
      onSend(v.slice(0, MAX)); input.value = ''; cnt.textContent = '0/' + MAX; setTyping(false);
    }
    input.addEventListener('input', function () { cnt.textContent = input.value.length + '/' + MAX; setTyping(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    var row = h('div', { class: 'chat-row' }, [input, h('button', { type: 'button', class: 'btn btn-primary', onclick: send }, ['ΑΠΟΣΤΟΛΗ'])]);
    return { list: list, typingEl: typingEl, input: input, cnt: cnt, row: row };
  }

  function msgNode(m) {
    var me = m.from === cfg.role;
    return h('div', { class: 'msg ' + (me ? 'me' : 'them') }, [
      h('div', { class: 'who' }, [me ? 'Εσείς' : (m.from === 'officer' ? 'Υπάλληλος' : 'Πολίτης')]),
      h('div', { class: 'txt' }, [m.text]), h('div', { class: 'when' }, [hhmm(m.ts)])]);
  }

  // Ανανέωση λίστας μόνο όταν αλλάξει κάτι
  function refresh() {
    if (!ui) return;
    var st = cfg.store.get(), chat = st.chat || [];
    var sig = chat.length + '|' + (chat.length ? chat[chat.length - 1].ts : '') + '|' + remoteTyping + '|' + JSON.stringify(st.popup);
    if (sig === lastSig) return;
    lastSig = sig;
    ui.list.textContent = '';
    chat.forEach(function (m) { ui.list.appendChild(msgNode(m)); });
    ui.list.scrollTop = ui.list.scrollHeight;
    ui.typingEl.textContent = remoteTyping ? '...γράφει...' : '';
    if (ui.popupRow) {                       // μόνο στον υπάλληλο: ο υπάλληλος κλείνει το popup του πολίτη
      ui.popupRow.textContent = '';
      if (st.popup) ui.popupRow.appendChild(h('div', { class: 'row' }, [
        h('span', { class: 'sub' }, ['Popup στον πολίτη: «' + st.popup.text + '»' + (st.popup.sub ? ' (' + st.popup.sub + ')' : '')]),
        h('button', { type: 'button', class: 'btn mini', onclick: function () { DiavlosTxn.closePopup(cfg.store); } }, ['Κλείσιμο popup'])]));
    }
  }

  // opts: { role:'citizen'|'officer', store, sync, container (υπάλληλος), onChange (πολίτης) }
  function mount(opts) {
    cfg = opts;
    if (opts.role === 'officer') {
      var c = composer(function (text) { DiavlosTxn.say(cfg.store, text); });
      ui = c; ui.popupRow = h('div');
      opts.container.appendChild(h('div', { class: 'chat-panel' }, [
        h('h2', {}, ['Chat με πολίτη']), ui.popupRow, c.list, c.typingEl, c.row, c.cnt]));
    } else {
      var cc = composer(function (text) { cfg.sync.act('chat', { text: text }); });
      ui = cc;
      var layer = h('div', { class: 'overlay', id: 'chatLayer', style: 'display:none; z-index:80' }, [
        h('div', { class: 'modal chat-modal', role: 'dialog' }, [
          h('div', { class: 'row' }, [h('h2', { style: 'flex:1;margin:0' }, ['Συνομιλία με τον υπάλληλο']),
            h('button', { type: 'button', class: 'btn btn-secondary', onclick: close }, ['ΚΛΕΙΣΙΜΟ'])]),
          cc.list, cc.typingEl, cc.row, cc.cnt])]);
      var icon = h('button', { type: 'button', class: 'btn', id: 'chatIcon', 'aria-label': 'Chat με τον υπάλληλο', onclick: open }, [iconNode('message-circle'), h('span', {}, ['Chat'])]);
      document.body.appendChild(layer); document.body.appendChild(icon);
    }
    cfg.store.subscribe(function (st, lo, kind) { if (kind === 'public') refresh(); });
    refresh();
  }

  function open() {
    if (!cfg || cfg.role !== 'citizen') return;
    isOpen = true; document.getElementById('chatLayer').style.display = 'flex';
    lastSig = ''; refresh(); ui.input.focus();
    if (cfg.onChange) cfg.onChange();
  }
  function close() {
    if (!cfg || cfg.role !== 'citizen') return;
    isOpen = false; setTyping(false); document.getElementById('chatLayer').style.display = 'none';
    if (cfg.onChange) cfg.onChange();        // το modal πεδίου επανέρχεται με ό,τι είχε γράψει
  }
  // Γεγονότα από το δίκτυο (typing)
  function onEvent(name, d) {
    if (name !== 'typing') return;
    remoteTyping = !!(d && d.on); clearTimeout(remoteTimer);
    if (remoteTyping) remoteTimer = setTimeout(function () { remoteTyping = false; lastSig = ''; refresh(); }, 5000);
    lastSig = ''; refresh();
  }

  global.DiavlosChat = { mount: mount, open: open, close: close, isOpen: function () { return isOpen; }, onEvent: onEvent };
})(window);