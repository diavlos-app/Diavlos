// service/js/shared/search.js
// Αναζήτηση υπηρεσιών ΚΕΠ. Δύο επίπεδα: (1) κανονικοποίηση + φωνητική ομογενοποίηση, (2) λέξεις-κλειδιά.
// Χωρίς Levenshtein, χωρίς Greeklish. Μόνο ελληνικά. Δεν αγγίζει το DOM.
(function (global) {
  'use strict';

  // Χρονισμοί που διαβάζει η οθόνη του πολίτη
  var TIMING = {
    MIN_CHARS: 2,       // ελάχιστοι χαρακτήρες για να εμφανιστούν αποτελέσματα
    DEBOUNCE_MS: 200,   // αναμονή μετά την τελευταία πληκτρολόγηση
    FALLBACK_MS: 500    // αναμονή πριν το fallback (μόνο αν δεν υπάρχει αποτέλεσμα)
  };

  // Φωνητική ομογενοποίηση: πρώτα τα δίψηφα, μετά τα μονά, σε ένα πέρασμα.
  // Το «ου» κρατιέται όπως είναι (αλλιώς το υ θα γινόταν ι).
  var FONITIKA = { 'ου': 'ου', 'αι': 'ε', 'οι': 'ι', 'ει': 'ι', 'γγ': 'γκ', 'γκ': 'γκ', 'η': 'ι', 'υ': 'ι', 'ω': 'ο' };

  // Κανονικοποίηση κειμένου: πεζά, χωρίς τόνους, σίγμα ενιαίο, φωνητική μορφή.
  function normalize(text) {
    var s = String(text == null ? '' : text).toLowerCase();
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');       // αφαίρεση τόνων και διαλυτικών
    s = s.replace(/ς/g, 'σ');                                      // τελικό σίγμα
    s = s.replace(/[^a-z0-9\u03b1-\u03c9]+/g, ' ');                // ό,τι δεν είναι γράμμα/ψηφίο γίνεται κενό
    s = s.replace(/ου|αι|οι|ει|γγ|γκ|[ηυω]/g, function (m) { return FONITIKA[m]; });
    s = s.replace(/([βγδζθκλμνξπρστφχψ])\1+/g, '$1');             // διπλά σύμφωνα: το ππ γίνεται π
    return s.replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  // Λέξεις που δεν βοηθούν στην αναζήτηση («θέλω ένα πιστοποιητικό») - σε κανονικοποιημένη μορφή
  var STOP = {};
  ['και', 'το', 'τον', 'την', 'τα', 'του', 'της', 'των', 'ενα', 'μια', 'μιας', 'ενος', 'για', 'με', 'σε', 'απο', 'να', 'θα',
   'θελω', 'ηθελα', 'θελουμε', 'χρειαζομαι', 'εχω', 'ειναι', 'μου', 'μας', 'παρακαλω']
    .forEach(function (w) { STOP[normalize(w)] = true; });

  function tokens(text) {
    var n = normalize(text);
    return n ? n.split(' ') : [];
  }

  // Ευρετήριο: για κάθε υπηρεσία οι λέξεις του τίτλου και των keywords
  var index = null;
  function build() {
    index = global.DiavlosData.allServices().map(function (svc, i) {
      return { svc: svc, order: i, label: normalize(svc.label), labelTokens: tokens(svc.label), keyTokens: tokens((svc.keywords || []).join(' ')) };
    });
  }
  function rebuild() { index = null; }

  // Κοινό πρόθεμα δύο λέξεων (πλήθος γραμμάτων)
  function koinoProthema(a, b) {
    var n = Math.min(a.length, b.length), i = 0;
    while (i < n && a.charAt(i) === b.charAt(i)) i++;
    return i;
  }

  // Πόσο ταιριάζει μία λέξη του πολίτη σε μία λέξη του ευρετηρίου (0 = καθόλου).
  // Ακριβές = 3. Πρόθεμα: «οικογεν» ταιριάζει «οικογενεια», και αντίστροφα (λέξη 4+ γραμμάτων) = 2.
  // Κλίση: «εκκαθαριστικο» ταιριάζει «εκκαθαριστικου» (διαφέρουν μόνο τα τελευταία 1-2 γράμματα) = 1.
  function tokenMatch(q, w) {
    if (q === w) return 3;
    if (q.length >= 2 && w.indexOf(q) === 0) return 2;
    if (w.length >= 4 && q.indexOf(w) === 0) return 2;
    var min = Math.min(q.length, w.length);
    if (min >= 5 && koinoProthema(q, w) >= min - 2) return 1;
    return 0;
  }

  // Βαθμολογία υπηρεσίας: κάθε λέξη του πολίτη πρέπει να ταιριάζει κάπου (AND, ανεξάρτητα σειράς).
  function score(entry, qTokens) {
    var total = 0;
    for (var i = 0; i < qTokens.length; i++) {
      var best = 0, q = qTokens[i], j, m;
      for (j = 0; j < entry.labelTokens.length; j++) { m = tokenMatch(q, entry.labelTokens[j]); if (m) best = Math.max(best, m + 2); }   // τίτλος μετράει περισσότερο
      for (j = 0; j < entry.keyTokens.length; j++) { m = tokenMatch(q, entry.keyTokens[j]); if (m) best = Math.max(best, m); }
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  // Κύρια συνάρτηση. Επιστρέφει πίνακα υπηρεσιών (πιο σχετικές πρώτα). Κενό αποτέλεσμα = ενεργοποιείται το fallback.
  function search(query, limit) {
    if (!index) build();
    var qTokens = tokens(query).filter(function (t) { return !STOP[t]; });
    if (!qTokens.length) qTokens = tokens(query);                  // μόνο stopwords: ψάξε όπως είναι
    qTokens = qTokens.filter(function (t) { return t.length >= 2 || qTokens.length === 1; });   // αγνόηση μονογράμματων αν υπάρχουν άλλες λέξεις
    if (!qTokens.length) return [];
    var whole = qTokens.join(' '), hits = [];
    index.forEach(function (e) {
      var s = score(e, qTokens);
      if (!s) return;
      if (e.label.indexOf(whole) >= 0) s += 3;                     // ολόκληρη η φράση μέσα στον τίτλο
      hits.push({ svc: e.svc, score: s, order: e.order });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    return hits.slice(0, limit || 20).map(function (h) { return h.svc; });
  }

  global.DiavlosSearch = { normalize: normalize, tokens: tokens, search: search, rebuild: rebuild, TIMING: TIMING };
})(window);