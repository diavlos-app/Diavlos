// Δίαυλος — app.js
// Οθόνες: αρχική (5 κάρτες) → λίστες φράσεων, Έκτακτη Ανάγκη, Αγαπημένα.
// Το DOM χτίζεται με createElement/textContent (όχι innerHTML).

"use strict";

// ─── Σταθερές views ───────────────────────────────────────────────

const VIEWS = {
  HOME: "home",
  EMERGENCY: "emergency",
  EMERGENCY_CALL: "emergency-call",
  EMERGENCY_FIELD: "emergency-field",
  CUSTOM: "custom",
  FAVORITES: "favorites"
};

const TABS = {
  CARDS: "cards",
  FAVORITES: "favorites"
};

const EMERGENCY_NUMBERS = [
  { number: "100", label: "Αστυνομία",  icon: "👮" },
  { number: "166", label: "ΕΚΑΒ",       icon: "🚑" },
  { number: "199", label: "Πυροσβεστική", icon: "🚒" },
  { number: "112", label: "Ευρωπαϊκός Αριθμός Έκτακτης Ανάγκης", icon: "🇪🇺" }
];

const EMERGENCY_FIELD_PHRASES = [
  "Είμαι κωφός/κωφή.",
  "Χρειάζομαι βοήθεια.",
  "Κάποιος τραυματίστηκε.",
  "Δεν καταλαβαίνω.",
  "Περιμένετε, παρακαλώ.",
  "Μπορείτε να μου το γράψετε;"
];

// ─── Κατάσταση ────────────────────────────────────────────────────

let currentView = VIEWS.HOME;
let currentTab = TABS.CARDS;
let selectedTags = [];           // φίλτρα για τα Αγαπημένα (AND logic)
let pendingDelete = null;        // { type: "custom" | "favorite", id, text }
let editingFavoriteId = null;    // null = νέο, αλλιώς edit υπάρχοντος
let dialogOpener = null;
let toastTimer = null;
const els = {};

// ─── Βοηθητικά DOM ────────────────────────────────────────────────

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clear(node) {
  node.replaceChildren();
}

function isKnownView(view) {
  if (view === VIEWS.HOME || view === VIEWS.CUSTOM || view === VIEWS.FAVORITES) return true;
  if (view === VIEWS.EMERGENCY || view === VIEWS.EMERGENCY_CALL || view === VIEWS.EMERGENCY_FIELD) return true;
  return CARD_CATEGORIES.some((c) => c.id === view);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 5000);
}

function openDialog(dialog, opener) {
  dialogOpener = opener || document.activeElement;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function restoreFocusAfterDialog() {
  if (dialogOpener && document.contains(dialogOpener)) dialogOpener.focus();
  dialogOpener = null;
}

// ─── Πλοήγηση ─────────────────────────────────────────────────────

function navigateTo(view) {
  if (view === currentView) return;
  history.pushState({ view: view }, "");
  render(view, true);
}

function goBack() {
  if (currentView === VIEWS.HOME && currentTab === TABS.CARDS) return;
  history.back();
}

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  // Το tab switching ΔΕΝ μπαίνει στο history — αλλάζει ενότητα, δεν πλοηγεί.
  history.replaceState({ view: tab === TABS.FAVORITES ? VIEWS.FAVORITES : VIEWS.HOME }, "");
  render(tab === TABS.FAVORITES ? VIEWS.FAVORITES : VIEWS.HOME, true);
}

function updateTabBar() {
  els.tabCards.classList.toggle("active", currentTab === TABS.CARDS);
  els.tabFavorites.classList.toggle("active", currentTab === TABS.FAVORITES);
  if (currentTab === TABS.CARDS) {
    els.tabCards.setAttribute("aria-current", "page");
    els.tabFavorites.removeAttribute("aria-current");
  } else {
    els.tabFavorites.setAttribute("aria-current", "page");
    els.tabCards.removeAttribute("aria-current");
  }
}

function render(view, moveFocus) {
  currentView = view;

  // Το πίσω κουμπί φαίνεται σε όποια οθόνη δεν είναι αρχική
  els.back.hidden = (view === VIEWS.HOME || view === VIEWS.FAVORITES);

  // Το FAB φαίνεται μόνο στις «Κάρτες μου» ή στα Αγαπημένα
  const showFab = (view === VIEWS.CUSTOM || view === VIEWS.FAVORITES);
  els.fab.hidden = !showFab;
  els.fab.textContent = view === VIEWS.FAVORITES ? "+" : "+";
  els.fab.setAttribute(
    "aria-label",
    view === VIEWS.FAVORITES ? "Νέο Αγαπημένο" : "Προσθήκη κάρτας"
  );

  // Ενημέρωση tab bar
  if (view === VIEWS.FAVORITES) currentTab = TABS.FAVORITES;
  else if (view === VIEWS.HOME || CARD_CATEGORIES.some((c) => c.id === view)) currentTab = TABS.CARDS;
  updateTabBar();

  if (view === VIEWS.HOME) renderHome();
  else if (view === VIEWS.EMERGENCY) renderEmergency();
  else if (view === VIEWS.EMERGENCY_CALL) renderEmergencyCall();
  else if (view === VIEWS.EMERGENCY_FIELD) renderEmergencyField();
  else if (view === VIEWS.CUSTOM) renderCustom();
  else if (view === VIEWS.FAVORITES) renderFavorites();
  else renderPhraseList(view);

  if (moveFocus) els.title.focus();
}

// ─── Οθόνη: Αρχική ────────────────────────────────────────────────

function renderHome() {
  els.title.textContent = "Δίαυλος";
  const frag = document.createDocumentFragment();

  // Έκτακτη Ανάγκη — full-width
  const emergency = CARD_CATEGORIES.find((c) => c.id === "emergency");
  frag.appendChild(emergencyCard(emergency));

  // Υπόλοιπες 4 σε 2x2 grid
  const grid = h("div", "category-grid");
  CARD_CATEGORIES.forEach((cat) => {
    if (cat.id === "emergency") return;
    grid.appendChild(categoryButton(cat.icon, cat.name, cat.id));
  });
  frag.appendChild(grid);

  clear(els.content);
  els.content.appendChild(frag);
}

function emergencyCard(cat) {
  const wrap = h("div", "emergency-card");

  const header = h("div", "emergency-header");
  const icon = h("span", "emergency-icon", cat.icon);
  icon.setAttribute("aria-hidden", "true");
  const title = h("span", "emergency-title", cat.name);
  header.append(icon, title);
  wrap.appendChild(header);

  const actions = h("div", "emergency-actions");

  const callBtn = h("button", "btn-emergency-call", "📞 ΚΛΗΣΗ");
  callBtn.type = "button";
  callBtn.addEventListener("click", () => navigateTo(VIEWS.EMERGENCY_CALL));

  const fieldBtn = h("button", "btn-emergency-field", "ΝΑΙ / ΟΧΙ");
  fieldBtn.type = "button";
  fieldBtn.addEventListener("click", () => navigateTo(VIEWS.EMERGENCY_FIELD));

  actions.append(callBtn, fieldBtn);
  wrap.appendChild(actions);

  return wrap;
}

function categoryButton(icon, name, view) {
  const btn = h("button", "category-card");
  btn.type = "button";
  const iconEl = h("span", "category-icon", icon);
  iconEl.setAttribute("aria-hidden", "true");
  btn.append(iconEl, h("span", "category-name", name));
  btn.addEventListener("click", () => navigateTo(view));
  return btn;
}

// ─── Οθόνη: Έκτακτη Ανάγκη — Κλήση ────────────────────────────────

function renderEmergencyCall() {
  els.title.textContent = "Κλήση Έκτακτης Ανάγκης";

  const note = h("p", "emergency-note",
    "Επιλέξτε υπηρεσία. Η κλήση γίνεται απευθείας από το τηλέφωνό σας."
  );

  const list = h("div", "emergency-numbers");
  EMERGENCY_NUMBERS.forEach((item) => {
    const btn = h("button", "emergency-number-btn");
    btn.type = "button";
    const iconEl = h("span", "emergency-number-icon", item.icon);
    iconEl.setAttribute("aria-hidden", "true");
    const numEl = h("span", "emergency-number-num", item.number);
    const lblEl = h("span", "emergency-number-label", item.label);
    btn.append(iconEl, numEl, lblEl);
    btn.addEventListener("click", () => {
      window.location.href = "tel:" + item.number;
    });
    list.appendChild(btn);
  });

  clear(els.content);
  els.content.append(note, list);
}

// ─── Οθόνη: Έκτακτη Ανάγκη — Πεδίο (ΝΑΙ/ΟΧΙ) ─────────────────────

function renderEmergencyField() {
  els.title.textContent = "Επικοινωνία στο σημείο";

  const note = h("p", "emergency-note",
    "Δείξτε την οθόνη στον αστυνομικό, διασώστη ή όποιον σας βοηθά."
  );

  const header = h("div", "field-header");
  header.appendChild(h("p", "field-statement", "Είμαι κωφός/κωφή."));
  header.appendChild(h("p", "field-statement", "Επικοινωνούμε γραπτώς."));

  const yesNo = h("div", "yesno-grid");
  const yesBtn = h("button", "yesno-btn yesno-yes");
  yesBtn.type = "button";
  yesBtn.setAttribute("aria-label", "Ναι");
  const yesIcon = h("span", "yesno-icon", "✓");
  yesIcon.setAttribute("aria-hidden", "true");
  yesBtn.append(yesIcon, h("span", "yesno-label", "ΝΑΙ"));

  const noBtn = h("button", "yesno-btn yesno-no");
  noBtn.type = "button";
  noBtn.setAttribute("aria-label", "Όχι");
  const noIcon = h("span", "yesno-icon", "✗");
  noIcon.setAttribute("aria-hidden", "true");
  noBtn.append(noIcon, h("span", "yesno-label", "ΟΧΙ"));

  // Προς το παρόν απλά full-screen display — θα το εμπλουτίσουμε αργότερα
  yesBtn.addEventListener("click", () => openFullscreen("ΝΑΙ"));
  noBtn.addEventListener("click", () => openFullscreen("ΟΧΙ"));

  yesNo.append(yesBtn, noBtn);

  const phraseTitle = h("h2", "field-phrases-title", "Γρήγορες φράσεις");
  const phraseList = h("div", "card-list");
  EMERGENCY_FIELD_PHRASES.forEach((text, i) => {
    const card = phraseCard({ id: "ef-" + i, text: text }, false, false);
    phraseList.appendChild(card);
  });

  clear(els.content);
  els.content.append(note, header, yesNo, phraseTitle, phraseList);
}

// ─── Οθόνη: Λίστα φράσεων κατηγορίας ──────────────────────────────

function renderPhraseList(view) {
  const cat = CARD_CATEGORIES.find((c) => c.id === view);
  if (!cat) return;

  els.title.textContent = cat.name;
  const list = h("div", "card-list");
  cat.cards.forEach((card) => {
    list.appendChild(phraseCard(card, false, true));
  });

  clear(els.content);
  els.content.appendChild(list);
}

// ─── Οθόνη: «Οι Κάρτες μου» ───────────────────────────────────────

function renderCustom() {
  els.title.textContent = "Οι Κάρτες μου";
  const cards = getCustomCards();

  if (cards.length === 0) {
    clear(els.content);
    els.content.appendChild(
      h("p", "empty-state",
        "Δεν έχεις προσθέσει ακόμα δικές σου κάρτες. Πάτα το + για να γράψεις την πρώτη.")
    );
    return;
  }

  const list = h("div", "card-list");
  cards.forEach((card) => {
    list.appendChild(phraseCard(card, true, true));
  });

  clear(els.content);
  els.content.appendChild(list);
}

// ─── Οθόνη: Αγαπημένα ─────────────────────────────────────────────

function renderFavorites() {
  els.title.textContent = "Αγαπημένα";

  const favorites = sortFavoritesAlphabetically(getFavorites());

  const frag = document.createDocumentFragment();
  frag.appendChild(favoritesFilterBar());

  if (favorites.length === 0) {
    frag.appendChild(
      h("p", "empty-state",
        "Δεν έχεις ακόμα αγαπημένα. Πάτα το + για να προσθέσεις στοιχεία όπως ΑΦΜ, διεύθυνση ή τον καφέ σου.")
    );
    clear(els.content);
    els.content.appendChild(frag);
    return;
  }

  const filtered = filterFavoritesByTags(favorites, selectedTags);

  if (filtered.length === 0) {
    frag.appendChild(
      h("p", "empty-state", "Κανένα αποτέλεσμα με τα επιλεγμένα φίλτρα.")
    );
    clear(els.content);
    els.content.appendChild(frag);
    return;
  }

  const list = h("div", "favorites-list");
  filtered.forEach((fav) => list.appendChild(favoriteRow(fav)));
  frag.appendChild(list);

  clear(els.content);
  els.content.appendChild(frag);
}

function favoritesFilterBar() {
  const bar = h("div", "filter-bar");

  const allBtn = h("button", "filter-chip" + (selectedTags.length === 0 ? " filter-chip-active" : ""), "Όλα");
  allBtn.type = "button";
  allBtn.addEventListener("click", () => {
    selectedTags = [];
    renderFavorites();
  });
  bar.appendChild(allBtn);

  TAGS.forEach((tag) => {
    const active = selectedTags.indexOf(tag.id) !== -1;
    const chip = h("button", "filter-chip" + (active ? " filter-chip-active" : ""));
    chip.type = "button";
    chip.setAttribute("aria-pressed", active ? "true" : "false");
    const icon = h("span", "filter-chip-icon", tag.icon);
    icon.setAttribute("aria-hidden", "true");
    chip.append(icon, h("span", null, tag.label));
    chip.addEventListener("click", () => {
      const i = selectedTags.indexOf(tag.id);
      if (i === -1) selectedTags.push(tag.id);
      else selectedTags.splice(i, 1);
      renderFavorites();
    });
    bar.appendChild(chip);
  });

  return bar;
}

function favoriteRow(fav) {
  const row = h("div", "favorite-row");

  const main = h("button", "favorite-main");
  main.type = "button";
  main.addEventListener("click", () => openFullscreen(fav.value, fav.label));

  const labelEl = h("span", "favorite-label", fav.label);
  const valueEl = h("span", "favorite-value", fav.value);
  main.append(labelEl, valueEl);

  const actions = h("div", "favorite-actions");

  const editBtn = h("button", "icon-btn", "✏️");
  editBtn.type = "button";
  editBtn.setAttribute("aria-label", "Επεξεργασία");
  editBtn.addEventListener("click", () => openFavoriteDialog(fav));

  const delBtn = h("button", "icon-btn icon-btn-danger", "🗑️");
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Διαγραφή");
  delBtn.addEventListener("click", () => askDelete("favorite", fav.id, fav.label, delBtn));

  actions.append(editBtn, delBtn);

  row.append(main, actions);
  return row;
}

// ─── Κάρτα φράσης ─────────────────────────────────────────────────

function phraseCard(card, isCustom, showFavorite) {
  const wrap = h("div", "phrase-card");
  wrap.appendChild(h("p", "phrase-text", card.text));

  const actions = h("div", "phrase-actions");

  const speakBtn = h("button", "speak-btn", "🔊");
  speakBtn.type = "button";
  speakBtn.setAttribute("aria-label", "Ανάγνωση φωνητικά");
  speakBtn.addEventListener("click", () => speak(card.text));
  actions.appendChild(speakBtn);

  const showBtn = h("button", "show-btn", "👁️");
  showBtn.type = "button";
  showBtn.setAttribute("aria-label", "Εμφάνιση σε μεγάλα γράμματα");
  showBtn.addEventListener("click", () => openFullscreen(card.text));
  actions.appendChild(showBtn);

  if (showFavorite) {
    const favBtn = h("button", "fav-btn", "⭐");
    favBtn.type = "button";
    favBtn.setAttribute("aria-label", "Αποθήκευση στα Αγαπημένα");
    favBtn.addEventListener("click", () => quickSaveFavorite(card.text, favBtn));
    actions.appendChild(favBtn);
  }

  if (isCustom) {
    const delBtn = h("button", "delete-btn", "🗑️");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Διαγραφή κάρτας");
    delBtn.addEventListener("click", () => askDelete("custom", card.id, card.text, delBtn));
    actions.appendChild(delBtn);
  }

  wrap.appendChild(actions);
  return wrap;
}

// ─── Full-screen display ──────────────────────────────────────────

function openFullscreen(text, label) {
  els.fullscreenLabel.textContent = label || "";
  els.fullscreenLabel.hidden = !label;
  els.fullscreenText.textContent = text;
  els.fullscreen.hidden = false;
  els.fullscreenClose.focus();
}

function closeFullscreen() {
  els.fullscreen.hidden = true;
}

// ─── Ανάγνωση φωνητικά ────────────────────────────────────────────

function speak(text) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    showToast("Η συσκευή δεν υποστηρίζει ανάγνωση κειμένου.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "el-GR";

  const voices = window.speechSynthesis.getVoices();
  const greek = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("el"));
  if (greek) {
    utterance.voice = greek;
  } else if (voices.length > 0) {
    showToast("Δεν βρέθηκε ελληνική φωνή στη συσκευή.");
  }

  utterance.onerror = (e) => {
    if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
      showToast("Η ανάγνωση δεν ήταν δυνατή.");
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ─── Διάλογος: Νέα προσωπική κάρτα ────────────────────────────────

function openCustomDialog() {
  els.addText.value = "";
  els.addError.hidden = true;
  openDialog(els.addDialog, els.fab);
  els.addText.focus();
}

function onAddCustomSubmit(event) {
  event.preventDefault();
  const result = saveCustomCard(els.addText.value);

  if (!result.ok) {
    const messages = {
      "empty": "Γράψε πρώτα μια φράση.",
      "too-long": "Η φράση είναι πολύ μεγάλη. Το μέγιστο είναι " + CUSTOM_CARD_MAX_LENGTH + " χαρακτήρες.",
      "storage": "Δεν ήταν δυνατή η αποθήκευση στη συσκευή."
    };
    els.addError.textContent = messages[result.reason] || messages.storage;
    els.addError.hidden = false;
    els.addText.focus();
    return;
  }

  closeDialog(els.addDialog);
  render(VIEWS.CUSTOM, false);
  showToast("Η κάρτα αποθηκεύτηκε.");
}

// ─── Διάλογος: Νέο / Επεξεργασία Αγαπημένου ──────────────────────

function openFavoriteDialog(favorite) {
  editingFavoriteId = favorite ? favorite.id : null;

  els.favDialogTitle.textContent = favorite ? "Επεξεργασία" : "Νέο Αγαπημένο";
  els.favLabel.value = favorite ? favorite.label : "";
  els.favValue.value = favorite ? favorite.value : "";
  els.favError.hidden = true;

  // Reset tag buttons
  const activeTags = favorite ? favorite.tags : [];
  els.favTags.querySelectorAll("button").forEach((btn) => {
    const tagId = btn.dataset.tagId;
    const active = activeTags.indexOf(tagId) !== -1;
    btn.classList.toggle("tag-btn-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  openDialog(els.favDialog, els.fab);
  els.favLabel.focus();
}

function onFavTagToggle(event) {
  const btn = event.currentTarget;
  const active = btn.classList.toggle("tag-btn-active");
  btn.setAttribute("aria-pressed", active ? "true" : "false");
}

function onFavSubmit(event) {
  event.preventDefault();

  const label = els.favLabel.value;
  const value = els.favValue.value;
  const tags = Array.from(els.favTags.querySelectorAll("button"))
    .filter((btn) => btn.classList.contains("tag-btn-active"))
    .map((btn) => btn.dataset.tagId);

  const result = editingFavoriteId
    ? updateFavorite(editingFavoriteId, label, value, tags)
    : saveFavorite(label, value, tags);

  if (!result.ok) {
    const messages = {
      "label-empty": "Δώσε έναν σύντομο τίτλο.",
      "value-empty": "Γράψε το περιεχόμενο.",
      "label-too-long": "Ο τίτλος είναι πολύ μεγάλος.",
      "value-too-long": "Το περιεχόμενο είναι πολύ μεγάλο.",
      "storage": "Δεν ήταν δυνατή η αποθήκευση."
    };
    els.favError.textContent = messages[result.reason] || messages.storage;
    els.favError.hidden = false;
    return;
  }

  closeDialog(els.favDialog);
  editingFavoriteId = null;
  render(VIEWS.FAVORITES, false);
  showToast(editingFavoriteId ? "Ενημερώθηκε." : "Αποθηκεύτηκε στα Αγαπημένα.");
}

// Γρήγορη αποθήκευση φράσης από κατηγορία: ανοίγει το dialog με
// προσυμπληρωμένο το value και ζητά μόνο label + tags.
function quickSaveFavorite(text, opener) {
  editingFavoriteId = null;
  els.favDialogTitle.textContent = "Αποθήκευση στα Αγαπημένα";
  els.favLabel.value = "";
  els.favValue.value = text;
  els.favError.hidden = true;
  els.favTags.querySelectorAll("button").forEach((btn) => {
    btn.classList.remove("tag-btn-active");
    btn.setAttribute("aria-pressed", "false");
  });
  openDialog(els.favDialog, opener);
  els.favLabel.focus();
}

// ─── Διάλογος: Επιβεβαίωση διαγραφής ─────────────────────────────

function askDelete(type, id, text, opener) {
  pendingDelete = { type: type, id: id, text: text };
  els.confirmText.textContent = text;
  openDialog(els.confirmDialog, opener);
}

function onConfirmDelete() {
  if (!pendingDelete) return;

  let ok;
  if (pendingDelete.type === "custom") {
    ok = deleteCustomCard(pendingDelete.id);
  } else {
    ok = deleteFavorite(pendingDelete.id);
  }

  const view = pendingDelete.type === "custom" ? VIEWS.CUSTOM : VIEWS.FAVORITES;
  pendingDelete = null;
  closeDialog(els.confirmDialog);
  dialogOpener = null;
  render(view, true);
  showToast(ok ? "Διαγράφηκε." : "Δεν ήταν δυνατή η διαγραφή.");
}

// ─── Εκκίνηση ─────────────────────────────────────────────────────

function init() {
  // Cache DOM
  els.content = document.getElementById("content");
  els.title = document.getElementById("screen-title");
  els.back = document.getElementById("back-btn");
  els.fab = document.getElementById("add-custom-btn");
  els.toast = document.getElementById("toast");

  els.addDialog = document.getElementById("add-dialog");
  els.addForm = document.getElementById("add-form");
  els.addText = document.getElementById("add-text");
  els.addError = document.getElementById("add-error");

  els.favDialog = document.getElementById("fav-dialog");
  els.favForm = document.getElementById("fav-form");
  els.favDialogTitle = document.getElementById("fav-dialog-title");
  els.favLabel = document.getElementById("fav-label");
  els.favValue = document.getElementById("fav-value");
  els.favTags = document.getElementById("fav-tags");
  els.favError = document.getElementById("fav-error");

  els.confirmDialog = document.getElementById("confirm-dialog");
  els.confirmText = document.getElementById("confirm-text");

  els.fullscreen = document.getElementById("fullscreen");
  els.fullscreenLabel = document.getElementById("fullscreen-label");
  els.fullscreenText = document.getElementById("fullscreen-text");
  els.fullscreenClose = document.getElementById("fullscreen-close");

  els.tabCards = document.getElementById("tab-cards");
  els.tabFavorites = document.getElementById("tab-favorites");

  // Χτίσιμο tag buttons στον διάλογο Αγαπημένου
  TAGS.forEach((tag) => {
    const btn = h("button", "tag-btn");
    btn.type = "button";
    btn.dataset.tagId = tag.id;
    btn.setAttribute("aria-pressed", "false");
    const icon = h("span", "tag-btn-icon", tag.icon);
    icon.setAttribute("aria-hidden", "true");
    btn.append(icon, h("span", null, tag.label));
    btn.addEventListener("click", onFavTagToggle);
    els.favTags.appendChild(btn);
  });

  // Events
  els.back.addEventListener("click", goBack);
  els.fab.addEventListener("click", () => {
    if (currentView === VIEWS.FAVORITES) openFavoriteDialog(null);
    else openCustomDialog();
  });

  els.addForm.addEventListener("submit", onAddCustomSubmit);
  document.getElementById("add-cancel")
    .addEventListener("click", () => closeDialog(els.addDialog));

  els.favForm.addEventListener("submit", onFavSubmit);
  document.getElementById("fav-cancel")
    .addEventListener("click", () => {
      editingFavoriteId = null;
      closeDialog(els.favDialog);
    });

  document.getElementById("confirm-cancel")
    .addEventListener("click", () => closeDialog(els.confirmDialog));
  document.getElementById("confirm-ok")
    .addEventListener("click", onConfirmDelete);

  els.fullscreenClose.addEventListener("click", closeFullscreen);

  els.tabCards.addEventListener("click", () => switchTab(TABS.CARDS));
  els.tabFavorites.addEventListener("click", () => switchTab(TABS.FAVORITES));

  els.addDialog.addEventListener("close", restoreFocusAfterDialog);
  els.favDialog.addEventListener("close", restoreFocusAfterDialog);
  els.confirmDialog.addEventListener("close", restoreFocusAfterDialog);

  window.addEventListener("popstate", (event) => {
    const view = event.state && event.state.view;
    render(isKnownView(view) ? view : VIEWS.HOME, true);
  });

  history.replaceState({ view: VIEWS.HOME }, "");
  render(VIEWS.HOME, false);
}

document.addEventListener("DOMContentLoaded", init);