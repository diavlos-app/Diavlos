// /service/data/fields.js
// Παλέτα πεδίων του υπαλλήλου. Επίπεδο 1 = μόνιμο, Επίπεδο 2 = on-demand.
// kb: πληκτρολόγιο (numeric | latin | greek | date). type: κανόνας επικύρωσης (βλ. validation.js)
window.DiavlosData = window.DiavlosData || {};
window.DiavlosData.fields = [
  { key: 'onomateponymo', label: 'Ονοματεπώνυμο', level: 1, kb: 'greek',   type: 'name',    hint: 'Γράψτε το ονοματεπώνυμό σας' },
  { key: 'patronymo',     label: 'Πατρώνυμο',     level: 1, kb: 'greek',   type: 'name',    hint: 'Γράψτε το όνομα του πατέρα σας' },
  { key: 'mitronymo',     label: 'Μητρώνυμο',     level: 1, kb: 'greek',   type: 'name',    hint: 'Γράψτε το όνομα της μητέρας σας' },
  { key: 'imgennisis',    label: 'Ημ. Γέννησης',  level: 1, kb: 'date',    type: 'date',    hint: 'Επιλέξτε την ημερομηνία γέννησής σας' },
  { key: 'adt',           label: 'ΑΔΤ',           level: 1, kb: 'greek',   type: 'adt',     hint: 'Γράψτε τον αριθμό της ταυτότητάς σας (π.χ. ΑΙ 123456)' },
  { key: 'afm',           label: 'ΑΦΜ',           level: 1, kb: 'numeric', type: 'afm',     hint: 'Γράψτε τον ΑΦΜ σας (9 ψηφία)' },
  { key: 'amka',          label: 'ΑΜΚΑ',          level: 1, kb: 'numeric', type: 'amka',    hint: 'Γράψτε τον ΑΜΚΑ σας (11 ψηφία)' },
  { key: 'doy',           label: 'ΔΟΥ',           level: 1, kb: 'greek',   type: 'text',    hint: 'Γράψτε τη ΔΟΥ σας' },
  { key: 'foreas',        label: 'Ασφαλιστικός Φορέας', level: 1, kb: 'greek', type: 'text', hint: 'Γράψτε τον ασφαλιστικό σας φορέα' },
  { key: 'dieythynsi',    label: 'Διεύθυνση',     level: 1, kb: 'greek',   type: 'address', hint: 'Γράψτε τη διεύθυνσή σας' },
  { key: 'tk',            label: 'ΤΚ',            level: 1, kb: 'numeric', type: 'tk',      hint: 'Γράψτε τον Ταχυδρομικό Κώδικα (5 ψηφία)' },
  { key: 'kinito',        label: 'Κινητό',        level: 1, kb: 'numeric', type: 'mobile',  hint: 'Γράψτε το κινητό σας (10 ψηφία)' },
  { key: 'stathero',      label: 'Σταθερό',       level: 1, kb: 'numeric', type: 'landline',hint: 'Γράψτε το σταθερό σας (10 ψηφία)' },
  { key: 'email',         label: 'Email',         level: 1, kb: 'latin',   type: 'email',   hint: 'Γράψτε το email σας' },
  { key: 'iban',          label: 'IBAN',          level: 2, kb: 'latin',   type: 'iban',    hint: 'Γράψτε τον IBAN σας (GR + 25 ψηφία)' },
  { key: 'arprotokollou', label: 'Αρ. Πρωτοκόλλου', level: 2, kb: 'latin', type: 'alnum',   hint: 'Γράψτε τον αριθμό πρωτοκόλλου' },
  { key: 'amkatexnou',    label: 'ΑΜΚΑ τέκνου',   level: 2, kb: 'numeric', type: 'amka',    hint: 'Γράψτε τον ΑΜΚΑ του τέκνου (11 ψηφία)' },
  { key: 'syzygos',       label: 'Σύζυγος',       level: 2, kb: 'greek',   type: 'name',    hint: 'Γράψτε το ονοματεπώνυμο του/της συζύγου' },
  { key: 'afmergodoti',   label: 'ΑΦΜ εργοδότη',  level: 2, kb: 'numeric', type: 'afm',     hint: 'Γράψτε τον ΑΦΜ του εργοδότη (9 ψηφία)' },
  { key: 'topos-gennisis', label: 'Τόπος Γέννησης', level: 2, kb: 'greek', type: 'text', hint: 'Γράψτε τον τόπο γέννησής σας' },
  { key: 'etos',          label: 'Έτος',          level: 2, kb: 'numeric', type: 'digits',  hint: 'Γράψτε το έτος (π.χ. 2025)' },
  { key: 'pinakida',      label: 'Αρ. Πινακίδας', level: 2, kb: 'latin',   type: 'alnum',   hint: 'Γράψτε τον αριθμό πινακίδας του οχήματος' },
  { key: 'exousiodotoumenos', label: 'Εξουσιοδοτούμενος', level: 2, kb: 'greek', type: 'name', hint: 'Γράψτε το ονοματεπώνυμο του εξουσιοδοτούμενου' }
];
window.DiavlosData.fieldByKey = function (k) {
  return window.DiavlosData.fields.filter(function (f) { return f.key === k; })[0] || null;
};
