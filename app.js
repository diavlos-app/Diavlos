// Δίαυλος — app.js
// Οθόνες: αρχική (κατηγορίες) → λίστα καρτών. Καμία εξωτερική εξάρτηση.
// Το DOM χτίζεται με createElement/textContent (όχι innerHTML), ώστε κανένα
// κείμενο χρήστη να μην ερμηνεύεται ποτέ ως HTML.

"use strict";

const HOME = "home";
const CUSTOM = "custom";

let currentView = HOME;
let pendingDeleteId = null;
let dialogOpener = null;
let toastTimer = null;
const els = {};

// ─── Βοηθητικά ────────────────────────────────────────────────────

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isKnownView(view) {
  return view === HOME || view === CUSTOM || CARD_CATEGORIES.some((c) => c.id === view);
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
// Χρησιμοποιούμε το history, ώστε το κουμπί «πίσω» του κινητού να γυρνά
// στην αρχική αντί να κλείνει την εφαρμογή.

function navigateTo(view) {
  if (view === currentView) return;
  history.pushState({ view: view }, "");
  render(view, true);
}

function goBack() {
  if (currentView === HOME) return;
  history.back();
}

function render(view, moveFocus) {
  currentView = view;
  els.back.hidden = view === HOME;
  els.fab.hidden = view !== CUSTOM;

  if (view === HOME) renderHome();
  else renderCardList(view);

  if (moveFocus) els.title.focus();
}

// ─── Αρχική: κατηγορίες ───────────────────────────────────────────

function renderHome() {
  els.title.textContent = "Κάρτες Συζήτησης";
  const grid = h("div", "category-grid");

  CARD_CATEGORIES.forEach((cat) => {
    grid.appendChild(categoryButton(cat.icon, cat.name, cat.id));
  });
  grid.appendChild(categoryButton("⭐", "Οι Κάρτες μου", CUSTOM));

  els.content.replaceChildren(grid);
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

// ─── Λίστα καρτών ─────────────────────────────────────────────────

function renderCardList(view) {
  const isCustom = view === CUSTOM;
  let cards;

  if (isCustom) {
    els.title.textContent = "Οι Κάρτες μου";
    cards = getCustomCards();
  } else {
    const cat = CARD_CATEGORIES.find((c) => c.id === view);
    els.title.textContent = cat.name;
    cards = cat.cards;
  }

  if (cards.length === 0) {
    els.content.replaceChildren(
      h("p", "empty-state", "Δεν έχεις προσθέσει ακόμα δικές σου κάρτες. Πάτα το + για να γράψεις την πρώτη.")
    );
    return;
  }

  const list = h("div", "card-list");
  cards.forEach((card) => list.appendChild(phraseCard(card, isCustom)));
  els.content.replaceChildren(list);
}

function phraseCard(card, isCustom) {
  const wrap = h("div", "phrase-card");
  wrap.appendChild(h("p", "phrase-text", card.text));

  const actions = h("div", "phrase-actions");

  const speakBtn = h("button", "speak-btn", "🔊 Ανάγνωση");
  speakBtn.type = "button";
  speakBtn.addEventListener("click", () => speak(card.text));
  actions.appendChild(speakBtn);

  if (isCustom) {
    const delBtn = h("button", "delete-btn", "🗑️");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Διαγραφή κάρτας");
    delBtn.addEventListener("click", () => askDelete(card, delBtn));
    actions.appendChild(delBtn);
  }

  wrap.appendChild(actions);
  return wrap;
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
    showToast("Δεν βρέθηκε ελληνική φωνή στη συσκευή. Η ανάγνωση μπορεί να ακούγεται λάθος.");
  }

  utterance.onerror = (e) => {
    if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
      showToast("Η ανάγνωση δεν ήταν δυνατή.");
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ─── Προσθήκη κάρτας ──────────────────────────────────────────────

function openAddDialog() {
  els.addText.value = "";
  els.addError.hidden = true;
  openDialog(els.addDialog, els.fab);
  els.addText.focus();
}

function onAddSubmit(event) {
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
  render(CUSTOM, false);
  showToast("Η κάρτα αποθηκεύτηκε.");
}

// ─── Διαγραφή κάρτας ──────────────────────────────────────────────

function askDelete(card, opener) {
  pendingDeleteId = card.id;
  els.confirmText.textContent = card.text;
  openDialog(els.confirmDialog, opener);
}

function onConfirmDelete() {
  const ok = deleteCustomCard(pendingDeleteId);
  pendingDeleteId = null;
  closeDialog(els.confirmDialog);
  dialogOpener = null; // το κουμπί που πατήθηκε δεν υπάρχει πια
  render(CUSTOM, true);
  showToast(ok ? "Η κάρτα διαγράφηκε." : "Δεν ήταν δυνατή η διαγραφή.");
}

// ─── Εκκίνηση ─────────────────────────────────────────────────────

function init() {
  els.content = document.getElementById("content");
  els.title = document.getElementById("screen-title");
  els.back = document.getElementById("back-btn");
  els.fab = document.getElementById("add-custom-btn");
  els.toast = document.getElementById("toast");
  els.addDialog = document.getElementById("add-dialog");
  els.addForm = document.getElementById("add-form");
  els.addText = document.getElementById("add-text");
  els.addError = document.getElementById("add-error");
  els.confirmDialog = document.getElementById("confirm-dialog");
  els.confirmText = document.getElementById("confirm-text");

  els.back.addEventListener("click", goBack);
  els.fab.addEventListener("click", openAddDialog);
  els.addForm.addEventListener("submit", onAddSubmit);
  document.getElementById("add-cancel").addEventListener("click", () => closeDialog(els.addDialog));
  document.getElementById("confirm-cancel").addEventListener("click", () => closeDialog(els.confirmDialog));
  document.getElementById("confirm-ok").addEventListener("click", onConfirmDelete);
  els.addDialog.addEventListener("close", restoreFocusAfterDialog);
  els.confirmDialog.addEventListener("close", restoreFocusAfterDialog);

  window.addEventListener("popstate", (event) => {
    const view = event.state && event.state.view;
    render(isKnownView(view) ? view : HOME, true);
  });

  // Μετά από ανανέωση σελίδας ξεκινάμε πάντα από την αρχική.
  history.replaceState({ view: HOME }, "");
  render(HOME, false);
}

document.addEventListener("DOMContentLoaded", init);
