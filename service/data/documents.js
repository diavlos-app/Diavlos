// /service/data/documents.js
// Γενική λίστα εγγράφων (κλειδωμένη) ανά ομάδα. «where» = κείμενο για το [ΑΠΟ ΠΟΥ ΘΑ ΤΟ ΒΡΩ;]
window.DiavlosData = window.DiavlosData || {};
window.DiavlosData.docGroups = [
  { id: 'taytopoiisi', label: 'Ταυτοποίηση', where: 'Από την Αστυνομία (ταυτότητα, διαβατήριο), την Υπηρεσία Μετανάστευσης (άδεια διαμονής) ή τις Υπηρεσίες Μεταφορών (δίπλωμα).',
    docs: [{ key: 'dat', label: 'Δελτίο Αστυνομικής Ταυτότητας (ΔΑΤ)' }, { key: 'diavatirio', label: 'Διαβατήριο' }, { key: 'adeia-diamonis', label: 'Άδεια Διαμονής' }, { key: 'diploma-odigisis', label: 'Δίπλωμα Οδήγησης' }] },
  { id: 'forologika', label: 'Φορολογικά', where: 'Από την πλατφόρμα myAADE (aade.gr) ή τη ΔΟΥ σας. Η ασφαλιστική ενημερότητα εκδίδεται από τον ασφαλιστικό σας φορέα (π.χ. ΕΦΚΑ).',
    docs: [{ key: 'ekkatharistiko', label: 'Εκκαθαριστικό Εφορίας (τελευταίο)' }, { key: 'e9', label: 'Έντυπο Ε9' }, { key: 'veveosi-afm', label: 'Βεβαίωση ΑΦΜ' }, { key: 'asfalistiki-enim', label: 'Ασφαλιστική Ενημερότητα' }, { key: 'forologiki-enim', label: 'Φορολογική Ενημερότητα' }] },
  { id: 'oikogeneiaka', label: 'Οικογενειακά / Ληξιαρχικά', where: 'Από το Ληξιαρχείο ή το Δημοτολόγιο του δήμου σας.',
    docs: [{ key: 'ikogeneiaki-katastasi', label: 'Πιστοποιητικό Οικογενειακής Κατάστασης' }, { key: 'lixiarxiki-genisis', label: 'Ληξιαρχική Πράξη Γέννησης' }, { key: 'lixiarxiki-gamou', label: 'Ληξιαρχική Πράξη Γάμου' }, { key: 'eggyteron-syggenon', label: 'Πιστοποιητικό Εγγυτέρων Συγγενών' }, { key: 'entopiotitas', label: 'Πιστοποιητικό Εντοπιότητας / Μόνιμης Κατοικίας' }] },
  { id: 'ekpaideysi', label: 'Εκπαίδευση', where: 'Από το σχολείο ή τη σχολή που φοιτήσατε.',
    docs: [{ key: 'apolytirio', label: 'Απολυτήριο Λυκείου' }, { key: 'ptyxio', label: 'Πτυχίο / Μεταπτυχιακό' }, { key: 'veveosi-spoudon', label: 'Βεβαίωση Σπουδών' }] },
  { id: 'ergasia', label: 'Εργασία / Ασφάλιση', where: 'Από τον ΕΦΚΑ, τη ΔΥΠΑ ή τον εργοδότη σας.',
    docs: [{ key: 'asfalistiki-ikanotita', label: 'Βεβαίωση Ασφαλιστικής Ικανότητας (ΑΜΚΑ)' }, { key: 'ensima', label: 'Ένσημα / Βεβαίωση Ενσήμων' }, { key: 'karta-anergias', label: 'Κάρτα Ανεργίας (ΔΥΠΑ)' }, { key: 'veveosi-ergodoti', label: 'Βεβαίωση Εργοδότη' }] },
  { id: 'ochimata', label: 'Οχήματα', where: 'Από τις Υπηρεσίες Μεταφορών, ένα ΚΤΕΟ, τη ΔΟΥ ή τον πωλητή του οχήματος.',
    docs: [{ key: 'adeia-kykloforias', label: 'Άδεια Κυκλοφορίας' }, { key: 'kteo', label: 'Δελτίο Τεχνικού Ελέγχου (ΚΤΕΟ)' }, { key: 'veveosi-mi-ofilis', label: 'Βεβαίωση μη οφειλής τελών κυκλοφορίας' }, { key: 'timologio-agoras', label: 'Τιμολόγιο / Απόδειξη αγοράς οχήματος' }] },
  { id: 'trapeza', label: 'Τράπεζα / Οικονομικά', where: 'Από την τράπεζά σας.',
    docs: [{ key: 'parastatiko-trapezis', label: 'Παραστατικό Τραπέζης (καταβολή τέλους)' }, { key: 'iban-veveosi', label: 'IBAN (βεβαίωση τραπέζης)' }, { key: 'misthotirio', label: 'Μισθωτήριο Συμβόλαιο' }] },
  { id: 'dilosis', label: 'Δηλώσεις / Εξουσιοδοτήσεις', where: 'Η Υπεύθυνη Δήλωση και η Εξουσιοδότηση συντάσσονται στο ΚΕΠ ή στο gov.gr. Το Πληρεξούσιο γίνεται σε συμβολαιογράφο.',
    docs: [{ key: 'ypeuthini-dilosi', label: 'Υπεύθυνη Δήλωση (θεωρημένο γνήσιο υπογραφής)' }, { key: 'exousiodotisi', label: 'Εξουσιοδότηση' }, { key: 'plirexousio', label: 'Συμβολαιογραφικό Πληρεξούσιο' }] },
  { id: 'logariasmoi', label: 'Λογαριασμοί (απόδειξη διεύθυνσης)', where: 'Από τον πάροχο (ΔΕΗ, ΕΥΔΑΠ/ΕΥΑΘ, τηλεφωνίας) ή τον λογαριασμό σας online.',
    docs: [{ key: 'deh', label: 'Λογαριασμός ΔΕΗ' }, { key: 'eydap', label: 'Λογαριασμός ΕΥΔΑΠ' }, { key: 'tilefono-internet', label: 'Λογαριασμός τηλεφώνου / internet' }] }
];
// Εύρεση ομάδας ενός εγγράφου (για το «από πού θα το βρω»)
window.DiavlosData.docGroupOf = function (key) {
  var g = window.DiavlosData.docGroups;
  for (var i = 0; i < g.length; i++) for (var j = 0; j < g[i].docs.length; j++) if (g[i].docs[j].key === key) return g[i];
  return null;
};
// Όλα τα έγγραφα σε επίπεδη λίστα
window.DiavlosData.allDocs = function () {
  var out = [];
  window.DiavlosData.docGroups.forEach(function (g) { g.docs.forEach(function (d) { out.push({ key: d.key, label: d.label, group: g.id }); }); });
  return out;
};
