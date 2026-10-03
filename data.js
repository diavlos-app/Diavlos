// Δίαυλος — data.js
// Περιεχόμενο καρτών + αποθήκευση προσωπικών δεδομένων (μόνο τοπικά, στη συσκευή).
//
// response: "number" | "text" | "yesno" | "datetime" — αν λείπει, απλή δήλωση.
// unit:     μονάδα για response=number (π.χ. "€", "ημέρες", "λεπτά")

"use strict";

// ─── Κατηγορίες αρχικής οθόνης ────────────────────────────────────

const CARD_CATEGORIES = [
  {
    id: "emergency",
    name: "Έκτακτη Ανάγκη",
    type: "emergency"
  },
  {
    id: "services",
    name: "Υπηρεσίες",
    iconId: "icon-services",
    type: "phrases",
    cards: [
      { id: "srv-1",  text: "Θέλω να υποβάλω αίτηση." },
      { id: "srv-2",  text: "Θέλω πιστοποιητικό. Ποια δικαιολογητικά χρειάζομαι;", response: "text" },
      { id: "srv-3",  text: "Πόσο θα κοστίσει αυτή η διαδικασία;", response: "number", unit: "€" },
      { id: "srv-4",  text: "Πόσες μέρες θα χρειαστούν;", response: "number", unit: "ημέρες" },
      { id: "srv-5",  text: "Μπορείτε να μου το γράψετε, παρακαλώ;" },
      { id: "srv-6",  text: "Δεν κατάλαβα. Μπορείτε να το εξηγήσετε διαφορετικά;" },
      { id: "srv-7",  text: "Έχω ραντεβού. Πού πρέπει να πάω;", response: "text" },
      { id: "srv-8",  text: "Ευχαριστώ, κατάλαβα." },
      { id: "srv-9",  text: "Είμαι κωφός/κωφή. Θα επικοινωνήσουμε γραπτώς." },
      { id: "srv-10", text: "Ποιο είναι το όνομά σας;", response: "text" },
      { id: "srv-11", text: "Πότε είναι το ραντεβού μου;", response: "datetime" },
      { id: "srv-12", text: "Πότε μπορώ να έχω απάντηση για την αίτησή μου;", response: "datetime" },
      { id: "srv-13", text: "Θέλω να κλείσω ένα ραντεβού." },
      { id: "srv-14", text: "Πότε υπάρχει διαθέσιμο ραντεβού;", response: "datetime" },
      { id: "srv-15", text: "Χρειάζεται ραντεβού;", response: "yesno" },
      { id: "srv-16", text: "Μπορείτε να μου γράψετε τι πρέπει να κάνω;" },
      { id: "srv-17", text: "Θέλω να υποβάλω τα δικαιολογητικά μου." },
      { id: "srv-18", text: "Είναι πλήρης ο φάκελός μου;", response: "yesno" },
      { id: "srv-19", text: "Λείπει κάποιο δικαιολογητικό;", response: "yesno" },
      { id: "srv-20", text: "Χρειάζεται κάτι άλλο από εμένα;", response: "yesno" },
      { id: "srv-21", text: "Πού μπορώ να καταθέσω την αίτησή μου;", response: "text" },
      { id: "srv-22", text: "Μπορείτε να μου δώσετε ένα τηλέφωνο επικοινωνίας;", response: "text" },
      { id: "srv-23", text: "Πώς μπορώ να ενημερωθώ για την πορεία;" },
      { id: "srv-24", text: "Έχω τελειώσει;", response: "yesno" }
    ]
  },
  {
    id: "cafe",
    name: "Καφέ/Φαγητό",
    iconId: "icon-cafe",
    type: "phrases",
    cards: [
      { id: "caf-1",  text: "Τι θα μου προτείνατε;", response: "text" },
      { id: "caf-2",  text: "Θα πάρω αυτό, παρακαλώ." },
      { id: "caf-3",  text: "Έχετε κάτι χωρίς γλουτένη;" },
      { id: "caf-4",  text: "Έχετε κάτι χωρίς λακτόζη;" },
      { id: "caf-5",  text: "Πόσο κάνει αυτό;", response: "number", unit: "€" },
      { id: "caf-6",  text: "Τον λογαριασμό, παρακαλώ.", response: "number", unit: "€" },
      { id: "caf-7",  text: "Είναι ανοιχτά αύριο;", response: "yesno" },
      { id: "caf-8",  text: "Μπορώ να πληρώσω με κάρτα;" },
      { id: "caf-9",  text: "Ποια επιλογή είναι πιο δημοφιλής;", response: "text" },
      { id: "caf-10", text: "Τι περιέχει αυτό;", response: "text" },
      { id: "caf-11", text: "Έχω αλλεργία σε συστατικά. Μπορείτε να με ενημερώσετε;", response: "text" },
      { id: "caf-12", text: "Θα ήθελα μια vegan επιλογή.", response: "yesno" },
      { id: "caf-13", text: "Περιέχει το συστατικό που αποφεύγω;", response: "yesno" },
      { id: "caf-14", text: "Μπορώ να αλλάξω κάποιο συστατικό;", response: "yesno" },
      { id: "caf-15", text: "Θα ήθελα να παραγγείλω, παρακαλώ." },
      { id: "caf-16", text: "Θα πάρω την παραγγελία μου για το σπίτι." },
      { id: "caf-17", text: "Σε πόση ώρα θα είναι έτοιμη;", response: "number", unit: "λεπτά" },
      { id: "caf-18", text: "Θα ήθελα να κάνω μια κράτηση.", response: "datetime" },
      { id: "caf-19", text: "Υπάρχει διαθέσιμο τραπέζι;", response: "yesno" },
      { id: "caf-20", text: "Υπάρχει πρόβλημα με την παραγγελία μου.", response: "text" },
      { id: "caf-21", text: "Θα ήθελα να διορθωθεί η παραγγελία μου." }
    ]
  },
  {
    id: "pharmacy",
    name: "Φαρμακείο",
    iconId: "icon-pharmacy",
    type: "phrases",
    cards: [
      { id: "phm-1",  text: "Έχω αυτή τη συνταγή. Μπορείτε να με εξυπηρετήσετε;" },
      { id: "phm-2",  text: "Χρειάζομαι κάτι για πονοκέφαλο." },
      { id: "phm-3",  text: "Χρειάζομαι κάτι για βήχα." },
      { id: "phm-4",  text: "Υπάρχει γενόσημο;", response: "yesno" },
      { id: "phm-5",  text: "Πόσες φορές την ημέρα να το πάρω;", response: "number", unit: "φορές" },
      { id: "phm-6",  text: "Τα παίρνω με φαγητό ή χωρίς;", response: "text" },
      { id: "phm-7",  text: "Είναι διαθέσιμη η συνταγή μου;", response: "yesno" },
      { id: "phm-8",  text: "Χρειάζομαι βοήθεια για αυτά τα συμπτώματα.", response: "text" },
      { id: "phm-9",  text: "Πώς πρέπει να το παίρνω;", response: "text" },
      { id: "phm-10", text: "Πόσες ημέρες να το παίρνω;", response: "number", unit: "ημέρες" },
      { id: "phm-11", text: "Ποιες παρενέργειες μπορεί να έχει;", response: "text" },
      { id: "phm-12", text: "Έχω αυτά τα συμπτώματα μετά τη λήψη.", response: "text" },
      { id: "phm-13", text: "Μπορεί να προκαλέσει αλλεργική αντίδραση;", response: "yesno" },
      { id: "phm-14", text: "Έχω αλλεργία σε αυτό το φάρμακο." },
      { id: "phm-15", text: "Παίρνω και άλλα φάρμακα. Αλληλεπιδρούν;", response: "yesno" },
      { id: "phm-16", text: "Θέλω να σας πω ποια άλλα φάρμακα παίρνω.", response: "text" },
      { id: "phm-17", text: "Πόσο κοστίζει;", response: "number", unit: "€" },
      { id: "phm-18", text: "Μπορείτε να μου γράψετε τι να ρωτήσω τον γιατρό;", response: "text" },
      { id: "phm-19", text: "Τι κάνω αν ξεχάσω μια δόση;", response: "text" },
      { id: "phm-20", text: "Υπάρχει κάτι πιο οικονομικό;", response: "yesno" }
    ]
  },
  {
    id: "shopping",
    name: "Ψώνια",
    iconId: "icon-shopping",
    type: "phrases",
    cards: [
      { id: "shp-1",  text: "Πόσο κάνει αυτό;", response: "number", unit: "€" },
      { id: "shp-2",  text: "Ψάχνω κάτι συγκεκριμένο. Μπορείτε να με βοηθήσετε;" },
      { id: "shp-3",  text: "Έχετε αυτό σε άλλο μέγεθος;" },
      { id: "shp-4",  text: "Έχετε αυτό σε άλλο χρώμα;" },
      { id: "shp-5",  text: "Μπορώ να το αλλάξω αν δεν κάνει;" },
      { id: "shp-6",  text: "Δέχεστε κάρτα;" },
      { id: "shp-7",  text: "Θέλω απόδειξη, παρακαλώ." },
      { id: "shp-8",  text: "Πότε θα το φέρετε;", response: "datetime" },
      { id: "shp-9",  text: "Ποια είναι η τελική τιμή;", response: "number", unit: "€" },
      { id: "shp-10", text: "Υπάρχει κάποια προσφορά;", response: "yesno" },
      { id: "shp-11", text: "Θα ήθελα να βρω αυτό το προϊόν.", response: "text" },
      { id: "shp-12", text: "Μπορείτε να μου δείξετε πού βρίσκεται;", response: "text" },
      { id: "shp-13", text: "Υπάρχει διαθέσιμο αυτό το προϊόν;", response: "yesno" },
      { id: "shp-14", text: "Υπάρχει σε άλλο μοντέλο;", response: "text" },
      { id: "shp-15", text: "Πόσα μπορώ να αγοράσω;", response: "number", unit: "τεμάχια" },
      { id: "shp-16", text: "Τι εγγύηση έχει;", response: "text" },
      { id: "shp-17", text: "Καλύπτει η εγγύηση αυτό το πρόβλημα;", response: "yesno" },
      { id: "shp-18", text: "Μπορώ να το επιστρέψω;", response: "yesno" },
      { id: "shp-19", text: "Πότε μπορώ να το παραλάβω;", response: "text" }
    ]
  }
];

// ─── Tags για τα Αγαπημένα ────────────────────────────────────────

const TAGS = [
  { id: "personal",    label: "Προσωπικά",   iconId: "icon-tag-personal" },
  { id: "contact",     label: "Επικοινωνία", iconId: "icon-tag-contact" },
  { id: "health",      label: "Υγεία",       iconId: "icon-tag-health" },
  { id: "preferences", label: "Προτιμήσεις", iconId: "icon-tag-preferences" },
  { id: "other",       label: "Άλλα",        iconId: "icon-tag-other" }
];

// ─── Keys & Limits ────────────────────────────────────────────────

const CUSTOM_CARDS_KEY = "diavlos_v1_custom_cards";
const FAVORITES_KEY    = "diavlos_v1_favorites";
const RESPONSES_KEY    = "diavlos_v1_responses";

const CUSTOM_CARD_MAX_LENGTH    = 300;
const FAVORITE_LABEL_MAX_LENGTH = 60;
const FAVORITE_VALUE_MAX_LENGTH = 500;
const RESPONSE_TEXT_MAX_LENGTH  = 500;

// ─── Βοηθητικά αποθήκευσης ────────────────────────────────────────

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

// ─── Προσωπικές κάρτες ────────────────────────────────────────────

function getCustomCards() {
  return readJSON(CUSTOM_CARDS_KEY).filter(
    (c) => c && typeof c.id === "string" && typeof c.text === "string"
  );
}

function saveCustomCard(text) {
  const clean = (text || "").trim();
  if (!clean) return { ok: false, reason: "empty" };
  if (clean.length > CUSTOM_CARD_MAX_LENGTH) return { ok: false, reason: "too-long" };

  const cards = getCustomCards();
  cards.push({ id: makeId("custom"), text: clean });
  return writeJSON(CUSTOM_CARDS_KEY, cards) ? { ok: true } : { ok: false, reason: "storage" };
}

function deleteCustomCard(id) {
  const cards = getCustomCards().filter((c) => c.id !== id);
  return writeJSON(CUSTOM_CARDS_KEY, cards);
}

// ─── Αγαπημένα ────────────────────────────────────────────────────

function getFavorites() {
  const raw = readJSON(FAVORITES_KEY);
  const validTagIds = TAGS.map((t) => t.id);

  return raw.filter(
    (f) =>
      f &&
      typeof f.id === "string" &&
      typeof f.label === "string" &&
      typeof f.value === "string"
  ).map((f) => ({
    id: f.id,
    label: f.label,
    value: f.value,
    tags: Array.isArray(f.tags)
      ? f.tags.filter((t) => validTagIds.indexOf(t) !== -1)
      : []
  }));
}

function saveFavorite(label, value, tags) {
  const cleanLabel = (label || "").trim();
  const cleanValue = (value || "").trim();

  if (!cleanLabel) return { ok: false, reason: "label-empty" };
  if (!cleanValue) return { ok: false, reason: "value-empty" };
  if (cleanLabel.length > FAVORITE_LABEL_MAX_LENGTH) return { ok: false, reason: "label-too-long" };
  if (cleanValue.length > FAVORITE_VALUE_MAX_LENGTH) return { ok: false, reason: "value-too-long" };

  const validTagIds = TAGS.map((t) => t.id);
  const cleanTags = Array.isArray(tags)
    ? tags.filter((t) => validTagIds.indexOf(t) !== -1)
    : [];

  const favorites = getFavorites();
  const favorite = { id: makeId("fav"), label: cleanLabel, value: cleanValue, tags: cleanTags };
  favorites.push(favorite);
  return writeJSON(FAVORITES_KEY, favorites)
    ? { ok: true, favorite: favorite }
    : { ok: false, reason: "storage" };
}

function updateFavorite(id, label, value, tags) {
  const cleanLabel = (label || "").trim();
  const cleanValue = (value || "").trim();

  if (!cleanLabel) return { ok: false, reason: "label-empty" };
  if (!cleanValue) return { ok: false, reason: "value-empty" };
  if (cleanLabel.length > FAVORITE_LABEL_MAX_LENGTH) return { ok: false, reason: "label-too-long" };
  if (cleanValue.length > FAVORITE_VALUE_MAX_LENGTH) return { ok: false, reason: "value-too-long" };

  const validTagIds = TAGS.map((t) => t.id);
  const cleanTags = Array.isArray(tags)
    ? tags.filter((t) => validTagIds.indexOf(t) !== -1)
    : [];

  const favorites = getFavorites();
  const index = favorites.findIndex((f) => f.id === id);
  if (index === -1) return { ok: false, reason: "not-found" };

  favorites[index] = { id: id, label: cleanLabel, value: cleanValue, tags: cleanTags };
  return writeJSON(FAVORITES_KEY, favorites)
    ? { ok: true, favorite: favorites[index] }
    : { ok: false, reason: "storage" };
}

function deleteFavorite(id) {
  const favorites = getFavorites().filter((f) => f.id !== id);
  return writeJSON(FAVORITES_KEY, favorites);
}

function sortFavoritesAlphabetically(favorites) {
  return favorites.slice().sort((a, b) =>
    a.label.localeCompare(b.label, "el", { sensitivity: "base" })
  );
}

function filterFavoritesByTags(favorites, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return favorites;
  return favorites.filter((f) =>
    selectedTags.every((tag) => f.tags.indexOf(tag) !== -1)
  );
}

// ─── Ιστορικό Απαντήσεων ──────────────────────────────────────────

function getResponses() {
  const raw = readJSON(RESPONSES_KEY);
  return raw
    .filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.phrase === "string" &&
        typeof r.response === "string" &&
        typeof r.timestamp === "number"
    )
    .sort((a, b) => b.timestamp - a.timestamp);
}

function saveResponse(phrase, response, responseType, unit, categoryId, categoryName) {
  const cleanPhrase = (phrase || "").trim();
  const cleanResponse = (response || "").trim();

  if (!cleanPhrase) return { ok: false, reason: "phrase-empty" };
  if (!cleanResponse) return { ok: false, reason: "response-empty" };
  if (cleanResponse.length > RESPONSE_TEXT_MAX_LENGTH) return { ok: false, reason: "too-long" };

  const responses = readJSON(RESPONSES_KEY);
  const entry = {
    id: makeId("resp"),
    phrase: cleanPhrase,
    response: cleanResponse,
    responseType: responseType || "text",
    unit: unit || "",
    categoryId: categoryId || "",
    categoryName: categoryName || "",
    timestamp: Date.now()
  };
  responses.push(entry);
  return writeJSON(RESPONSES_KEY, responses)
    ? { ok: true, entry: entry }
    : { ok: false, reason: "storage" };
}

function deleteResponse(id) {
  const responses = readJSON(RESPONSES_KEY).filter((r) => r.id !== id);
  return writeJSON(RESPONSES_KEY, responses);
}

function clearResponses() {
  return writeJSON(RESPONSES_KEY, []);
}

function filterResponsesByDate(responses, filter) {
  if (!filter || filter === "all") return responses;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const cutoff = filter === "7d" ? now - 7 * day : now - 30 * day;
  return responses.filter((r) => r.timestamp >= cutoff);
}

// ─── Σημεία Προσβασιμότητας για τον Χάρτη ─────────────────────────
// Δομή feature:
//   signLanguage      — ΕΝΓ επί τόπου (προσωπικό)
//   signLanguageVideo — βίντεο/ξενάγηση στην ΕΝΓ
//   tabletDevices     — φορητές συσκευές με ΕΝΓ
//   iris              — τηλεδιερμηνεία IRIS
//   hearingLoop       — επαγωγικός βρόχος
//   liveCaptions      — live captions / speech-to-text
//   writtenComm       — γραπτή επικοινωνία
//   lipReading        — χειλεανάγνωση
//   deafStaff         — κωφοί/βαρήκοοι εργαζόμενοι
//
// availability: "permanent" | "on-request" | "on-events"
// reliability:  "high" | "medium" | "low"

const MAP_LOCATIONS = [
  // ═══ ΠΟΛΙΤΙΣΜΟΣ — ΜΟΥΣΕΙΑ & ΧΩΡΟΙ ═══
  {
    id: "loc-amth",
    name: "Αρχαιολογικό Μουσείο Θεσσαλονίκης",
    city: "Θεσσαλονίκη",
    category: "museum",
    coords: { lat: 40.6259, lng: 22.9604 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "SignGuide: διαδραστική ξενάγηση στην ΕΝΓ μέσω tablet/κινητού",
    source: "amth.gr"
  },
  {
    id: "loc-cycladic",
    name: "Μουσείο Κυκλαδικής Τέχνης",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9755, lng: 23.7444 },
    features: { signLanguage: true, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-request",
    reliability: "high",
    note: "Δωρεάν ξεναγήσεις στην ΕΝΓ (1 φορά/μήνα). Πρόγραμμα «IN TOUCH»",
    source: "cycladic.gr"
  },
  {
    id: "loc-gounaropoulos",
    name: "Μουσείο Γ. Γουναρόπουλου",
    city: "Ζωγράφου, Αθήνα",
    category: "museum",
    coords: { lat: 37.9762, lng: 23.7686 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-request",
    reliability: "high",
    note: "Ξεναγήσεις στη μόνιμη συλλογή με μετάφραση στη νοηματική",
    source: "gounaropoulos.gr"
  },
  {
    id: "loc-callas",
    name: "Μουσείο Μαρία Κάλλας",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9764, lng: 23.7293 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-events",
    reliability: "medium",
    note: "Κύκλος δωρεάν ξεναγήσεων στην ΕΝΓ από κωφό φυσικό ομιλητή",
    source: "mariacallasmuseum.gr"
  },
  {
    id: "loc-nam",
    name: "Εθνικό Αρχαιολογικό Μουσείο",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9890, lng: 23.7326 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακή περιήγηση για άτομα με προβλήματα ακοής",
    source: "culture.gov.gr"
  },
  {
    id: "loc-heraklion",
    name: "Αρχαιολογικό Μουσείο Ηρακλείου",
    city: "Ηράκλειο",
    category: "museum",
    coords: { lat: 35.3387, lng: 25.1388 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακή περιήγηση για άτομα με προβλήματα ακοής",
    source: "culture.gov.gr"
  },
  {
    id: "loc-patras-arch",
    name: "Νέο Αρχαιολογικό Μουσείο Πατρών",
    city: "Πάτρα",
    category: "museum",
    coords: { lat: 38.2466, lng: 21.7350 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακή περιήγηση για άτομα με προβλήματα ακοής",
    source: "culture.gov.gr"
  },
  {
    id: "loc-olympia-museum",
    name: "Αρχαιολογικό Μουσείο Αρχαίας Ολυμπίας",
    city: "Αρχαία Ολυμπία",
    category: "museum",
    coords: { lat: 37.6388, lng: 21.6297 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Hellenic Heritage Guide με ξενάγηση σε ΕΝΓ και Διεθνή Νοηματική",
    source: "odap.gr"
  },
  {
    id: "loc-olympia-site",
    name: "Αρχαιολογικός Χώρος Αρχαίας Ολυμπίας",
    city: "Αρχαία Ολυμπία",
    category: "museum",
    coords: { lat: 37.6389, lng: 21.6300 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Hellenic Heritage Guide — ψηφιακή ξενάγηση στην ΕΝΓ",
    source: "odap.gr"
  },
  {
    id: "loc-delphi",
    name: "Αρχαιολογικό Μουσείο Δελφών",
    city: "Δελφοί",
    category: "museum",
    coords: { lat: 38.4824, lng: 22.5010 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακή περιήγηση με βίντεο σε ΕΝΓ και Αγγλική Νοηματική (QR codes)",
    source: "culture.gov.gr"
  },
  {
    id: "loc-igoumenitsa",
    name: "Αρχαιολογικό Μουσείο Ηγουμενίτσας",
    city: "Ηγουμενίτσα",
    category: "museum",
    coords: { lat: 39.5035, lng: 20.2643 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Βίντεο στην ΕΝΓ (μόνιμη έκθεση). Δωρεάν tablets στην είσοδο",
    source: "igoumenitsamuseum.gr"
  },
  {
    id: "loc-mbp",
    name: "Μουσείο Βυζαντινού Πολιτισμού",
    city: "Θεσσαλονίκη",
    category: "museum",
    coords: { lat: 40.6238, lng: 22.9518 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Συσκευές ξενάγησης στην ΕΝΓ + mobile εφαρμογή με ΕΝΓ",
    source: "mbp.gr"
  },
  {
    id: "loc-ote-museum",
    name: "Μουσείο Τηλεπικοινωνιών Ομίλου ΟΤΕ",
    city: "Νέα Κηφισιά",
    category: "museum",
    coords: { lat: 38.0863, lng: 23.8122 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακή ξενάγηση στην Ελληνική Νοηματική",
    source: "otegroupmuseum.gr"
  },
  {
    id: "loc-mnep",
    name: "Μουσείο Νεότερου Ελληνικού Πολιτισμού",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9755, lng: 23.7244 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Ψηφιακός ξεναγός με αυτοκαθοδηγούμενη ξενάγηση στην ΕΝΓ",
    source: "mnep.gr"
  },
  {
    id: "loc-imma",
    name: "Μουσείο Μακεδονικού Αγώνα",
    city: "Θεσσαλονίκη",
    category: "museum",
    coords: { lat: 40.6329, lng: 22.9419 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-events",
    reliability: "medium",
    note: "Ξεναγήσεις με παράλληλη διερμηνεία ΕΝΓ (οργανωμένες)",
    source: "imma.edu.gr"
  },
  {
    id: "loc-tobacco-kavala",
    name: "Μουσείο Καπνού Καβάλας",
    city: "Καβάλα",
    category: "museum",
    coords: { lat: 40.9365, lng: 24.4091 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "on-events",
    reliability: "low",
    note: "Οπτικοακουστικό υλικό στην ΕΝΓ — χρειάζεται επιτόπια επιβεβαίωση",
    source: "icom-greece.gr"
  },
  {
    id: "loc-tsalapatas",
    name: "Μουσείο Πλινθοκεραμοποιίας Ν. & Σ. Τσαλαπάτα",
    city: "Βόλος",
    category: "museum",
    coords: { lat: 39.3627, lng: 22.9462 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "medium",
    note: "Οθόνες με περιγραφές στην Ελληνική και Διεθνή Νοηματική",
    source: "myrtis.gr"
  },

  // ═══ ΠΟΛΙΤΙΣΜΟΣ — ΘΕΑΤΡΑ & ΚΙΝΗΜΑΤΟΓΡΑΦΟΙ ═══
  {
    id: "loc-ethniko-theatro",
    name: "Εθνικό Θέατρο",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9831, lng: 23.7281 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: true, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-events",
    reliability: "high",
    note: "Παραστάσεις με υπέρτιτλους ΤΚΒ + ταυτόχρονη διερμηνεία στην ΕΝΓ",
    source: "nationaltheatre.gr"
  },
  {
    id: "loc-onassis",
    name: "Στέγη Ιδρύματος Ωνάση",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9835, lng: 23.7221 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: true, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-events",
    reliability: "high",
    note: "Προσβάσιμες παραστάσεις με υπέρτιτλους και διερμηνεία στην ΕΝΓ",
    source: "onassis.org"
  },
  {
    id: "loc-danaos",
    name: "Κινηματογράφος Δαναός",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9875, lng: 23.7237 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: true, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Προβολές με ελληνικούς υπότιτλους SDH",
    source: "danaoscinema.gr"
  },
  {
    id: "loc-tainiothiki",
    name: "Ταινιοθήκη της Ελλάδος",
    city: "Αθήνα",
    category: "museum",
    coords: { lat: 37.9816, lng: 23.7162 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: true, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Προβολές με υπότιτλους SDH",
    source: "tainiothiki.gr"
  },

  // ═══ ΤΡΑΠΕΖΕΣ ═══
  {
    id: "loc-piraeus-ebranch-peristeri",
    name: "Τράπεζα Πειραιώς — e-branch Περιστέρι",
    city: "Περιστέρι, Αθήνα",
    category: "bank",
    coords: { lat: 38.0133, lng: 23.6918 },
    features: { signLanguage: true, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "low",
    note: "e-branch με «Ταμία από απόσταση». Ταμίες εκπαιδευμένοι στην ΕΝΓ υπάρχουν σε ~30 καταστήματα με μηχάνημα VTS, αλλά η τράπεζα δεν δημοσιεύει ποια — επιβεβαίωσε πριν πας.",
    source: "piraeusgroup.gr"
  },
  {
    id: "loc-piraeus-ebranch-spyromiliou",
    name: "Τράπεζα Πειραιώς — e-branch Στοά Σπυρομήλιου",
    city: "Αθήνα",
    category: "bank",
    coords: { lat: 37.9765, lng: 23.7260 },
    features: { signLanguage: true, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "low",
    note: "e-branch με «Ταμία από απόσταση». Ταμίες εκπαιδευμένοι στην ΕΝΓ υπάρχουν σε ~30 καταστήματα με μηχάνημα VTS, αλλά η τράπεζα δεν δημοσιεύει ποια — επιβεβαίωσε πριν πας.",
    source: "piraeusgroup.gr"
  },
  {
    id: "loc-eurobank-korai",
    name: "Eurobank — Κατάστημα Κοραή",
    city: "Αθήνα",
    category: "bank",
    coords: { lat: 37.9793, lng: 23.7325 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "on-request",
    reliability: "low",
    note: "Κατάστημα Νέας Γενιάς με «αισθητηριακό χάρτη». Η νοηματική παρέχεται από την Eurobank μέσω βιντεοκλήσης (v-Banking)· ΕΝΓ επί τόπου δεν επιβεβαιώθηκε.",
    source: "eurobank.gr"
  },
  {
    id: "loc-eurobank-rethymno",
    name: "Eurobank Ρεθύμνου",
    city: "Ρέθυμνο",
    address: "Κουντουριώτου 103, Ρέθυμνο",
    category: "bank",
    coords: { lat: 35.3655, lng: 24.4744 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "on-request",
    reliability: "low",
    note: "Κατάστημα Νέας Γενιάς (εγκαίνια 2025) με «αισθητηριακό χάρτη». Η νοηματική παρέχεται μέσω v-Banking (βιντεοκλήση)· ΕΝΓ επί τόπου δεν επιβεβαιώθηκε.",
    source: "eurobank.gr"
  },
  {
    id: "loc-nbg-syntagma",
    name: "Εθνική Τράπεζα — Κατάστημα Συντάγματος",
    city: "Αθήνα",
    category: "bank",
    coords: { lat: 37.9755, lng: 23.7350 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "low",
    note: "Αναφέρεται εκπαίδευση εργαζομένων στη νοηματική· δεν βρέθηκε επίσημη επιβεβαίωση για αυτό το κατάστημα.",
    source: "nbg.gr"
  },

  // ═══ ΔΗΜΟΣΙΕΣ ΥΠΗΡΕΣΙΕΣ ═══
  {
    id: "loc-kep-chalandri",
    name: "ΚΕΠ Χαλανδρίου",
    city: "Χαλάνδρι",
    category: "public",
    coords: { lat: 38.0167, lng: 23.7994 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "4 υπάλληλοι εκπαιδευμένοι στη νοηματική + IRIS Relay",
    source: "chalandri.gr"
  },
  {
    id: "loc-kep-neas-ionias",
    name: "ΚΕΠ Νέας Ιωνίας",
    city: "Νέα Ιωνία, Αθήνα",
    category: "public",
    coords: { lat: 38.0387, lng: 23.7620 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "high",
    note: "Δια ζώσης εξυπηρέτηση στη νοηματική κατόπιν ραντεβού",
    source: "neaisonia.gr"
  },
  {
    id: "loc-kep-korydallos",
    name: "ΚΕΠ Κορυδαλλού",
    city: "Κορυδαλλός, Αθήνα",
    category: "public",
    coords: { lat: 37.9777, lng: 23.6495 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "on-request",
    reliability: "high",
    note: "IRIS-RELAY",
    source: "kep.gov.gr"
  },
  {
    id: "loc-kep-xanthi",
    name: "ΚΕΠ Ξάνθης",
    city: "Ξάνθη",
    category: "public",
    coords: { lat: 41.1365, lng: 24.8881 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "high",
    note: "Σταθμός τηλε-βιντεοεπικοινωνίας RELAY (μέσω ΕΙΚ)",
    source: "kep.gov.gr"
  },
  {
    id: "loc-lixiarxeio-athinon",
    name: "Ληξιαρχείο Δήμου Αθηναίων",
    city: "Αθήνα",
    category: "public",
    coords: { lat: 37.9755, lng: 23.7263 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: true, hearingLoop: true, liveCaptions: true, writtenComm: true, lipReading: true, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "high",
    note: "IRIS/Relay Service, Speech2text, Telecoil, διαφανής μάσκα",
    source: "cityofathens.gr"
  },
  {
    id: "loc-dimos-thessalonikis",
    name: "Δημαρχείο Θεσσαλονίκης",
    city: "Θεσσαλονίκη",
    category: "public",
    coords: { lat: 40.6363, lng: 22.9420 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: true, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: true, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "high",
    note: "Φυσικός σταθμός τηλε-διερμηνείας IRIS στον ισόγειο χώρο",
    source: "thessaloniki.gr"
  },
  {
    id: "loc-kepa-galatsi",
    name: "ΚΕΠΑ Γαλατσίου",
    city: "Γαλάτσι, Αθήνα",
    category: "public",
    coords: { lat: 38.0170, lng: 23.7492 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "on-request",
    reliability: "high",
    note: "Πιλοτική υπηρεσία βιντεοκλήσης με διερμηνέα ΕΝΓ (e-ΕΦΚΑ)",
    source: "e-efka.gov.gr"
  },

  // ═══ ΥΓΕΙΑ ═══
  {
    id: "loc-laiko",
    name: "Γενικό Νοσοκομείο Αττικής «Λαϊκό»",
    city: "Αθήνα",
    address: "Αγ. Θωμά 17, Αθήνα",
    category: "health",
    coords: { lat: 37.9968, lng: 23.7801 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "high",
    note: "Σταθμός βιντεοεπικοινωνίας Relay (IRIS) — επιβεβαιωμένο στη λίστα του myiris.gr",
    source: "laiko.gr"
  },
  {
    id: "loc-alexandra",
    name: "Νοσοκομείο «Αλεξάνδρα»",
    city: "Αθήνα",
    iris: true,
    address: "Λεωφ. Βασιλίσσης Σοφίας 80, Αθήνα",
    category: "health",
    coords: { lat: 37.9792, lng: 23.7529 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: true, iris: true, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "permanent",
    reliability: "medium",
    note: "Σταθμός Relay (IRIS). Στη λίστα του myiris.gr αναφέρεται ως «σύντομα» — επιβεβαίωσε στη είσοδο.",
    source: "alexandra-hosp.gr"
  },
  {
    id: "loc-affidea-dafni",
    name: "Affidea Δάφνης",
    city: "Δάφνη, Αθήνα",
    category: "health",
    coords: { lat: 37.9502, lng: 23.7355 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-request",
    reliability: "high",
    note: "Ραντεβού με διερμηνεία στη νοηματική",
    source: "affidea.gr"
  },
  {
    id: "loc-affidea-vari",
    name: "Affidea Βάρης",
    city: "Βάρη, Αττική",
    category: "health",
    coords: { lat: 37.8260, lng: 23.8030 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-request",
    availability: "on-request",
    reliability: "high",
    note: "Ραντεβού με διερμηνεία στη νοηματική",
    source: "affidea.gr"
  },
  {
    id: "loc-damaskou",
    name: "Φαρμακείο Δαμάσκου Ζωή",
    city: "Θεσσαλονίκη (Ντεπώ)",
    category: "health",
    coords: { lat: 40.6117, lng: 22.9552 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "Εξυπηρέτηση στη νοηματική γλώσσα, πρόσβαση με αμαξίδιο",
    source: "local press"
  },

  // ═══ ΕΣΤΙΑΣΗ ═══
  {
    id: "loc-epomeni-stasi",
    name: "Επόμενη Στάση (ΚΟΙΝΣΕΠ)",
    city: "Θεσσαλονίκη (Νέα Αγορά)",
    category: "food",
    coords: { lat: 40.6355, lng: 22.9415 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "8 κωφοί/βαρήκοοι εργαζόμενοι. Παραγγελία με νοηματική",
    source: "local press"
  },
  {
    id: "loc-myrtillo",
    name: "Myrtillo Café",
    city: "Αμπελόκηποι, Αθήνα",
    category: "food",
    coords: { lat: 37.9875, lng: 23.7543 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "90% προσωπικό με αναπηρία, συμπ. κωφών. Κοινωνική επιχείρηση",
    source: "myrtillo.gr"
  },
  {
    id: "loc-bistro22",
    name: "Bistro22",
    city: "Αθήνα",
    category: "food",
    coords: { lat: 37.9805, lng: 23.7400 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "medium",
    note: "Προσωπικό εκπαιδευμένο για ανάγκες ατόμων με αναπηρία",
    source: "local press"
  },
  {
    id: "loc-amigoes-zografou",
    name: "Café Amigoes (Ζωγράφου)",
    city: "Ζωγράφου, Αθήνα",
    category: "food",
    coords: { lat: 37.9762, lng: 23.7710 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: true, liveCaptions: false, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Assistive Hearing Loop (επαγωγικός βρόχος)",
    source: "mystartup.gr"
  },
  {
    id: "loc-amigoes-pagrati",
    name: "Café Amigoes (Παγκράτι)",
    city: "Παγκράτι, Αθήνα",
    category: "food",
    coords: { lat: 37.9685, lng: 23.7482 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: true, liveCaptions: false, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Assistive Hearing Loop",
    source: "mystartup.gr"
  },
  {
    id: "loc-kudu",
    name: "KUDU Coffee Shop",
    city: "Παγκράτι, Αθήνα",
    category: "food",
    coords: { lat: 37.9692, lng: 23.7495 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: true, liveCaptions: false, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Assistive Hearing Loop",
    source: "mystartup.gr"
  },
  {
    id: "loc-cataskopos",
    name: "CATASKOPOS",
    city: "Ζωγράφου, Αθήνα",
    category: "food",
    coords: { lat: 37.9768, lng: 23.7720 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: true, liveCaptions: false, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "Assistive Hearing Loop",
    source: "mystartup.gr"
  },
  {
    id: "loc-giantis",
    name: "Ταβέρνα Γιώργου Γιάντση",
    city: "Θεσσαλονίκη (Κρήνη)",
    category: "food",
    coords: { lat: 40.6324, lng: 22.9637 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "Κωφοί/βαρήκοοι σερβιτόροι και μάγειρες",
    source: "local press"
  },

  // ═══ ΛΙΑΝΕΜΠΟΡΙΟ ═══
  {
    id: "loc-praktiker-tavros",
    name: "Praktiker Ταύρος",
    city: "Ταύρος, Αττική",
    address: "Πειραιώς 176, Ταύρος",
    category: "retail",
    coords: { lat: 37.971028, lng: 23.701919 },
    features: { signLanguage: false, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "on-request",
    reliability: "medium",
    note: "Διερμηνεία ΕΝΓ μέσα στο κατάστημα, κατόπιν ραντεβού (φόρμα στο praktiker.gr). Ανακοινώθηκε το 2023 για όλα τα καταστήματα· επιβεβαίωσε πριν πας.",
    source: "praktiker.gr"
  },
  {
    id: "loc-ikea-kifisos",
    name: "IKEA Αθήνα Κηφισός",
    city: "Αιγάλεω, Αττική",
    category: "retail",
    coords: { lat: 37.9940, lng: 23.6830 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "medium",
    note: "Σταθμοί εξυπηρέτησης με δυνατότητα γραπτής επικοινωνίας",
    source: "ikea.gr"
  },
  {
    id: "loc-ktenion",
    name: "Ktenion Hair Salon",
    city: "Λάρισα",
    category: "retail",
    coords: { lat: 39.6390, lng: 22.4194 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "medium",
    note: "Ράμπα ΑμεΑ, προσωπικό που γνωρίζει νοηματική γλώσσα",
    source: "local press"
  },

  // ═══ ΜΕΤΑΦΟΡΕΣ ═══
  {
    id: "loc-athens-airport",
    name: "Διεθνής Αερολιμένας Αθηνών «Ελ. Βενιζέλος»",
    city: "Σπάτα, Αττική",
    category: "transport",
    coords: { lat: 37.9364, lng: 23.9445 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: true, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "high",
    note: "1-to-1 hearing loop systems + window intercom systems στα γκισέ",
    source: "nngroup.gr"
  },

  // ═══ ΕΚΠΑΙΔΕΥΣΗ (για ΦΟΙΤΗΤΕΣ) ═══
  {
    id: "loc-upatras",
    name: "Πανεπιστήμιο Πατρών",
    city: "Πάτρα",
    category: "education",
    coords: { lat: 38.2890, lng: 21.7873 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "high",
    note: "Διερμηνεία ΕΝΓ για ΦΟΙΤΗΤΕΣ (Κανονισμός Ισότιμης Πρόσβασης)",
    source: "prosvasi.upatras.gr"
  },
  {
    id: "loc-uth",
    name: "Πανεπιστήμιο Θεσσαλίας",
    city: "Βόλος / Λάρισα / Τρίκαλα",
    category: "education",
    coords: { lat: 39.3572, lng: 22.9568 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "high",
    note: "Διερμηνεία ΕΝΓ για ΦΟΙΤΗΤΕΣ (Μονάδα Ισότιμης Πρόσβασης)",
    source: "prosvasi.uth.gr"
  },
  {
    id: "loc-uniwa",
    name: "Πανεπιστήμιο Δυτικής Αττικής",
    city: "Αιγάλεω, Αθήνα",
    category: "education",
    coords: { lat: 37.9881, lng: 23.6804 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "high",
    note: "Διερμηνεία ΕΝΓ σε εξετάσεις για ΦΟΙΤΗΤΕΣ (Μονάδα «Πρόσβαση»)",
    source: "prosvasi.uniwa.gr"
  },
  {
    id: "loc-uoa",
    name: "Εθνικό και Καποδιστριακό Πανεπιστήμιο Αθηνών",
    city: "Αθήνα",
    category: "education",
    coords: { lat: 37.9807, lng: 23.7280 },
    features: { signLanguage: true, signLanguageVideo: true, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "remote",
    availability: "on-request",
    reliability: "high",
    note: "Ζωντανή τηλεδιερμηνεία ΕΝΓ για ΦΟΙΤΗΤΕΣ (Μονάδα Προσβασιμότητας)",
    source: "access.uoa.gr"
  },
  {
    id: "loc-ihu",
    name: "Διεθνές Πανεπιστήμιο της Ελλάδος",
    city: "Θεσσαλονίκη / Σίνδος / Σέρρες",
    category: "education",
    coords: { lat: 40.6647, lng: 22.9449 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "on-request",
    reliability: "high",
    note: "Διερμηνεία + τηλεδιερμηνεία ΕΝΓ για ΦΟΙΤΗΤΕΣ",
    source: "prosvasi.ihu.gr"
  },

  // ═══ ΞΕΝΟΔΟΧΕΙΑ ═══
  {
    id: "loc-stanley",
    name: "Ξενοδοχείο Stanley",
    city: "Αθήνα",
    category: "hotel",
    coords: { lat: 37.9938, lng: 23.7255 },
    features: { signLanguage: false, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: false },
    interpreter: null,
    availability: "permanent",
    reliability: "medium",
    note: "Εκπαιδευμένο προσωπικό για προσβάσιμο τουρισμό",
    source: "hotelstanley.gr"
  },
  {
    id: "loc-kipriotis-maris",
    name: "Kipriotis Maris Suites",
    city: "Ψαλίδι, Κως",
    category: "hotel",
    coords: { lat: 36.8576, lng: 27.2430 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "medium",
    note: "Κωφοί εργαζόμενοι με εκπαίδευση τουριστικής ακαδημίας",
    source: "tripadvisor.com"
  },
  {
    id: "loc-kipriotis-panorama",
    name: "Kipriotis Panorama Hotel & Suites",
    city: "Ψαλίδι, Κως",
    category: "hotel",
    coords: { lat: 36.8580, lng: 27.2440 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "medium",
    note: "Κωφοί εργαζόμενοι στο εστιατόριο",
    source: "tripadvisor.com"
  },
  {
    id: "loc-kipriotis-aqualand",
    name: "Kipriotis Aqualand Hotel",
    city: "Ψαλίδι, Κως",
    category: "hotel",
    coords: { lat: 36.8565, lng: 27.2420 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: true, lipReading: false, deafStaff: true },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "low",
    note: "Κωφοί εργαζόμενοι στο κεντρικό εστιατόριο (αναφορά επισκέπτη 2025)",
    source: "tripadvisor.com"
  },

  // ═══ ΘΡΗΣΚΕΥΤΙΚΟΙ ΧΩΡΟΙ ═══
  {
    id: "loc-evangelistria",
    name: "Ιερός Ναός Ευαγγελίστριας",
    city: "Πειραιάς",
    category: "public",
    coords: { lat: 37.9425, lng: 23.6463 },
    features: { signLanguage: true, signLanguageVideo: false, tabletDevices: false, iris: false, hearingLoop: false, liveCaptions: false, writtenComm: false, lipReading: false, deafStaff: false },
    interpreter: "on-site",
    availability: "permanent",
    reliability: "high",
    note: "Θεία Λειτουργία στη Νοηματική κάθε Κυριακή",
    source: "local press"
  }
];
