// /service/js/shared/validation.js
// Αυτόματη επικύρωση πεδίων. Επιστρέφει null (ΟΚ) ή ένα από τα 3 προκαθορισμένα μηνύματα.
(function (global) {
  'use strict';
  var LEN = 'Λάθος μήκος', CHR = 'Μη έγκυροι χαρακτήρες', FMT = 'Δεν αντιστοιχεί σε έγκυρη μορφή';
  var GR = '\\u0370-\\u03FF\\u1F00-\\u1FFF';

  // Αριθμητικό πεδίο με σταθερό μήκος
  function digits(v, n) { if (!/^\d+$/.test(v)) return CHR; if (v.length !== n) return LEN; return null; }
  function luhn(s) {
    var sum = 0;
    for (var i = 0; i < s.length; i++) {
      var d = +s.charAt(s.length - 1 - i);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }
  function text(v, re, min, max) {
    if (!re.test(v)) return CHR;
    if (v.length < min || v.length > max) return LEN;
    return null;
  }

  var RULES = {
    afm: function (v) {
      var e = digits(v, 9); if (e) return e;
      if (/^0+$/.test(v)) return FMT;
      var s = 0; for (var i = 0; i < 8; i++) s += (+v.charAt(i)) * Math.pow(2, 8 - i);
      return (s % 11) % 10 === +v.charAt(8) ? null : FMT;
    },
    amka: function (v) { var e = digits(v, 11); if (e) return e; return luhn(v) ? null : FMT; },
    tk: function (v) { return digits(v, 5); },
    mobile: function (v) { var e = digits(v, 10); if (e) return e; return v.indexOf('69') === 0 ? null : FMT; },
    landline: function (v) { var e = digits(v, 10); if (e) return e; return v.charAt(0) === '2' ? null : FMT; },
    digits: function (v) { return text(v, /^\d+$/, 1, 12); },
    iban: function (v) {
      v = v.replace(/\s/g, '').toUpperCase();
      if (!/^[A-Z0-9]+$/.test(v)) return CHR;
      if (v.length !== 27) return LEN;
      if (v.indexOf('GR') !== 0) return FMT;
      var r = v.slice(4) + v.slice(0, 4), rem = 0;     // mod 97 ψηφίο-ψηφίο
      for (var i = 0; i < r.length; i++) {
        var c = r.charAt(i), n = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
        for (var j = 0; j < n.length; j++) rem = (rem * 10 + (+n.charAt(j))) % 97;
      }
      return rem === 1 ? null : FMT;
    },
    email: function (v) {
      if (!/^[\x21-\x7E]+$/.test(v)) return CHR;
      if (v.length > 254) return LEN;
      return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v) ? null : FMT;
    },
    name: function (v) { return text(v, new RegExp("^[A-Za-z" + GR + "\\s'.\\-]+$"), 2, 80); },
    text: function (v) { return text(v, new RegExp("^[A-Za-z" + GR + "\\s'.\\-]+$"), 2, 60); },
    address: function (v) { return text(v, new RegExp("^[A-Za-z0-9" + GR + "\\s.,'\\-\\/°]+$"), 3, 100); },
    alnum: function (v) { return text(v, new RegExp("^[A-Za-z0-9" + GR + "\\/.\\-]+$"), 1, 30); },
    adt: function (v) {
      if (!new RegExp("^[A-Za-z" + GR + "0-9\\s\\-]+$").test(v)) return CHR;
      var c = v.replace(/[\s\-]/g, '');
      if (c.length < 7 || c.length > 8) return LEN;
      return new RegExp("^[A-Za-z" + GR + "]{1,2}\\d{6}$").test(c) ? null : FMT;
    },
    date: function (v) {                                   // από το ημερολόγιο: ΕΕΕΕ-ΜΜ-ΗΗ
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); if (!m) return FMT;
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      var real = d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
      return real && +m[1] >= 1900 && d <= new Date() ? null : FMT;
    }
  };

  // key = κλειδί πεδίου (fields.js). Επιστρέφει null ή μήνυμα λάθους.
  function check(key, value) {
    var f = global.DiavlosData.fieldByKey(key);
    var v = String(value == null ? '' : value).trim();
    if (!f) return null;
    if (!v) return LEN;
    if (f.type === 'mobile' || f.type === 'landline' || f.type === 'tk' || f.type === 'afm' || f.type === 'amka') v = v.replace(/\s/g, '');
    return RULES[f.type] ? RULES[f.type](v) : null;
  }

  global.DiavlosValidation = { check: check, MESSAGES: [LEN, CHR, FMT] };
})(window);
