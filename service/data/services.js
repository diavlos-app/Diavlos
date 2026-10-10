// service/data/services.js
// 8 κατηγορίες (ονόματα gov.gr) + υπηρεσίες ΚΕΠ.
// status: 'implemented' = πλήρης ροή (ερωτήσεις + πεδία + έγγραφα)
//         'catalog_only' = μόνο τίτλος + keywords, ανοίγει το chat με τον υπάλληλο.
window.DiavlosData = window.DiavlosData || {};
window.DiavlosData.kepName = 'Καλαμαριάς';   // όνομα ΚΕΠ demo (τελικό: μετά τις δοκιμές)
window.DiavlosData.qrUrl = 'https://www.gov.gr/ipiresies/polites-kai-kathemerinoteta';   // σελίδα για το fallback QR

// Βοηθητικό: υπηρεσία μόνο για αναζήτηση (χωρίς ροή)
function katalogos(categoryId, id, label, keywords) {
  return { id: id, label: label, categoryId: categoryId, status: 'catalog_only', keywords: keywords, questions: [], docs: [], fields: [] };
}
var NAI_OXI = ['ΝΑΙ', 'ΟΧΙ', 'Δεν ξέρω'];   // το «Δεν ξέρω» είναι ξεχωριστή απάντηση, δεν γίνεται «ΟΧΙ»

window.DiavlosData.categories = [
  { id: 'periousia-forologia', label: 'Περιουσία και φορολογία', icon: 'home', services: [
    { id: 'forologiki-enimerotita', label: 'Φορολογική Ενημερότητα', categoryId: 'periousia-forologia', status: 'implemented',
      keywords: ['ενημερότητα', 'εφορία', 'ΔΟΥ', 'οφειλές', 'φόροι', 'taxisnet'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm', 'doy', 'dieythynsi', 'tk', 'kinito', 'email'] },
    { id: 'antigrafo-ekkatharistikou', label: 'Αντίγραφο Εκκαθαριστικού', categoryId: 'periousia-forologia', status: 'implemented',
      keywords: ['εκκαθαριστικό', 'εφορία', 'δήλωση', 'εισόδημα', 'φόρος'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm', 'doy', 'etos', 'dieythynsi'] },
    { id: 'vevaiosi-afm', label: 'Βεβαίωση ΑΦΜ', categoryId: 'periousia-forologia', status: 'implemented',
      keywords: ['ΑΦΜ', 'βεβαίωση', 'εφορία', 'φορολογικός', 'μητρώο'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'patronymo', 'imgennisis', 'adt', 'afm', 'doy'] },
    katalogos('periousia-forologia', 'dilosi-forou-eisodimatos', 'Δήλωση Φόρου Εισοδήματος', ['εφορία', 'Ε1', 'φορολογική δήλωση', 'εισόδημα']),
    katalogos('periousia-forologia', 'entypo-e9', 'Δήλωση Στοιχείων Ακινήτων (Ε9)', ['ακίνητα', 'Ε9', 'περιουσία', 'σπίτι']),
    katalogos('periousia-forologia', 'enarxi-epitidevmatos', 'Έναρξη Επιτηδεύματος', ['επιτήδευμα', 'ελεύθερος επαγγελματίας', 'ατομική επιχείρηση', 'έναρξη']),
    katalogos('periousia-forologia', 'ekkatharistiko-enfia', 'Εκκαθαριστικό ΕΝΦΙΑ', ['ΕΝΦΙΑ', 'ακίνητο', 'φόρος περιουσίας', 'εκκαθαριστικό']),
    katalogos('periousia-forologia', 'allagi-stoixeion-afm', 'Αλλαγή Στοιχείων στο Φορολογικό Μητρώο', ['αλλαγή', 'ΑΦΜ', 'στοιχεία', 'μητρώο']),
    katalogos('periousia-forologia', 'kodikoi-taxisnet', 'Αίτηση Κωδικών Taxisnet', ['κωδικοί', 'taxisnet', 'πρόσβαση', 'κωδικός'])
  ] },
  { id: 'strateusi', label: 'Στράτευση', icon: 'sword', services: [
    { id: 'pistopoiitiko-stratologikis-katastasis', label: 'Πιστοποιητικό Στρατολογικής Κατάστασης', categoryId: 'strateusi', status: 'implemented',
      keywords: ['στρατός', 'στράτευση', 'θητεία', 'στρατολογία', 'απολυτήριο στρατού'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'patronymo', 'imgennisis', 'afm'] },
    katalogos('strateusi', 'anaboli-kataxatasis', 'Αναβολή Κατάταξης', ['αναβολή', 'θητεία', 'σπουδές', 'στρατός']),
    katalogos('strateusi', 'metavoli-stoixeion-stratologias', 'Μεταβολή Στοιχείων Στρατολογικής Κατάστασης', ['αλλαγή', 'στοιχεία', 'στρατολογία', 'διεύθυνση'])
  ] },
  { id: 'dikaiosyni', label: 'Δικαιοσύνη', icon: 'shield', services: [
    { id: 'antigrafo-poinikou-mitrou', label: 'Αντίγραφο Ποινικού Μητρώου', categoryId: 'dikaiosyni', status: 'implemented',
      keywords: ['ποινικό', 'μητρώο', 'λευκό ποινικό', 'δικαστήριο', 'καθαρό'],
      questions: [
        { id: 'q1', text: 'Θα το παραλάβετε εσείς ο ίδιος/η ίδια;', answers: NAI_OXI },
        { id: 'q2', text: 'Το χρειάζεστε για εργασία ή πρόσληψη;', answers: NAI_OXI }
      ],
      docs: [
        { key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' },
        { key: 'exousiodotisi', label: 'Εξουσιοδότηση (αν δεν το παραλαμβάνει ο ίδιος)' }
      ],
      fields: ['onomateponymo', 'patronymo', 'mitronymo', 'imgennisis', 'topos-gennisis', 'afm'] },
    katalogos('dikaiosyni', 'pistopoiitiko-mi-ptocheusis', 'Πιστοποιητικό Μη Πτώχευσης', ['πτώχευση', 'εταιρεία', 'δικαστήριο', 'πιστοποιητικό'])
  ] },
  { id: 'ergasia-asfalisi', label: 'Εργασία και ασφάλιση', icon: 'briefcase', services: [
    { id: 'vevaiosi-asfalistikis-ikanotitas', label: 'Βεβαίωση Ασφαλιστικής Ικανότητας', categoryId: 'ergasia-asfalisi', status: 'implemented',
      keywords: ['ασφαλιστική ικανότητα', 'ΑΜΚΑ', 'ασφάλιση', 'ΕΦΚΑ', 'υγειονομική περίθαλψη'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'patronymo', 'imgennisis', 'amka', 'afm', 'foreas'] },
    { id: 'asfalistiki-enimerotita', label: 'Ασφαλιστική Ενημερότητα', categoryId: 'ergasia-asfalisi', status: 'implemented',
      keywords: ['ενημερότητα', 'ΕΦΚΑ', 'εισφορές', 'ασφάλιση', 'οφειλές'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm', 'amka', 'foreas', 'dieythynsi', 'tk', 'kinito', 'afmergodoti'] },
    { id: 'karta-anergias-dypa', label: 'Κάρτα Ανεργίας (ΔΥΠΑ)', categoryId: 'ergasia-asfalisi', status: 'implemented',
      keywords: ['ανεργία', 'άνεργος', 'ΔΥΠΑ', 'ΟΑΕΔ', 'κάρτα', 'επίδομα'],
      questions: [
        { id: 'q1', text: 'Είστε ήδη εγγεγραμμένος/η στη ΔΥΠΑ;', answers: NAI_OXI },
        { id: 'q2', text: 'Έχετε κωδικούς Taxisnet;', answers: NAI_OXI }
      ],
      docs: [
        { key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' },
        { key: 'asfalistiki-ikanotita', label: 'Βεβαίωση Ασφαλιστικής Ικανότητας (ΑΜΚΑ)' }
      ],
      fields: ['onomateponymo', 'afm', 'amka', 'kinito', 'email'] },
    katalogos('ergasia-asfalisi', 'veveosi-ensimon', 'Βεβαίωση Ενσήμων', ['ένσημα', 'ΕΦΚΑ', 'ασφάλιση', 'εργασία']),
    katalogos('ergasia-asfalisi', 'aitisi-syntaxis', 'Αίτηση Σύνταξης', ['σύνταξη', 'συνταξιοδότηση', 'ΕΦΚΑ', 'συνταξιούχος']),
    katalogos('ergasia-asfalisi', 'epidoma-anergias', 'Επίδομα Ανεργίας', ['ανεργία', 'ΔΥΠΑ', 'επίδομα', 'άνεργος']),
    katalogos('ergasia-asfalisi', 'ekdosi-amka', 'Έκδοση ΑΜΚΑ', ['ΑΜΚΑ', 'αριθμός', 'κοινωνική ασφάλιση', 'νέο'])
  ] },
  { id: 'politis-kathimerinotita', label: 'Πολίτης και καθημερινότητα', icon: 'user', services: [
    { id: 'metavivasi-epivatikou', label: 'Μεταβίβαση Επιβατικού Οχήματος', categoryId: 'politis-kathimerinotita', status: 'implemented',
      keywords: ['αυτοκίνητο', 'όχημα', 'μεταβίβαση', 'πώληση', 'αγορά', 'πινακίδες'],
      questions: [
        { id: 'q1', text: 'Είστε ο πωλητής ή ο αγοραστής;', answers: ['Πωλητής', 'Αγοραστής'] },
        { id: 'q2', text: 'Έχετε μαζί σας την άδεια κυκλοφορίας;', answers: NAI_OXI },
        { id: 'q3', text: 'Υπάρχει ενεργός δανεισμός / leasing στο όχημα;', answers: NAI_OXI }
      ],
      docs: [
        { key: 'adeia-kykloforias', label: 'Άδεια Κυκλοφορίας (υπογεγραμμένη και από τα δύο μέρη)' },
        { key: 'dat', label: 'ΔΑΤ ή Διαβατήριο πωλητή & αγοραστή' },
        { key: 'veveosi-afm', label: 'Βεβαίωση ΑΦΜ Αγοραστή' },
        { key: 'kteo', label: 'Ισχύον ΚΤΕΟ' },
        { key: 'veveosi-mi-ofilis', label: 'Βεβαίωση μη οφειλής τελών κυκλοφορίας (ΔΟΥ)' },
        { key: 'parastatiko-trapezis', label: 'Παραστατικό Τραπέζης (τέλη μεταβίβασης + άδειας)' },
        { key: 'ypeuthini-dilosi', label: 'Υπεύθυνη Δήλωση - Εξουσιοδότηση (αν δεν παρίσταται κάποιος)' }
      ],
      fields: ['onomateponymo', 'afm', 'adt', 'pinakida', 'dieythynsi', 'kinito'] },
    { id: 'vevaiosi-monimis-katoikias', label: 'Βεβαίωση Μόνιμης Κατοικίας', categoryId: 'politis-kathimerinotita', status: 'implemented',
      keywords: ['κατοικία', 'διεύθυνση', 'μόνιμη', 'εντοπιότητα', 'δήμος'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm', 'dieythynsi', 'tk'] },
    { id: 'ypefthyni-dilosi', label: 'Υπεύθυνη Δήλωση', categoryId: 'politis-kathimerinotita', status: 'implemented',
      keywords: ['δήλωση', 'υπεύθυνη', 'ν.1599', 'ένορκη', 'βεβαίωση'],
      questions: [
        { id: 'q1', text: 'Θα την υπογράψετε εσείς ο ίδιος/η ίδια;', answers: NAI_OXI },
        { id: 'q2', text: 'Θα κατατεθεί σε δημόσια υπηρεσία;', answers: NAI_OXI }
      ],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'patronymo', 'mitronymo', 'imgennisis', 'adt', 'dieythynsi', 'afm'] },
    { id: 'exousiodotisi', label: 'Εξουσιοδότηση', categoryId: 'politis-kathimerinotita', status: 'implemented',
      keywords: ['εξουσιοδότηση', 'αντιπρόσωπος', 'εκπροσώπηση', 'πληρεξούσιο', 'για λογαριασμό μου'],
      questions: [
        { id: 'q1', text: 'Εσείς εξουσιοδοτείτε κάποιον ή εξουσιοδοτείστε από κάποιον;', answers: ['Εξουσιοδοτώ εγώ', 'Εξουσιοδοτούμαι'] },
        { id: 'q2', text: 'Έχει ο εξουσιοδοτούμενος την ταυτότητά του μαζί;', answers: NAI_OXI }
      ],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm', 'adt', 'exousiodotoumenos'] },
    katalogos('politis-kathimerinotita', 'theorisi-gnisiou-ypografis', 'Θεώρηση Γνησίου Υπογραφής', ['υπογραφή', 'γνήσιο', 'θεώρηση', 'επικύρωση']),
    katalogos('politis-kathimerinotita', 'epikyrosi-fotoantigrafon', 'Επικύρωση Φωτοαντιγράφων', ['φωτοτυπία', 'φωτοαντίγραφο', 'αντίγραφο', 'επικύρωση']),
    katalogos('politis-kathimerinotita', 'allagi-dieythynsis', 'Αλλαγή Διεύθυνσης Κατοικίας', ['διεύθυνση', 'μετακόμιση', 'κατοικία', 'αλλαγή']),
    katalogos('politis-kathimerinotita', 'anaveosi-diplomatos', 'Ανανέωση Διπλώματος Οδήγησης', ['δίπλωμα', 'οδήγηση', 'ανανέωση', 'διαρκείας']),
    katalogos('politis-kathimerinotita', 'antikatastasi-adeias-kykloforias', 'Αντικατάσταση Άδειας Κυκλοφορίας', ['άδεια', 'κυκλοφορία', 'όχημα', 'απώλεια']),
    katalogos('politis-kathimerinotita', 'veveosi-telon-kykloforias', 'Βεβαίωση Τελών Κυκλοφορίας', ['τέλη', 'κυκλοφορίας', 'όχημα', 'οφειλή'])
  ] },
  { id: 'ygeia-pronoia', label: 'Υγεία και πρόνοια', icon: 'heart-pulse', services: [
    katalogos('ygeia-pronoia', 'evropaiki-karta-asfalisis', 'Ευρωπαϊκή Κάρτα Ασφάλισης Ασθενείας', ['ΕΚΑΑ', 'κάρτα', 'ασθένεια', 'ταξίδι', 'εξωτερικό']),
    katalogos('ygeia-pronoia', 'epidoma-anapirias', 'Επίδομα Αναπηρίας', ['αναπηρία', 'επίδομα', 'ΚΕΠΑ', 'ΟΠΕΚΑ'])
  ] },
  { id: 'ekpaideusi', label: 'Εκπαίδευση', icon: 'graduation-cap', services: [
    katalogos('ekpaideusi', 'veveosi-spoudon', 'Βεβαίωση Σπουδών', ['σπουδές', 'φοιτητής', 'σχολή', 'πανεπιστήμιο']),
    katalogos('ekpaideusi', 'antigrafo-apolytiriou', 'Αντίγραφο Απολυτηρίου', ['απολυτήριο', 'λύκειο', 'σχολείο', 'αντίγραφο']),
    katalogos('ekpaideusi', 'foititiko-stegastiko-epidoma', 'Φοιτητικό Στεγαστικό Επίδομα', ['στέγαση', 'φοιτητής', 'επίδομα', 'ενοίκιο'])
  ] },
  { id: 'oikogeneia', label: 'Οικογένεια', icon: 'users', services: [
    { id: 'pistopoiitiko-oikogeneiakis-katastasis', label: 'Πιστοποιητικό Οικογενειακής Κατάστασης', categoryId: 'oikogeneia', status: 'implemented',
      keywords: ['οικογένεια', 'γάμος', 'παιδιά', 'σύζυγος', 'παντρεμένος', 'ανύπαντρος'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm'] },
    { id: 'pistopoiitiko-gennisis', label: 'Πιστοποιητικό Γέννησης', categoryId: 'oikogeneia', status: 'implemented',
      keywords: ['γέννηση', 'γεννήθηκα', 'ληξιαρχείο', 'ληξιαρχική πράξη', 'δημοτολόγιο'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm'] },
    { id: 'pistopoiitiko-eggyteron-syggenon', label: 'Πιστοποιητικό Εγγυτέρων Συγγενών', categoryId: 'oikogeneia', status: 'implemented',
      keywords: ['συγγενείς', 'κληρονομιά', 'θάνατος', 'κληρονόμοι', 'οικογένεια'],
      questions: [],
      docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }],
      fields: ['onomateponymo', 'afm'] },
    katalogos('oikogeneia', 'lixiarxiki-praxi-gamou', 'Ληξιαρχική Πράξη Γάμου', ['γάμος', 'πράξη', 'ληξιαρχείο', 'παντρεύτηκα']),
    katalogos('oikogeneia', 'lixiarxiki-praxi-thanatou', 'Ληξιαρχική Πράξη Θανάτου', ['θάνατος', 'πέθανε', 'ληξιαρχείο', 'πράξη']),
    katalogos('oikogeneia', 'epidoma-paidiou', 'Επίδομα Παιδιού (Α21)', ['παιδί', 'επίδομα', 'τέκνο', 'Α21']),
    katalogos('oikogeneia', 'epidoma-gennisis', 'Επίδομα Γέννησης', ['γέννηση', 'μωρό', 'επίδομα', 'τέκνο'])
  ] }
];

// 8 δημοφιλή (στατική λίστα). Πάνε απευθείας στη ροή, χωρίς επιβεβαίωση.
window.DiavlosData.popular = [
  'pistopoiitiko-oikogeneiakis-katastasis',
  'pistopoiitiko-gennisis',
  'pistopoiitiko-eggyteron-syggenon',
  'antigrafo-poinikou-mitrou',
  'vevaiosi-monimis-katoikias',
  'pistopoiitiko-stratologikis-katastasis',
  'ypefthyni-dilosi',
  'vevaiosi-asfalistikis-ikanotitas'
];

// Όλες οι υπηρεσίες σε επίπεδη λίστα (για την αναζήτηση)
window.DiavlosData.allServices = function () {
  var out = [];
  window.DiavlosData.categories.forEach(function (c) { c.services.forEach(function (s) { out.push(s); }); });
  return out;
};
// Εύρεση υπηρεσίας από το id της (επιστρέφει και την κατηγορία μέσω categoryId)
window.DiavlosData.serviceById = function (id) {
  var all = window.DiavlosData.allServices();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
};
