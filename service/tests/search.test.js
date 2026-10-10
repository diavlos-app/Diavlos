// service/tests/search.test.js
// Τρέχει με: node service/tests/search.test.js   (δεν φορτώνεται από τον browser ούτε από το sw.js)
global.window = global;
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
['data/documents.js', 'data/fields.js', 'data/services.js', 'js/shared/search.js'].forEach(function (f) {
  (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
});
var S = global.DiavlosSearch, fail = 0, total = 0;
function ok(cond, msg) { total++; if (!cond) { fail++; console.log('ΑΠΟΤΥΧΙΑ: ' + msg); } }
function first(q) { var r = S.search(q, 1); return r.length ? r[0].label : null; }
function all(q) { return S.search(q, 50).map(function (s) { return s.label; }); }

// Κανονικοποίηση: τα 3 παραδείγματα του spec
ok(S.normalize('βεβεωση') === S.normalize('βεβαίωση'), 'βεβεωση = βεβαίωση');
ok(S.normalize('πιστοπιιτικο') === S.normalize('πιστοποιητικό'), 'πιστοπιιτικο = πιστοποιητικό');
ok(S.normalize('πηστοποιητικο') === S.normalize('πιστοποιητικό'), 'πηστοποιητικο = πιστοποιητικό');
// Κανονικοποίηση: τόνοι, κεφαλαία, ς, ου, γγ/γκ, διπλά σύμφωνα
ok(S.normalize('ΒΕΒΑΙΩΣΗ') === S.normalize('βεβαίωση'), 'κεφαλαία');
ok(S.normalize('κατοικίας') === S.normalize('κατοικιασ'), 'τελικό σίγμα');
ok(S.normalize('ου') === 'ου' && S.normalize('ούτε') === S.normalize('ουτε'), 'το ου κρατιέται');
ok(S.normalize('άγγελος') === S.normalize('αγκελος'), 'γγ = γκ');
ok(S.normalize('εκκαθαριστικό') === S.normalize('εκαθαριστικο'), 'διπλό σύμφωνο');
ok(S.normalize('  Γράψτε,   τι;  ') === 'γραψτε τι', 'σημεία στίξης και κενά');

// Αναζήτηση
ok(all('βεβεωση').slice(0, 3).length === 3 && all('βεβεωση').slice(0, 3).every(function (n) { return n.indexOf('Βεβαίωση') === 0; }), 'βεβεωση: οι πρώτες είναι βεβαιώσεις');
ok(all('πιστοπιιτικο').slice(0, 5).every(function (n) { return n.indexOf('Πιστοποιητικό') === 0; }) && all('πιστοπιιτικο').length >= 5, 'πιστοπιιτικο: πρώτα τα πιστοποιητικά');
ok(first('πηστοποιητικο γενισης') === 'Πιστοποιητικό Γέννησης', 'πηστοποιητικο γενισης');
ok(first('οικογενειακης κατασταση') === 'Πιστοποιητικό Οικογενειακής Κατάστασης', 'κλίση: οικογενειακής');
ok(first('θελω ενα ποινικο') === 'Αντίγραφο Ποινικού Μητρώου', 'stopwords');
ok(first('παντρεμενος') === 'Πιστοποιητικό Οικογενειακής Κατάστασης', 'keyword παντρεμένος');
ok(first('αυτοκινητο') === 'Μεταβίβαση Επιβατικού Οχήματος', 'keyword αυτοκίνητο');
ok(first('μεταβιβαση οχηματος') === 'Μεταβίβαση Επιβατικού Οχήματος', 'δύο λέξεις');
ok(first('οχηματος μεταβιβαση') === 'Μεταβίβαση Επιβατικού Οχήματος', 'ανεξάρτητη σειρά');
ok(first('ποιν') === 'Αντίγραφο Ποινικού Μητρώου', 'πρόθεμα');
ok(all('εκκαθαριστικο').indexOf('Αντίγραφο Εκκαθαριστικού') >= 0 && all('εκκαθαριστικο').indexOf('Εκκαθαριστικό ΕΝΦΙΑ') >= 0, 'κλίση: εκκαθαριστικό βρίσκει και το εκκαθαριστικού');
ok(first('Ε9') === 'Δήλωση Στοιχείων Ακινήτων (Ε9)', 'Ε9');
ok(first('ΑΦΜ') === 'Βεβαίωση ΑΦΜ', 'ΑΦΜ');
ok(all('ξξξξ').length === 0, 'άγνωστο κείμενο: κενό αποτέλεσμα (ενεργοποιεί fallback)');
ok(all('').length === 0, 'κενό κείμενο');
ok(all('θελω').length === 0, 'μόνο stopword');

console.log(fail ? ('Αποτυχίες: ' + fail + ' από ' + total) : ('Όλα τα tests πέρασαν (' + total + ')'));
process.exit(fail ? 1 : 0);
