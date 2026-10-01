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