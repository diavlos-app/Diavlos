// /service/data/services.js
// 6 κατηγορίες ΚΕΠ + υπηρεσίες + ερωτήσεις. Στο demo υπάρχει μία πλήρης υπηρεσία.
window.DiavlosData = window.DiavlosData || {};
window.DiavlosData.kepName = 'Καλαμαριάς';   // όνομα ΚΕΠ demo (τελικό: μετά τις δοκιμές)
window.DiavlosData.qrUrl = 'https://www.gov.gr/ipiresies/polites-kai-kathemerinoteta';
window.DiavlosData.categories = [
  { id: 'pistopoiitika', icon: '📄', label: 'Πιστοποιητικά & Βεβαιώσεις', services: [] },
  { id: 'taytotita',     icon: '🔐', label: 'Ταυτότητα, Taxisnet, ΑΜΚΑ',   services: [] },
  { id: 'dilosis',       icon: '✍️', label: 'Δηλώσεις & Γνήσιο Υπογραφής', services: [] },
  { id: 'paralavi',      icon: '🚚', label: 'Παραλαβή Εγγράφων',           services: [] },
  { id: 'ochimata',      icon: '🚗', label: 'Διπλώματα & Οχήματα', services: [
    { id: 'metavivasi-epivatikou', label: 'Μεταβίβαση Επιβατικού Οχήματος',
      questions: [
        { id: 'q1', text: 'Είστε ο πωλητής ή ο αγοραστής;', answers: ['Πωλητής', 'Αγοραστής'] },
        { id: 'q2', text: 'Έχετε μαζί σας την άδεια κυκλοφορίας;', answers: ['ΝΑΙ', 'ΟΧΙ'] },
        { id: 'q3', text: 'Υπάρχει ενεργός δανεισμός / leasing στο όχημα;', answers: ['ΝΑΙ', 'ΟΧΙ'] }
      ],
      docs: [
        { key: 'adeia-kykloforias', label: 'Άδεια Κυκλοφορίας (υπογεγραμμένη και από τα δύο μέρη)' },
        { key: 'dat', label: 'ΔΑΤ ή Διαβατήριο πωλητή & αγοραστή' },
        { key: 'veveosi-afm', label: 'Βεβαίωση ΑΦΜ Αγοραστή' },
        { key: 'kteo', label: 'Ισχύον ΚΤΕΟ' },
        { key: 'veveosi-mi-ofilis', label: 'Βεβαίωση μη οφειλής τελών κυκλοφορίας (ΔΟΥ)' },
        { key: 'parastatiko-trapezis', label: 'Παραστατικό Τραπέζης (τέλη μεταβίβασης + άδειας)' },
        { key: 'ypeuthini-dilosi', label: 'Υπεύθυνη Δήλωση - Εξουσιοδότηση (αν δεν παρίσταται κάποιος)' }
      ] }
  ] },
  { id: 'epidomata',     icon: '🏥', label: 'Επιδόματα, Υγεία, ΔΥΠΑ',      services: [] }
];
