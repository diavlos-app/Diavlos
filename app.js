// Δίαυλος — app.js
// Οθόνες: αρχική, κατηγορίες φράσεων, Έκτακτη Ανάγκη, Αγαπημένα, Ιστορικό,
// Χάρτης, Μεταγραφή, Δομημένη συνομιλία.
// Interactive response modal + PDF export + Leaflet + Whisper transcription.

"use strict";

// ─── Σταθερές ─────────────────────────────────────────────────────

const VIEWS = {
  HOME: "home",
  EMERGENCY_CALL: "emergency-call",
  EMERGENCY_FIELD: "emergency-field",
  PROTOCOL: "protocol",
  COMPOSER: "composer",
  COMPOSER_DETAIL: "composer-detail",
  CUSTOM: "custom",
  FAVORITES: "favorites",
  MAP: "map",
  TRANSCRIBE: "transcribe"
};

const TABS = {
  CARDS: "cards",
  FAVORITES: "favorites",
  MAP: "map",
  TRANSCRIBE: "transcribe"
};

const FAV_TABS = {
  FAVORITES: "favorites",
  PERSONAL: "personal",
  HISTORY: "history"
};

const EMERGENCY_SERVICES = [
  { id: "police",    label: "Αστυνομία",         iconId: "icon-police" },
  { id: "ambulance", label: "Ασθενοφόρο (ΕΚΑΒ)", iconId: "icon-ambulance" },
  { id: "fire",      label: "Πυροσβεστική",      iconId: "icon-fire" },
  { id: "general",   label: "Γενική βοήθεια",    iconId: "icon-eu" }
];

const EMERGENCY_SMS_NUMBER = "112";
const EMERGENCY_GEOLOCATION_TIMEOUT_MS = 4000;

const EMERGENCY_FIELD_PHRASES = [
  { id: "ef-1", text: "Είμαι κωφός/κωφή." },
  { id: "ef-2", text: "Χρειάζομαι βοήθεια." },
  { id: "ef-3", text: "Κάποιος τραυματίστηκε." },
  { id: "ef-4", text: "Δεν καταλαβαίνω. Μπορείτε να το γράψετε;", response: "text" },
  { id: "ef-5", text: "Περιμένετε, παρακαλώ." },
  { id: "ef-6", text: "Μπορείτε να μου το γράψετε;", response: "yesno" }
];

const PROTOCOL_DEFINITIONS = {
  kep: {
    id: "kep",
    title: "ΚΕΠ",
    icon: "icon-services"
  },
  pharmacy: {
    id: "pharmacy",
    title: "Φαρμακείο",
    icon: "icon-pharmacy"
  },
  doctor: {
    id: "doctor",
    title: "Γιατρός",
    icon: "icon-services"
  },
  police: {
    id: "police",
    title: "Αστυνομία",
    icon: "icon-police"
  }
};

const PROTOCOL_HISTORY_KEY = "diavlos_v1_protocol_history";
const TRANSCRIBE_CONSENT_KEY = "diavlos_v1_transcribe_consent";
const ONBOARDING_KEY = "diavlos_v1_onboarding_seen";

// ─── Κατάσταση ────────────────────────────────────────────────────

let currentView = VIEWS.HOME;
let currentTab = TABS.CARDS;
let currentFavTab = FAV_TABS.FAVORITES;
let currentHistoryFilter = "all";
let selectedTags = [];
let pendingDelete = null;
let editingFavoriteId = null;
let dialogOpener = null;
let toastTimer = null;

// Response modal state
let pendingResponseCard = null;
let pendingResponseCategory = null;
let currentResponseValue = null;
let currentResponseType = null;

// Protocol state
let currentProtocolId = null;
let currentProtocol = null;
let currentProtocolStepIndex = 0;
let currentProtocolAnswers = [];
let protocolSelectedAnswer = "";
let protocolAnswerLocked = false;

// Composer state (Φτιάξε το αίτημά σου)
let currentComposerCategoryId = null;
let currentComposerPurposeId = null;
let composerSelectedPrefix = "";
let composerPersonalChips = [];

// Protocol fullscreen mode
let fullscreenProtocolMode = false;

// Follow-up mode (μετά την εμφάνιση κάρτας από κατηγορία/Composer)
let fullscreenFollowup = false;
let fullscreenCategoryId = null;

// Map state
let mapInstance = null;
let userMarker = null;
let curatedLayerGroup = null;
let userLocation = null;

// Κοινόχρηστα toast/confirm
let deleteAllDataConfirmed = false;

const els = {};

// ─── DOM helpers ──────────────────────────────────────────────────

function h(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined && text !== null) {
    node.textContent = text;
  }

  return node;
}

function svgIcon(name, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className || "icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#" + name);
  use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + name);

  svg.appendChild(use);
  return svg;
}

function vibrate(pattern) {
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // ignore
  }
}

function vibrateShort() {
  vibrate(40);
}

function vibrateDouble() {
  vibrate([40, 60, 40]);
}

function clear(node) {
  if (!node) return;
  // Παλιότεροι browser (π.χ. Huawei Browser) δεν έχουν replaceChildren
  if (typeof node.replaceChildren === "function") node.replaceChildren();
  else while (node.firstChild) node.removeChild(node.firstChild);
}

function isKnownView(view) {
  if (
    view === VIEWS.HOME ||
    view === VIEWS.CUSTOM ||
    view === VIEWS.FAVORITES ||
    view === VIEWS.PROTOCOL ||
    view === VIEWS.COMPOSER ||
    view === VIEWS.COMPOSER_DETAIL
  ) {
    return true;
  }

  if (
    view === VIEWS.EMERGENCY_CALL ||
    view === VIEWS.EMERGENCY_FIELD
  ) {
    return true;
  }

  if (view === VIEWS.MAP || view === VIEWS.TRANSCRIBE) {
    return true;
  }

  return CARD_CATEGORIES.some((c) => c.id === view);
}

function showToast(message) {
  if (!els.toast) return;

  vibrateShort();
  els.toast.textContent = message;
  els.toast.hidden = false;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 5000);
}

// ─── Dialogs ──────────────────────────────────────────────────────

function openDialog(dialog, opener) {
  if (!dialog) return;

  dialogOpener = opener || document.activeElement;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function restoreFocusAfterDialog() {
  if (dialogOpener && document.contains(dialogOpener)) {
    dialogOpener.focus();
  }
  dialogOpener = null;
}

// ─── Πλοήγηση ─────────────────────────────────────────────────────

function navigateTo(view) {
  if (view === currentView) return;

  history.pushState({ view: view }, "");
  render(view, true);
}

function goBack() {
  if (currentView === VIEWS.HOME && currentTab === TABS.CARDS) {
    return;
  }
  history.back();
}

function switchTab(tab) {
  if (tab === currentTab) return;

  currentTab = tab;

  let view = VIEWS.HOME;

  if (tab === TABS.FAVORITES) {
    view = VIEWS.FAVORITES;
  } else if (tab === TABS.MAP) {
    view = VIEWS.MAP;
  } else if (tab === TABS.TRANSCRIBE) {
    view = VIEWS.TRANSCRIBE;
  }

  history.replaceState({ view: view }, "");
  render(view, true);
}

function updateTabBar() {
  const tabs = [
    [TABS.CARDS, els.tabCards],
    [TABS.FAVORITES, els.tabFavorites],
    [TABS.MAP, els.tabMap],
    [TABS.TRANSCRIBE, els.tabTranscribe]
  ];

  tabs.forEach(([id, el]) => {
    if (!el) return;

    const active = currentTab === id;
    el.classList.toggle("active", active);

    if (active) {
      el.setAttribute("aria-current", "page");
    } else {
      el.removeAttribute("aria-current");
    }
  });
}

function render(view, moveFocus) {
  currentView = view;

  if (
    view !== VIEWS.TRANSCRIBE &&
    typeof stopTranscription === "function"
  ) {
    stopTranscription();
  }

  const isTopLevel = (
    view === VIEWS.HOME ||
    view === VIEWS.FAVORITES ||
    view === VIEWS.MAP ||
    view === VIEWS.TRANSCRIBE
  );

  els.headerLogo.hidden = !isTopLevel;
  els.headerSubtitle.hidden = !isTopLevel;
  els.back.hidden = isTopLevel;

  const showFab = (
    view === VIEWS.CUSTOM ||
    (view === VIEWS.FAVORITES && currentFavTab === FAV_TABS.FAVORITES)
  );

  els.fab.hidden = !showFab;

  els.fab.setAttribute(
    "aria-label",
    view === VIEWS.FAVORITES ? "Νέο Αγαπημένο" : "Προσθήκη κάρτας"
  );

  if (view === VIEWS.FAVORITES) {
    currentTab = TABS.FAVORITES;
  } else if (view === VIEWS.MAP) {
    currentTab = TABS.MAP;
  } else if (view === VIEWS.TRANSCRIBE) {
    currentTab = TABS.TRANSCRIBE;
  } else if (
    view === VIEWS.HOME ||
    view === VIEWS.COMPOSER ||
    view === VIEWS.COMPOSER_DETAIL ||
    CARD_CATEGORIES.some((c) => c.id === view)
  ) {
    currentTab = TABS.CARDS;
  }

  updateTabBar();

  if (view === VIEWS.HOME) {
    renderHome();
  } else if (view === VIEWS.EMERGENCY_CALL) {
    renderEmergencyCall();
  } else if (view === VIEWS.EMERGENCY_FIELD) {
    renderEmergencyField();
  } else if (view === VIEWS.PROTOCOL) {
    renderProtocol(currentProtocolId);
  } else if (view === VIEWS.COMPOSER) {
    renderComposerCategory();
  } else if (view === VIEWS.COMPOSER_DETAIL) {
    renderComposerDetail();
  } else if (view === VIEWS.CUSTOM) {
    renderCustom();
  } else if (view === VIEWS.FAVORITES) {
    renderFavorites();
  } else if (view === VIEWS.MAP) {
    renderMap();
  } else if (view === VIEWS.TRANSCRIBE) {
    renderTranscribe();
  } else {
    renderPhraseList(view);
  }

  if (moveFocus) {
    els.title.focus();
  }
}
// ─── Αρχική ───────────────────────────────────────────────────────

function renderHome() {
  els.title.textContent = "Δίαυλος";

  const frag = document.createDocumentFragment();

  // 1. Onboarding banner (μόνο την πρώτη φορά)
  if (!hasSeenOnboarding()) {
    frag.appendChild(onboardingBanner());
  }

  // 2. SOS κάρτα
  frag.appendChild(emergencyCard());

  // 3. ΝΑΙ / ΟΧΙ γρήγορα
  frag.appendChild(communicationNowButton());

  // 4. Πλακίδια κατηγοριών
  const grid = h("div", "category-grid");

  CARD_CATEGORIES.forEach((cat) => {
    if (cat.id === "emergency") return;
    grid.appendChild(
      categoryButton(cat.iconId, cat.name, cat.id, cat.cards ? cat.cards.length : 0)
    );
  });

  frag.appendChild(grid);

  // 5. Δομημένη συνομιλία — πρωτόκολλα ως πλακίδια
  frag.appendChild(protocolGrid());

  // 6. Footer
  frag.appendChild(homeFooter());

  clear(els.content);
  els.content.appendChild(frag);
}

// ─── Onboarding ──────────────────────────────────────────────

function hasSeenOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch (e) {
    return true;  // Αν δεν δουλεύει το localStorage, μην εμφανίζεις το banner
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch (e) {
    // ignore
  }
}

function onboardingBanner() {
  const wrap = h("div", "onboarding-banner");

  wrap.appendChild(
    h("p", "onboarding-title", "Καλώς ήρθες στον Δίαυλο")
  );

  wrap.appendChild(
    h(
      "p",
      "onboarding-text",
      "Δείξε το κινητό σου σε όποιον μιλάς. Διάλεξε τι χρειάζεσαι και πάτα ΕΜΦΑΝΙΣΗ."
    )
  );

  wrap.appendChild(
    h(
      "p",
      "onboarding-text",
      "Ο συνομιλητής γράφει την απάντηση στην ίδια οθόνη. Εσύ τη διαβάζεις."
    )
  );

  const btn = h("button", "onboarding-btn", "Κατάλαβα");
  btn.type = "button";
  btn.addEventListener("click", () => {
    markOnboardingSeen();
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  });

  wrap.appendChild(btn);
  return wrap;
}

// ─── Δομημένη συνομιλία — grid ───────────────────────────────

function protocolGrid() {
  const section = h("section", "protocol-grid-section");

  section.appendChild(
    h("h2", "protocol-grid-title", "Δομημένη συνομιλία")
  );

  section.appendChild(
    h(
      "p",
      "protocol-grid-intro",
      "Για σύνθετες υποθέσεις. Η εφαρμογή σου κάνει ερωτήσεις βήμα-βήμα."
    )
  );

  const grid = h("div", "protocol-grid");

  const protocols = [
    { id: "kep",    label: "ΚΕΠ",       icon: "icon-services" },
    { id: "police", label: "Αστυνομία", icon: "icon-police" }
  ];

  protocols.forEach((p) => {
    const btn = h("button", "protocol-tile");
    btn.type = "button";
    btn.appendChild(svgIcon(p.icon, "protocol-tile-icon"));
    btn.appendChild(h("span", "protocol-tile-label", p.label));

    btn.addEventListener("click", () => {
      openProtocol(p.id);
    });

    grid.appendChild(btn);
  });

  section.appendChild(grid);
  return section;
}

// ─── Κουμπί «ΝΑΙ / ΟΧΙ γρήγορα» ────────────────────────────────────

function communicationNowButton() {
  const wrap = h("div", "communication-now-wrap");

  const button = h("button", "communication-now-btn");
  button.type = "button";
  button.append(
    svgIcon("icon-check", "communication-now-icon"),
    h("span", null, "ΝΑΙ / ΟΧΙ γρήγορα")
  );

  button.addEventListener("click", () => {
    navigateTo(VIEWS.EMERGENCY_FIELD);
  });

  wrap.appendChild(button);
  return wrap;
}

// ─── Footer ───────────────────────────────────────────────────────

function homeFooter() {
  const footer = h("footer", "home-footer");

  const links = h("div", "home-footer-links");

  const privacy = h("a", "home-footer-link", "Πολιτική Απορρήτου");
  privacy.href = "privacy.html";

  const separator = h("span", "home-footer-separator", "·");

  const contact = h(
    "a",
    "home-footer-link",
    "Επικοινωνία"
  );
  contact.href = "mailto:thetechshaman@gmail.com";

  links.append(privacy, separator, contact);

  const deleteButton = h(
    "button",
    "delete-all-data-btn",
    "Διαγραφή όλων των δεδομένων μου"
  );
  deleteButton.type = "button";
  deleteButton.addEventListener("click", askDeleteAllData);

  footer.append(links, deleteButton);
  return footer;
}

function askDeleteAllData() {
  deleteAllDataConfirmed = false;

  els.confirmTitle.textContent = "Διαγραφή όλων των δεδομένων;";

  els.confirmText.textContent =
    "Θα διαγραφούν οι προσωπικές σου φράσεις, τα αγαπημένα, το ιστορικό και οι ρυθμίσεις. Η ενέργεια δεν αναιρείται.";

  els.confirmOk.onclick = performDeleteAllData;

  openDialog(els.confirmDialog);
}

function performDeleteAllData() {
  if (deleteAllDataConfirmed) return;
  deleteAllDataConfirmed = true;

  let removed = 0;

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.indexOf("diavlos_v1_") === 0) {
        localStorage.removeItem(key);
        removed++;
      }
    });
  } catch (error) {
    // ignore
  }

  closeDialog(els.confirmDialog);
  showToast("Διαγράφηκαν όλα τα δεδομένα σου.");

  // Επαναφόρτωση δεδομένων από μνήμη
  selectedTags = [];
  currentFavTab = FAV_TABS.FAVORITES;
  currentHistoryFilter = "all";

  // Επαναφορά στην αρχική για καθαρή κατάσταση
  history.replaceState({ view: VIEWS.HOME }, "");
  render(VIEWS.HOME, false);
}

// ─── SOS κάρτα ────────────────────────────────────────────────────

function emergencyCard() {
  const wrap = h("div", "emergency-card");

  const header = h("div", "emergency-header");
  header.appendChild(h("span", "emergency-title", "SOS"));
  header.appendChild(h("span", "emergency-subtitle", "ΕΚΤΑΚΤΗ ΑΝΑΓΚΗ"));
  wrap.appendChild(header);

  const actions = h("div", "emergency-actions");

  const smsBtn = h("button", "btn-emergency-sms", "SMS 112");
  smsBtn.type = "button";
  smsBtn.addEventListener("click", () => {
    navigateTo(VIEWS.EMERGENCY_CALL);
  });

  // Μόνο SMS. Το ΝΑΙ / ΟΧΙ βγήκε σε ξεχωριστό κουμπί.
  actions.appendChild(smsBtn);
  wrap.appendChild(actions);

  return wrap;
}

// ─── Κατηγορίες ───────────────────────────────────────────────────

function categoryButton(iconId, name, view, count) {
  const btn = h("button", "category-card");
  btn.type = "button";

  btn.appendChild(svgIcon(iconId, "category-icon"));
  btn.appendChild(h("span", "category-name", name));

  if (count > 0) {
    const label = count === 1 ? "φράση" : "φράσεις";
    btn.appendChild(h("span", "category-count", count + " " + label));
  }

  btn.addEventListener("click", () => navigateTo(view));
  return btn;
}

// ─── Χάρτης ───────────────────────────────────────────────────────

function renderMap() {
  els.title.textContent = "Χάρτης";

  if (typeof L === "undefined") {
    clear(els.content);
    els.content.appendChild(
      h(
        "p",
        "empty-state",
        "Ο χάρτης χρειάζεται σύνδεση στο internet την πρώτη φορά που ανοίγει. Δοκίμασε ξανά όταν συνδεθείς."
      )
    );
    return;
  }

  const intro = h(
    "p",
    "map-intro",
    "Deaf-friendly σημεία που έχουν επιβεβαιωθεί. Πάτα σε ένα σημείο για λεπτομέρειες."
  );

  const mapContainer = h("div", "map-container");
  mapContainer.id = "map";

  clear(els.content);
  els.content.append(intro, mapContainer, renderRemoteServices());

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    userMarker = null;
    curatedLayerGroup = null;
  }

  mapInstance = L.map("map", {
    zoomControl: false,
    attributionControl: true
  }).setView([37.9838, 23.7275], 13);

  L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(mapInstance);

  curatedLayerGroup = L.layerGroup().addTo(mapInstance);
  renderCuratedMarkers();

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation = { lat: latitude, lng: longitude };

        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 14);
        }

        userMarker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: "#2d6a4f",
          color: "#ffffff",
          weight: 3,
          fillOpacity: 1
        }).addTo(mapInstance);

        userMarker.bindPopup("Είσαι εδώ").openPopup();
      },
      () => {
        showToast("Δεν δόθηκε άδεια τοποθεσίας. Δείχνουμε την Αθήνα.");
        userLocation = { lat: 37.9838, lng: 23.7275 };
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }
}

// ─── Υπηρεσίες από απόσταση ───────────────────────────────────────

function renderRemoteServices() {
  const section = h("section", "remote-section");

  section.appendChild(h("h2", "remote-title", "Υπηρεσίες από απόσταση"));

  section.appendChild(
    h(
      "p",
      "remote-intro",
      "Δεν χρειάζεται να πας κάπου: μιλάς στη νοηματική από το κινητό σου. Έλεγξε ωράρια και διαθεσιμότητα στο site κάθε υπηρεσίας."
    )
  );

  const list =
    typeof REMOTE_SERVICES !== "undefined" ? REMOTE_SERVICES : [];

  list.forEach((svc) => {
    const card = h("article", "remote-card");
    card.appendChild(h("h3", "remote-card-title", svc.name));
    card.appendChild(h("p", "remote-card-text", svc.what));

    if (svc.how) {
      card.appendChild(h("p", "remote-card-how", svc.how));
    }

    if (svc.hours) {
      card.appendChild(h("p", "remote-card-hours", svc.hours));
    }

    if (svc.url) {
      const link = h("a", "remote-link", "Άνοιγμα");
      link.href = svc.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.appendChild(link);
    }

    section.appendChild(card);
  });

  return section;
}

// ─── Χρώματα & ετικέτες κατηγοριών ────────────────────────────────

function getCategoryColor(category) {
  const colors = {
    museum:    "#8e24aa",
    bank:      "#1976d2",
    public:    "#2d6a4f",
    health:    "#d32f2f",
    food:      "#f57c00",
    retail:    "#6d4c41",
    transport: "#0288d1",
    education: "#00796b",
    hotel:     "#f9a825"
  };

  return colors[category] || "#2d6a4f";
}

function getCategoryLabel(category) {
  const labels = {
    museum:    "Πολιτισμός",
    bank:      "Τράπεζα",
    public:    "Δημόσια Υπηρεσία",
    health:    "Υγεία",
    food:      "Εστίαση",
    retail:    "Κατάστημα",
    transport: "Μεταφορά",
    education: "Εκπαίδευση",
    hotel:     "Ξενοδοχείο"
  };

  return labels[category] || "Άλλο";
}

function getAvailabilityLabel(availability) {
  const labels = {
    permanent:    "Μόνιμη υποδομή",
    "on-request": "Κατόπιν ραντεβού",
    "on-events":  "Περιστασιακά"
  };

  return labels[availability] || "";
}

function getReliabilityLabel(reliability) {
  const labels = {
    high:   "Υψηλή αξιοπιστία",
    medium: "Μέτρια αξιοπιστία",
    low:    "Χαμηλή αξιοπιστία"
  };

  return labels[reliability] || "";
}

// ─── Συνδυασμός όλων των σημείων ──────────────────────────────────

function getAllLocations() {
  const base =
    typeof MAP_LOCATIONS !== "undefined" ? MAP_LOCATIONS : [];

  const extra =
    typeof EXTRA_LOCATIONS !== "undefined" ? EXTRA_LOCATIONS : [];

  const fixes =
    typeof COORD_OVERRIDES !== "undefined" ? COORD_OVERRIDES : {};

  return base
    .concat(extra)
    .map((loc) => {
      const fix = fixes[loc.id];

      if (!fix) return loc;

      return Object.assign({}, loc, {
        coords: { lat: fix[0], lng: fix[1] }
      });
    });
}

// ─── Curated markers ──────────────────────────────────────────────

function renderCuratedMarkers() {
  if (!curatedLayerGroup) return;

  curatedLayerGroup.clearLayers();

  getAllLocations().forEach((loc) => {
    if (!loc.coords || !loc.coords.lat || !loc.coords.lng) return;

    const color = getCategoryColor(loc.category);

    const marker = L.circleMarker(
      [loc.coords.lat, loc.coords.lng],
      {
        radius: 8,
        fillColor: color,
        color: "#ffffff",
        weight: 2.5,
        fillOpacity: 1
      }
    );

    marker.bindPopup(buildLocationPopup(loc), {
      maxWidth: 300,
      minWidth: 240,
      closeButton: true,
      autoPan: true
    });

    curatedLayerGroup.addLayer(marker);
  });
}

function buildLocationPopup(loc) {
  const wrap = h("div", "map-popup");

  const header = h("div", "map-popup-header");
  header.appendChild(h("h3", "map-popup-title", loc.name));

  const meta = h("p", "map-popup-meta");
  meta.textContent = loc.city + " · " + getCategoryLabel(loc.category);
  header.appendChild(meta);
  wrap.appendChild(header);

  if (loc.address) {
    wrap.appendChild(h("p", "map-popup-address", loc.address));
  }

  if (loc.note) {
    wrap.appendChild(h("p", "map-popup-note", loc.note));
  }

  const featuresList = h("ul", "map-popup-features");

  const featureLabels = {
    signLanguage:      "ΕΝΓ επί τόπου",
    signLanguageVideo: "Βίντεο στην ΕΝΓ",
    tabletDevices:     "Tablets με ΕΝΓ",
    iris:              "Τηλεδιερμηνεία IRIS",
    hearingLoop:       "Hearing Loop",
    liveCaptions:      "Live captions",
    writtenComm:       "Γραπτή επικοινωνία",
    lipReading:        "Χειλεανάγνωση",
    deafStaff:         "Κωφοί εργαζόμενοι"
  };

  Object.keys(loc.features || {}).forEach((key) => {
    if (loc.features[key] && featureLabels[key]) {
      featuresList.appendChild(h("li", null, featureLabels[key]));
    }
  });

  if (featuresList.children.length > 0) {
    wrap.appendChild(featuresList);
  }

  const footer = h("div", "map-popup-footer");

  const avail = getAvailabilityLabel(loc.availability);
  const rel = getReliabilityLabel(loc.reliability);

  if (avail) footer.appendChild(h("span", "map-popup-badge", avail));
  if (rel) footer.appendChild(h("span", "map-popup-reliability", rel));

  wrap.appendChild(footer);

  return wrap;
}
// ─── Emergency SMS ────────────────────────────────────────────────

function renderEmergencyCall() {
  els.title.textContent = "SMS Έκτακτης Ανάγκης";

  const note = h(
    "p",
    "emergency-note",
    "Ποτέ κλήση. Διάλεξε τι χρειάζεσαι· θα ανοίξει έτοιμο SMS προς το 112, με την τοποθεσία σου αν το επιτρέψεις."
  );

  const list = h("div", "emergency-numbers");

  EMERGENCY_SERVICES.forEach((item) => {
    const btn = h("button", "emergency-number-btn");
    btn.type = "button";

    btn.append(
      svgIcon(item.iconId, "emergency-number-icon"),
      h("span", "emergency-number-label", item.label)
    );

    btn.addEventListener("click", () => {
      composeEmergencySms(item.label);
    });

    list.appendChild(btn);
  });

  clear(els.content);
  els.content.append(note, list);
}

function buildEmergencySmsBody(serviceLabel, locationLine) {
  let body = "Είμαι κωφός/κωφή. Χρειάζομαι: " + serviceLabel + ".";

  if (locationLine) {
    body += " " + locationLine;
  }

  return body;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

function openEmergencySms(body) {
  const sep = isIOSDevice() ? "&" : "?";

  window.location.href =
    "sms:" +
    EMERGENCY_SMS_NUMBER +
    sep +
    "body=" +
    encodeURIComponent(body);
}

function composeEmergencySms(serviceLabel) {
  showSmsPreview(serviceLabel);
}

function showSmsPreview(serviceLabel) {
  const dialog = h("dialog", "sms-preview-dialog");
  dialog.setAttribute("aria-labelledby", "sms-preview-title");

  const heading = h("h2", null, "Θα σταλεί:");
  heading.id = "sms-preview-title";
  dialog.appendChild(heading);

  const preview = h("pre", "sms-preview-text");
  preview.textContent = "Προς: 112\n\nΕίμαι κωφός/κωφή. Χρειάζομαι: " + serviceLabel + ".\n\n[Θα προστεθεί η τοποθεσία σου, αν το επιτρέψεις]";
  dialog.appendChild(preview);

  const actions = h("div", "dialog-actions");

  const sendBtn = h("button", "btn-danger", "Άνοιγμα SMS");
  sendBtn.type = "button";
  sendBtn.addEventListener("click", () => {
    closeDialog(dialog);
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    sendEmergencySms(serviceLabel);
  });
  actions.appendChild(sendBtn);

  const cancelBtn = h("button", "btn-secondary", "Άκυρο");
  cancelBtn.type = "button";
  cancelBtn.addEventListener("click", () => {
    closeDialog(dialog);
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
  });
  actions.appendChild(cancelBtn);

  dialog.appendChild(actions);

  document.body.appendChild(dialog);
  openDialog(dialog);
  sendBtn.focus();
}

function sendEmergencySms(serviceLabel) {
  if (!("geolocation" in navigator)) {
    openEmergencySms(buildEmergencySmsBody(serviceLabel, ""));
    return;
  }

  let settled = false;

  const finish = (locationLine) => {
    if (settled) return;
    settled = true;
    openEmergencySms(buildEmergencySmsBody(serviceLabel, locationLine));
  };

  setTimeout(() => finish(""), EMERGENCY_GEOLOCATION_TIMEOUT_MS);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      finish("Τοποθεσία: https://maps.google.com/?q=" + lat + "," + lng);
    },
    () => finish(""),
    {
      timeout: EMERGENCY_GEOLOCATION_TIMEOUT_MS,
      maximumAge: 60000
    }
  );
}

// ─── Emergency field (Επικοινωνία στο σημείο) ─────────────────────

function renderEmergencyField() {
  els.title.textContent = "Επικοινωνία στο σημείο";

  const note = h(
    "p",
    "emergency-note",
    "Δείξτε την οθόνη στον αστυνομικό, διασώστη ή όποιον σας βοηθά."
  );

  const header = h("div", "field-header");
  header.appendChild(h("p", "field-statement", "Είμαι κωφός/κωφή."));
  header.appendChild(h("p", "field-statement", "Επικοινωνούμε γραπτώς."));

  const yesNo = h("div", "yesno-grid");

  const yesBtn = h("button", "yesno-btn yesno-yes");
  yesBtn.type = "button";
  yesBtn.setAttribute("aria-label", "Ναι");
  yesBtn.append(
    svgIcon("icon-check", "yesno-icon"),
    h("span", "yesno-label", "ΝΑΙ")
  );
  yesBtn.addEventListener("click", () => openFullscreen("ΝΑΙ"));

  const noBtn = h("button", "yesno-btn yesno-no");
  noBtn.type = "button";
  noBtn.setAttribute("aria-label", "Όχι");
  noBtn.append(
    svgIcon("icon-close", "yesno-icon"),
    h("span", "yesno-label", "ΟΧΙ")
  );
  noBtn.addEventListener("click", () => openFullscreen("ΟΧΙ"));

  yesNo.append(yesBtn, noBtn);

  const phraseTitle = h("h2", "field-phrases-title", "Γρήγορες φράσεις");
  const phraseList = h("div", "card-list");

  EMERGENCY_FIELD_PHRASES.forEach((card) => {
    phraseList.appendChild(phraseCard(card, false, false, null));
  });

  clear(els.content);
  els.content.append(note, header, yesNo, phraseTitle, phraseList);
}

// ─── Λίστα φράσεων ────────────────────────────────────────────────

function renderPhraseList(view) {
  const cat = CARD_CATEGORIES.find((c) => c.id === view);
  if (!cat) return;

  els.title.textContent = cat.name;

  const frag = document.createDocumentFragment();

  if (Array.isArray(cat.purposes) && cat.purposes.length > 0) {
    frag.appendChild(composerEntryButton(cat.id));
  }

  if (Array.isArray(cat.protocols) && cat.protocols.length > 0) {
    cat.protocols.forEach((protocolId) => {
      const btn = protocolEntryButton(protocolId);
      if (btn) frag.appendChild(btn);
    });
  }

  const list = h("div", "card-list");

  (cat.cards || []).forEach((card) => {
    list.appendChild(phraseCard(card, false, true, cat));
  });

  frag.appendChild(list);

  clear(els.content);
  els.content.appendChild(frag);
}

function composerEntryButton(categoryId) {
  const wrap = h("div", "composer-entry-wrap");

  const btn = h("button", "composer-entry-btn");
  btn.type = "button";
  btn.append(
    svgIcon("icon-edit", "composer-entry-icon"),
    h("span", null, "Φτιάξε το αίτημά σου")
  );

  btn.addEventListener("click", () => {
    openComposer(categoryId);
  });

  wrap.appendChild(btn);
  return wrap;
}

function protocolEntryButton(protocolId) {
  const def = PROTOCOL_DEFINITIONS[protocolId];
  if (!def) return null;

  const wrap = h("div", "protocol-entry-wrap");

  const btn = h("button", "protocol-entry-btn");
  btn.type = "button";
  btn.append(
    svgIcon(def.icon || "icon-services", "protocol-entry-icon"),
    h("span", null, "Δομημένη συνομιλία: " + def.title)
  );

  btn.addEventListener("click", () => {
    openProtocol(protocolId);
  });

  wrap.appendChild(btn);
  return wrap;
}

// ─── «Οι Κάρτες μου» ──────────────────────────────────────────────

function renderCustom() {
  els.title.textContent = "Οι Κάρτες μου";

  const cards = getCustomCards();

  if (cards.length === 0) {
    clear(els.content);
    els.content.appendChild(
      h(
        "p",
        "empty-state",
        "Δεν έχεις προσθέσει ακόμα δικές σου κάρτες. Πάτα το + για να γράψεις την πρώτη."
      )
    );
    return;
  }

  const list = h("div", "card-list");

  cards.forEach((card) => {
    list.appendChild(phraseCard(card, true, true, null));
  });

  clear(els.content);
  els.content.appendChild(list);
}

// ─── Αγαπημένα / Ιστορικό ────────────────────────────────────────

function renderFavorites() {
  if (currentFavTab === FAV_TABS.HISTORY) {
    els.title.textContent = "Ιστορικό";
  } else if (currentFavTab === FAV_TABS.PERSONAL) {
    els.title.textContent = "Τα στοιχεία μου";
  } else {
    els.title.textContent = "Αγαπημένα";
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(favoritesSegmented());

  if (currentFavTab === FAV_TABS.FAVORITES) {
    renderFavoritesList(frag);
  } else if (currentFavTab === FAV_TABS.PERSONAL) {
    renderPersonalList(frag);
  } else {
    renderHistoryList(frag);
  }

  clear(els.content);
  els.content.appendChild(frag);
}

function favoritesSegmented() {
  const seg = h("div", "segmented");
  seg.setAttribute("role", "tablist");

  const favBtn = h("button");
  favBtn.type = "button";
  favBtn.append(svgIcon("icon-favorites", null), h("span", null, "Αγαπημένα"));
  favBtn.classList.toggle("active", currentFavTab === FAV_TABS.FAVORITES);
  favBtn.setAttribute("role", "tab");
  favBtn.setAttribute(
    "aria-selected",
    currentFavTab === FAV_TABS.FAVORITES ? "true" : "false"
  );
  favBtn.addEventListener("click", () => {
    if (currentFavTab === FAV_TABS.FAVORITES) return;
    currentFavTab = FAV_TABS.FAVORITES;
    renderFavorites();
  });

  const persBtn = h("button");
  persBtn.type = "button";
  persBtn.append(svgIcon("icon-tag-personal", null), h("span", null, "Στοιχεία"));
  persBtn.classList.toggle("active", currentFavTab === FAV_TABS.PERSONAL);
  persBtn.setAttribute("role", "tab");
  persBtn.setAttribute(
    "aria-selected",
    currentFavTab === FAV_TABS.PERSONAL ? "true" : "false"
  );
  persBtn.addEventListener("click", () => {
    if (currentFavTab === FAV_TABS.PERSONAL) return;
    currentFavTab = FAV_TABS.PERSONAL;
    renderFavorites();
  });

  const histBtn = h("button");
  histBtn.type = "button";
  histBtn.append(svgIcon("icon-history", null), h("span", null, "Ιστορικό"));
  histBtn.classList.toggle("active", currentFavTab === FAV_TABS.HISTORY);
  histBtn.setAttribute("role", "tab");
  histBtn.setAttribute(
    "aria-selected",
    currentFavTab === FAV_TABS.HISTORY ? "true" : "false"
  );
  histBtn.addEventListener("click", () => {
    if (currentFavTab === FAV_TABS.HISTORY) return;
    currentFavTab = FAV_TABS.HISTORY;
    renderFavorites();
  });

  seg.append(favBtn, persBtn, histBtn);
  return seg;
}

// ─── Αγαπημένα λίστα ──────────────────────────────────────────────

function renderFavoritesList(frag) {
  const favorites = sortFavoritesAlphabetically(getFavorites());

  frag.appendChild(favoritesFilterBar());

  if (favorites.length === 0) {
    frag.appendChild(
      h(
        "p",
        "empty-state",
        "Δεν έχεις ακόμα αγαπημένα. Πάτα το + για να προσθέσεις στοιχεία όπως ΑΦΜ, διεύθυνση ή τον καφέ σου."
      )
    );
    return;
  }

  const filtered = filterFavoritesByTags(favorites, selectedTags);

  if (filtered.length === 0) {
    frag.appendChild(
      h("p", "empty-state", "Κανένα αποτέλεσμα με τα επιλεγμένα φίλτρα.")
    );
    return;
  }

  const list = h("div", "favorites-list");

  filtered.forEach((fav) => {
    list.appendChild(favoriteRow(fav));
  });

  frag.appendChild(list);
}

function renderPersonalList(frag) {
  // Σημείωση απορρήτου
  const note = h(
    "p",
    "personal-note",
    "Τα στοιχεία σου αποθηκεύονται ΜΟΝΟ σε αυτή τη συσκευή. Δεν αποστέλλονται πουθενά."
  );
  frag.appendChild(note);

  const section = h("div", "personal-section");

  PERSONAL_GROUPS.forEach((group) => {
    const fields = getPersonalFieldsByGroup(group.id);

    if (fields.length === 0) return;

    const groupEl = h("div", "personal-group");
    groupEl.appendChild(h("h2", "personal-group-title", group.label));

    fields.forEach((field) => {
      const fieldEl = h("div", "personal-field");

      const labelEl = h("label", "personal-field-label", field.label);
      labelEl.setAttribute("for", "personal-" + field.id);
      fieldEl.appendChild(labelEl);

      const input = h("input", "personal-field-input");
      input.type = "text";
      input.id = "personal-" + field.id;
      input.value = getPersonalField(field.id);
      input.autocomplete = "off";
      input.maxLength = 200;

      input.addEventListener("blur", () => {
        const result = savePersonalField(field.id, input.value);
        if (result && result.ok) {
          // Σύντομη επιβεβαίωση
          let saved = fieldEl.querySelector(".personal-saved");
          if (!saved) {
            saved = h("span", "personal-saved", "✓ Αποθηκεύτηκε");
            fieldEl.appendChild(saved);
          }
          saved.hidden = false;
          setTimeout(() => {
            if (saved && saved.parentNode) saved.hidden = true;
          }, 2000);
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });

      fieldEl.appendChild(input);
      groupEl.appendChild(fieldEl);
    });

    section.appendChild(groupEl);
  });

  frag.appendChild(section);
}

function favoritesFilterBar() {
  const bar = h("div", "filter-bar");

  const allBtn = h(
    "button",
    "filter-chip" + (selectedTags.length === 0 ? " filter-chip-active" : ""),
    "Όλα"
  );
  allBtn.type = "button";
  allBtn.setAttribute(
    "aria-pressed",
    selectedTags.length === 0 ? "true" : "false"
  );
  allBtn.addEventListener("click", () => {
    selectedTags = [];
    renderFavorites();
  });
  bar.appendChild(allBtn);

  TAGS.forEach((tag) => {
    const active = selectedTags.indexOf(tag.id) !== -1;

    const chip = h(
      "button",
      "filter-chip" + (active ? " filter-chip-active" : "")
    );
    chip.type = "button";
    chip.setAttribute("aria-pressed", active ? "true" : "false");
    chip.append(
      svgIcon(tag.iconId, "filter-chip-icon"),
      h("span", null, tag.label)
    );

    chip.addEventListener("click", () => {
      const i = selectedTags.indexOf(tag.id);

      if (i === -1) {
        selectedTags.push(tag.id);
      } else {
        selectedTags.splice(i, 1);
      }

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
  main.addEventListener("click", () => {
    openFullscreen(fav.value, fav.label);
  });

  main.append(
    h("span", "favorite-label", fav.label),
    h("span", "favorite-value", fav.value)
  );

  const actions = h("div", "favorite-actions");

  const editBtn = h("button", "icon-btn", "");
  editBtn.type = "button";
  editBtn.setAttribute("aria-label", "Επεξεργασία");
  editBtn.appendChild(svgIcon("icon-edit", "icon-btn-icon"));
  editBtn.addEventListener("click", () => openFavoriteDialog(fav));

  const delBtn = h("button", "icon-btn icon-btn-danger", "");
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Διαγραφή");
  delBtn.appendChild(svgIcon("icon-trash", "icon-btn-icon"));
  delBtn.addEventListener("click", () => {
    askDelete("favorite", fav.id, fav.label, delBtn);
  });

  actions.append(editBtn, delBtn);
  row.append(main, actions);

  return row;
}

// ─── Ιστορικό λίστα ───────────────────────────────────────────────

function renderHistoryList(frag) {
  const combined = getResponses()
    .concat(getProtocolHistory())
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const filtered = filterResponsesByDate(combined, currentHistoryFilter);

  frag.appendChild(historyToolbar(filtered.length));

  if (combined.length === 0) {
    frag.appendChild(
      h(
        "p",
        "empty-state",
        "Δεν έχεις ακόμα αποθηκευμένες απαντήσεις. Όταν χρησιμοποιήσεις μια κάρτα με «Απάντηση» ή μια δομημένη συνομιλία, θα εμφανιστούν εδώ."
      )
    );
    return;
  }

  if (filtered.length === 0) {
    frag.appendChild(
      h("p", "empty-state", "Καμία εγγραφή σε αυτό το διάστημα.")
    );
    return;
  }

  const list = h("div", "history-list");

  filtered.forEach((resp) => {
    if (resp.responseType === "protocol") {
      list.appendChild(protocolHistoryRow(resp));
    } else {
      list.appendChild(historyRow(resp));
    }
  });

  frag.appendChild(list);
}

function historyToolbar(visibleCount) {
  const bar = h("div", "history-toolbar");

  const filters = h("div", "history-date-filters");

  const chips = [
    { id: "all", label: "Όλες" },
    { id: "7d", label: "7 ημέρες" },
    { id: "30d", label: "30 ημέρες" }
  ];

  chips.forEach((c) => {
    const chip = h(
      "button",
      "history-date-chip" + (currentHistoryFilter === c.id ? " active" : ""),
      c.label
    );
    chip.type = "button";

    chip.addEventListener("click", () => {
      if (currentHistoryFilter === c.id) return;
      currentHistoryFilter = c.id;
      renderFavorites();
    });

    filters.appendChild(chip);
  });

  const exportBtn = h("button", "history-export-btn");
  exportBtn.type = "button";
  exportBtn.setAttribute("aria-label", "Εξαγωγή σε PDF");
  exportBtn.append(
    svgIcon("icon-download", null),
    h("span", null, "PDF")
  );
  exportBtn.disabled = visibleCount === 0;

  if (visibleCount === 0) {
    exportBtn.style.opacity = "0.4";
  }

  exportBtn.addEventListener("click", () => exportHistoryToPdf());

  bar.append(filters, exportBtn);
  return bar;
}

function historyRow(resp) {
  const row = h("div", "history-row");

  const main = h("button", "history-main");
  main.type = "button";
  main.addEventListener("click", () => {
    openResponseFullscreen(
      resp.phrase,
      resp.response,
      resp.responseType,
      resp.unit,
      true
    );
  });

  const meta = h("div", "history-meta");

  if (resp.categoryName) {
    meta.appendChild(h("span", "history-category", resp.categoryName));
  }

  meta.appendChild(
    h("span", "history-time", formatDateTimeShort(resp.timestamp))
  );
  main.appendChild(meta);

  main.appendChild(h("span", "history-phrase", resp.phrase));
  main.appendChild(
    h("span", "history-response", formatResponseForDisplay(resp))
  );

  const actions = h("div", "favorite-actions");

  const delBtn = h("button", "icon-btn icon-btn-danger", "");
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Διαγραφή απάντησης");
  delBtn.appendChild(svgIcon("icon-trash", "icon-btn-icon"));
  delBtn.addEventListener("click", () => {
    askDelete("response", resp.id, resp.phrase, delBtn);
  });

  actions.appendChild(delBtn);
  row.append(main, actions);

  return row;
}

function protocolHistoryRow(resp) {
  const row = h("div", "history-row protocol-history-row");

  const main = h("button", "history-main");
  main.type = "button";
  main.addEventListener("click", () => {
    openProtocolHistoryFullscreen(resp);
  });

  const meta = h("div", "history-meta");
  meta.appendChild(
    h(
      "span",
      "history-category",
      "Δομημένη συνομιλία · " + (resp.protocolTitle || "Πρωτόκολλο")
    )
  );
  meta.appendChild(
    h("span", "history-time", formatDateTimeShort(resp.timestamp))
  );
  main.appendChild(meta);

  main.appendChild(
    h("span", "history-phrase", resp.protocolTitle || resp.phrase)
  );

  const steps = resp.steps || [];
  const summary =
    steps.length +
    " " +
    (steps.length === 1 ? "βήμα" : "βήματα") +
    " απαντήθηκαν";

  main.appendChild(h("span", "history-response", summary));

  const actions = h("div", "favorite-actions");

  const delBtn = h("button", "icon-btn icon-btn-danger", "");
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Διαγραφή συνομιλίας");
  delBtn.appendChild(svgIcon("icon-trash", "icon-btn-icon"));
  delBtn.addEventListener("click", () => {
    askDelete("protocol", resp.id, resp.protocolTitle || resp.phrase, delBtn);
  });

  actions.appendChild(delBtn);
  row.append(main, actions);

  return row;
}

// ─── Δομημένη συνομιλία — fullscreen ιστορικό ──────────────────────

function openProtocolHistoryFullscreen(resp) {
  // ΔΕΝ αγγίζουμε το responseFullscreen. Φτιάχνουμε ξεχωριστό dialog.
  const dialog = h("dialog", "protocol-history-dialog");
  dialog.setAttribute("aria-labelledby", "protocol-history-title");

  const heading = h(
    "h2",
    "protocol-history-title",
    resp.protocolTitle || "Δομημένη συνομιλία"
  );

  const meta = h(
    "p",
    "protocol-history-meta",
    formatDateTimeLong(resp.timestamp)
  );

  const list = h("ul", "protocol-history-list");

  (resp.steps || []).forEach((item) => {
    const li = h("li", "protocol-history-item");
    li.appendChild(h("p", "protocol-history-q", item.question));
    li.appendChild(h("p", "protocol-history-a", item.answer));
    list.appendChild(li);
  });

  const actions = h("div", "dialog-actions");

  const closeBtn = h("button", "btn-primary", "Κλείσιμο");
  closeBtn.type = "button";
  closeBtn.addEventListener("click", () => {
    closeDialog(dialog);
    if (dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  });

  actions.appendChild(closeBtn);

  dialog.append(heading, meta, list, actions);

  document.body.appendChild(dialog);
  openDialog(dialog);
}
// ─── Κάρτα φράσης ─────────────────────────────────────────────────

function phraseCard(card, isCustom, showFavorite, category) {
  const wrap = h("div", "phrase-card");
  wrap.appendChild(h("p", "phrase-text", card.text));

  const actions = h("div", "phrase-actions");

  // 1. Εμφάνιση — ΠΡΩΤΗ, μεγαλύτερη, κύρια λειτουργία
  const showBtn = h("button", "show-btn");
  showBtn.type = "button";
  showBtn.append(
    svgIcon("icon-show", "btn-icon"),
    h("span", "btn-label", "Εμφάνιση")
  );
  showBtn.setAttribute("aria-label", "Εμφάνιση σε μεγάλα γράμματα");
  showBtn.addEventListener("click", () => {
    openFullscreenWithFollowup(
      card.text,
      null,
      category ? category.id : null
    );
  });
  actions.appendChild(showBtn);

  // 2. Ανάγνωση
  const speakBtn = h("button", "speak-btn");
  speakBtn.type = "button";
  speakBtn.append(
    svgIcon("icon-speak", "btn-icon"),
    h("span", "btn-label", "Ανάγνωση")
  );
  speakBtn.setAttribute("aria-label", "Ανάγνωση φωνητικά");
  speakBtn.addEventListener("click", () => speak(card.text));
  actions.appendChild(speakBtn);

  // 3. Απάντηση (αν υπάρχει)
  if (card.response) {
    const replyBtn = h("button", "reply-btn");
    replyBtn.type = "button";
    replyBtn.append(
      svgIcon("icon-reply", "btn-icon"),
      h("span", "btn-label", "Απάντηση")
    );
    replyBtn.setAttribute(
      "aria-label",
      "Άνοιξε για απάντηση από τον συνομιλητή"
    );
    replyBtn.addEventListener("click", () => {
      openResponseDialog(card, category);
    });
    actions.appendChild(replyBtn);
  }

  // 4. Αγαπημένο
  if (showFavorite) {
    const favBtn = h("button", "fav-btn");
    favBtn.type = "button";
    favBtn.setAttribute("aria-label", "Αποθήκευση στα Αγαπημένα");
    favBtn.appendChild(svgIcon("icon-star", "btn-icon"));
    favBtn.addEventListener("click", () => {
      quickSaveFavorite(card.text, favBtn);
    });
    actions.appendChild(favBtn);
  }

  // 5. Διαγραφή (αν custom)
  if (isCustom) {
    const delBtn = h("button", "delete-btn");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Διαγραφή κάρτας");
    delBtn.appendChild(svgIcon("icon-trash", "btn-icon"));
    delBtn.addEventListener("click", () => {
      askDelete("custom", card.id, card.text, delBtn);
    });
    actions.appendChild(delBtn);
  }

  wrap.appendChild(actions);
  return wrap;
}

// ─── Fullscreen (φράσεις / αγαπημένα) ─────────────────────────────

function openFullscreen(text, label) {
  vibrateShort();
  fullscreenProtocolMode = false;
  els.fullscreenClose.textContent = "Κλείσιμο";

  els.fullscreenLabel.textContent = label || "";
  els.fullscreenLabel.hidden = !label;
  els.fullscreenText.textContent = text;

  els.fullscreen.hidden = false;
  setBackgroundInert(true);

  document.addEventListener("keydown", onFullscreenKeydown);
  els.fullscreenClose.focus();
}

function openFullscreenWithFollowup(text, label, categoryId) {
  openFullscreen(text, label);
  fullscreenFollowup = true;
  fullscreenCategoryId = categoryId || null;
  addFollowupStrip();
}

function addFollowupStrip() {
  // Αφαιρώ παλιό strip αν υπάρχει
  const old = document.getElementById("fullscreen-followup");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  const strip = h("div", "followup-strip");
  strip.id = "fullscreen-followup";

  strip.appendChild(
    h("p", "followup-question", "Τι θέλεις τώρα;")
  );

  const buttons = h("div", "followup-buttons");

  const moreBtn = h(
    "button",
    "followup-btn followup-btn-primary",
    "Χρειάζεται κάτι άλλο;"
  );
  moreBtn.type = "button";
  moreBtn.addEventListener("click", () => {
    closeFullscreen();
  });
  buttons.appendChild(moreBtn);

  const doneBtn = h("button", "followup-btn", "Τέλος");
  doneBtn.type = "button";
  doneBtn.addEventListener("click", () => {
    closeFullscreen();
    navigateTo(VIEWS.HOME);
  });
  buttons.appendChild(doneBtn);

  strip.appendChild(buttons);
  els.fullscreen.appendChild(strip);
}

function removeFollowupStrip() {
  const strip = document.getElementById("fullscreen-followup");
  if (strip && strip.parentNode) {
    strip.parentNode.removeChild(strip);
  }
}

function closeFullscreen() {
  const wasProtocolAnswer = fullscreenProtocolMode;

  removeFollowupStrip();

  fullscreenProtocolMode = false;
  fullscreenFollowup = false;
  fullscreenCategoryId = null;
  els.fullscreenClose.textContent = "Κλείσιμο";

  els.fullscreen.hidden = true;
  setBackgroundInert(false);
  document.removeEventListener("keydown", onFullscreenKeydown);

  if (wasProtocolAnswer) {
    advanceProtocol();
  }
}

function onFullscreenKeydown(event) {
  if (event.key !== "Escape") return;

  if (!els.responseFullscreen.hidden) {
    closeResponseFullscreen();
  } else if (!els.fullscreen.hidden) {
    closeFullscreen();
  }
}

function setBackgroundInert(on) {
  [els.header, els.content, els.fab, els.tabbarEl].forEach((el) => {
    if (!el) return;

    if (on) {
      el.setAttribute("inert", "");
    } else {
      el.removeAttribute("inert");
    }
  });
}

// ─── Response dialog (5 στάδια) ───────────────────────────────────

function openResponseDialog(card, category) {
  pendingResponseCard = card;
  pendingResponseCategory = category || null;
  currentResponseValue = null;
  currentResponseType = card.response;

  els.responsePhrase1.textContent = card.text;
  els.responsePhrase2.textContent = card.text;
  els.responseError.hidden = true;

  els.responseNumberInput.value = "";
  els.responseTextInput.value = "";
  els.responseDateInput.value = "";
  els.responseTimeInput.value = "";

  els.responseInputNumber.hidden = true;
  els.responseInputText.hidden = true;
  els.responseInputYesno.hidden = true;
  els.responseInputDatetime.hidden = true;

  if (card.response === "number") {
    els.responseNumberUnit.textContent = card.unit || "";
  }

  els.responseStage1.hidden = false;
  els.responseStage2.hidden = true;

  // Προσθήκη οδηγίας στην κορυφή
  addListenerHeader();

  openDialog(els.responseDialog);
  els.responseReady.focus();
}

function addListenerHeader() {
  // Αφαίρεση παλιού header αν υπάρχει
  const old = document.getElementById("listener-header-el");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  const header = h(
    "p",
    "listener-header",
    "Παρακαλώ γράψτε ή επιλέξτε την απάντησή σας παρακάτω."
  );
  header.id = "listener-header-el";

  const dialog = els.responseDialog;
  if (dialog.firstChild) {
    dialog.insertBefore(header, dialog.firstChild);
  } else {
    dialog.appendChild(header);
  }
}

function onResponseReady() {
  els.responseStage1.hidden = true;
  els.responseStage2.hidden = false;

  const type = currentResponseType;

  if (type === "number") {
    els.responseInputNumber.hidden = false;
    els.responseNumberInput.focus();
  } else if (type === "text") {
    els.responseInputText.hidden = false;
    els.responseTextInput.focus();
  } else if (type === "yesno") {
    els.responseInputYesno.hidden = false;
    els.responseYes.focus();
  } else if (type === "datetime") {
    els.responseInputDatetime.hidden = false;
    els.responseDateInput.focus();
  }
}

function onResponseSubmit() {
  const type = currentResponseType;
  let value = "";

  if (type === "number") {
    value = (els.responseNumberInput.value || "").trim();

    if (!value) {
      showResponseError("Γράψε την τιμή.");
      return;
    }

    if (!/^\d[\d.,\s]*$/.test(value)) {
      showResponseError("Γράψε έναν αριθμό, π.χ. 12 ή 12,50.");
      return;
    }
  } else if (type === "text") {
    value = (els.responseTextInput.value || "").trim();

    if (!value) {
      showResponseError("Γράψε την απάντηση.");
      return;
    }
  } else if (type === "datetime") {
    const date = els.responseDateInput.value;
    const time = els.responseTimeInput.value;

    if (!date && !time) {
      showResponseError("Διάλεξε ημερομηνία ή ώρα.");
      return;
    }

    value = [date, time].filter(Boolean).join(" ");
  }

  closeDialog(els.responseDialog);
  showResponseResult(value, type);
}

function onResponseYes() {
  closeDialog(els.responseDialog);
  showResponseResult("yes", "yesno");
}

function onResponseNo() {
  closeDialog(els.responseDialog);
  showResponseResult("no", "yesno");
}

function showResponseError(msg) {
  els.responseError.textContent = msg;
  els.responseError.hidden = false;
}

function showResponseResult(value, type) {
  currentResponseValue = value;

  const phrase = pendingResponseCard ? pendingResponseCard.text : "";
  const unit = pendingResponseCard ? (pendingResponseCard.unit || "") : "";

  openResponseFullscreen(phrase, value, type, unit, false);
}

// ─── Response fullscreen ──────────────────────────────────────────

function openResponseFullscreen(phrase, value, type, unit, fromHistory) {
  vibrateDouble();
  els.responseFullscreenPhrase.textContent = phrase;
  els.responseFullscreenText.textContent = formatResponseForFullscreen(
    value,
    type
  );

  if (type === "number" && unit) {
    els.responseFullscreenUnit.textContent = unit;
    els.responseFullscreenUnit.hidden = false;
  } else {
    els.responseFullscreenUnit.textContent = "";
    els.responseFullscreenUnit.hidden = true;
  }

  els.responseSave.hidden = !!fromHistory;

  els.responseFullscreen.hidden = false;
  setBackgroundInert(true);

  document.addEventListener("keydown", onFullscreenKeydown);
  els.responseSave.focus();
}

function closeResponseFullscreen() {
  els.responseFullscreen.hidden = true;
  els.responseSave.hidden = false;

  setBackgroundInert(false);
  document.removeEventListener("keydown", onFullscreenKeydown);
}

function onResponseSave() {
  const phrase = pendingResponseCard ? pendingResponseCard.text : "";
  const categoryId = pendingResponseCategory ? pendingResponseCategory.id : "";
  const categoryName = pendingResponseCategory
    ? pendingResponseCategory.name
    : "";
  const unit = pendingResponseCard ? (pendingResponseCard.unit || "") : "";

  const result = saveResponse(
    phrase,
    currentResponseValue,
    currentResponseType,
    unit,
    categoryId,
    categoryName
  );

  if (!result || result.ok === false) {
    showToast("Δεν ήταν δυνατή η αποθήκευση.");
    return;
  }

  pendingResponseCard = null;
  pendingResponseCategory = null;
  currentResponseValue = null;
  currentResponseType = null;

  vibrateDouble();
  closeResponseFullscreen();
  showToast("Αποθηκεύτηκε στο Ιστορικό.");
}

function onResponseDone() {
  pendingResponseCard = null;
  pendingResponseCategory = null;
  currentResponseValue = null;
  currentResponseType = null;

  closeResponseFullscreen();
}

// ─── Format helpers ───────────────────────────────────────────────

function formatResponseForFullscreen(value, type) {
  if (type === "number") {
    return formatNumber(value);
  }

  if (type === "yesno") {
    return value === "yes" ? "ΝΑΙ" : "ΟΧΙ";
  }

  if (type === "datetime") {
    return formatDateTimeValue(value);
  }

  return value;
}

function formatResponseForDisplay(resp) {
  if (!resp) return "";

  if (resp.responseType === "number") {
    return formatNumber(resp.response) + (resp.unit ? " " + resp.unit : "");
  }

  if (resp.responseType === "yesno") {
    return resp.response === "yes" ? "ΝΑΙ" : "ΟΧΙ";
  }

  if (resp.responseType === "datetime") {
    return formatDateTimeValue(resp.response);
  }

  return resp.response;
}

function formatNumber(value) {
  const s = String(value).trim();

  // Διατήρηση όπως το έγραψε ο συνομιλητής.
  // Μόνο η αλλαγή τελείας σε κόμμα για δεκαδικά 1-2 ψηφία.
  if (/^\d+\.\d{1,2}$/.test(s)) {
    return s.replace(".", ",");
  }

  return s;
}

function formatDateTimeValue(value) {
  if (!value) return "";

  const parts = String(value).split(" ");
  const date = parts[0] || "";
  const time = parts[1] || "";

  let dateFormatted = "";

  if (date && date.indexOf("-") !== -1) {
    const segments = date.split("-");

    if (segments.length === 3) {
      const y = segments[0];
      const m = segments[1];
      const d = segments[2];

      if (y && m && d) {
        dateFormatted = d + "/" + m + "/" + y;
      }
    }
  }

  return [dateFormatted, time].filter(Boolean).join(", ");
}

function formatDateTimeShort(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return day + "/" + month + "/" + year + ", " + hours + ":" + mins;
}

function formatDateTimeLong(timestamp) {
  const d = new Date(timestamp);
  const months = [
    "Ιανουαρίου",
    "Φεβρουαρίου",
    "Μαρτίου",
    "Απριλίου",
    "Μαΐου",
    "Ιουνίου",
    "Ιουλίου",
    "Αυγούστου",
    "Σεπτεμβρίου",
    "Οκτωβρίου",
    "Νοεμβρίου",
    "Δεκεμβρίου"
  ];

  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return (
    d.getDate() +
    " " +
    months[d.getMonth()] +
    " " +
    d.getFullYear() +
    ", " +
    hours +
    ":" +
    mins
  );
}

// ─── PDF Export ───────────────────────────────────────────────────

function exportHistoryToPdf() {
  const combined = getResponses().concat(getProtocolHistory());
  const responses = filterResponsesByDate(combined, currentHistoryFilter);

  if (responses.length === 0) {
    showToast("Δεν υπάρχουν απαντήσεις για εξαγωγή.");
    return;
  }

  buildPrintArea({
    title: "Ιστορικό Απαντήσεων",
    cards: responses.map((r) => {
      const isProtocol = r.responseType === "protocol";

      let answer = "";

      if (isProtocol) {
        answer = (r.steps || [])
          .map((s, i) => i + 1 + ". " + s.question + " → " + s.answer)
          .join("\n");
      } else {
        answer = formatResponseForDisplay(r);
      }

      return {
        category: isProtocol
          ? "Δομημένη συνομιλία · " + (r.protocolTitle || "")
          : r.categoryName || "",
        meta: formatDateTimeLong(r.timestamp),
        question: r.phrase || r.protocolTitle || "",
        answer: answer
      };
    })
  });

  window.print();

  setTimeout(() => {
    els.printArea.replaceChildren();
  }, 500);
}

function exportFavoritesToPdf() {
  const favorites = sortFavoritesAlphabetically(getFavorites());

  if (favorites.length === 0) {
    showToast("Δεν υπάρχουν αγαπημένα για εξαγωγή.");
    return;
  }

  buildPrintArea({
    title: "Αγαπημένα Στοιχεία",
    cards: favorites.map((f) => ({
      category: tagLabelsFor(f.tags),
      meta: "",
      question: f.label,
      answer: f.value
    }))
  });

  window.print();

  setTimeout(() => {
    els.printArea.replaceChildren();
  }, 500);
}

function tagLabelsFor(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return "";

  return tagIds
    .map((id) => {
      const t = TAGS.find((x) => x.id === id);
      return t ? t.label : "";
    })
    .filter(Boolean)
    .join(" · ");
}

function buildPrintArea(opts) {
  const area = els.printArea;

  if (!area) return;
  area.replaceChildren();

  const header = h("div", "print-header");
  const logoRow = h("div", "print-header-logo");
  logoRow.appendChild(h("span", "print-logo-mark", "Δ"));
  logoRow.appendChild(h("h1", "print-title", "Δίαυλος"));
  header.appendChild(logoRow);
  header.appendChild(h("p", "print-subtitle", opts.title));
  area.appendChild(header);

  opts.cards.forEach((c) => {
    const card = h("div", "print-card");

    const meta = h("div", "print-card-meta");
    meta.appendChild(
      h("span", "print-card-category", c.category || "")
    );
    meta.appendChild(h("span", "print-card-time", c.meta || ""));
    card.appendChild(meta);

    const box = h("div", "print-box");
    box.appendChild(h("p", "print-question", c.question));
    box.appendChild(h("p", "print-answer", c.answer));
    card.appendChild(box);

    area.appendChild(card);
  });

  const footer = h("div", "print-footer");
  footer.appendChild(
    h("p", null, "Δημιουργήθηκε από την εφαρμογή Δίαυλος")
  );
  footer.appendChild(h("p", null, location.host));
  area.appendChild(footer);
}

// ─── Ανάγνωση φωνητικά ────────────────────────────────────────────

function speak(text) {
  if (
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    showToast("Η συσκευή δεν υποστηρίζει ανάγνωση κειμένου.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "el-GR";

  const voices = window.speechSynthesis.getVoices();

  const greek = voices.find(
    (v) => v.lang && v.lang.toLowerCase().startsWith("el")
  );

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
// ─── Δομημένη συνομιλία — είσοδος ─────────────────────────────────

function openProtocol(protocolId) {
  if (!PROTOCOL_DEFINITIONS[protocolId]) {
    showToast("Δεν βρέθηκε το συγκεκριμένο πρωτόκολλο.");
    return;
  }

  currentProtocolId = protocolId;
  currentProtocol = null;
  currentProtocolStepIndex = 0;
  currentProtocolAnswers = [];
  protocolSelectedAnswer = "";
  protocolAnswerLocked = false;

  history.pushState(
    { view: VIEWS.PROTOCOL, protocolId: protocolId },
    ""
  );

  render(VIEWS.PROTOCOL, true);
}

// ─── Render πρωτόκολλου ───────────────────────────────────────────

async function renderProtocol(protocolId) {
  if (!protocolId) {
    navigateTo(VIEWS.HOME);
    return;
  }

  const def = PROTOCOL_DEFINITIONS[protocolId];

  els.title.textContent = def ? def.title : "Δομημένη συνομιλία";

  clear(els.content);

  const loading = h("p", "empty-state", "Φόρτωση συνομιλίας...");
  els.content.appendChild(loading);

  try {
    if (
      !currentProtocol ||
      currentProtocol.id !== protocolId
    ) {
      const response = await fetch(
        "data/protocols/" +
          encodeURIComponent(protocolId) +
          ".json",
        { cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      currentProtocol = await response.json();
    }

    if (
      !currentProtocol ||
      !Array.isArray(currentProtocol.steps) ||
      currentProtocol.steps.length === 0
    ) {
      throw new Error("Invalid protocol");
    }

    if (
      currentProtocolStepIndex >= currentProtocol.steps.length
    ) {
      renderProtocolSummary();
      return;
    }

    renderProtocolStep();
  } catch (error) {
    clear(els.content);

    const errorBox = h("div", "empty-state");

    errorBox.appendChild(
      h(
        "p",
        null,
        "Δεν ήταν δυνατή η φόρτωση της δομημένης συνομιλίας."
      )
    );

    const retry = h("button", "btn-primary", "Δοκιμή ξανά");
    retry.type = "button";
    retry.addEventListener("click", () =>
      renderProtocol(protocolId)
    );

    const back = h("button", "btn-secondary", "Επιστροφή");
    back.type = "button";
    back.style.marginTop = "8px";
    back.addEventListener("click", goBack);

    errorBox.append(retry, h("br"), back);
    els.content.appendChild(errorBox);
  }
}

// ─── Render βήματος ───────────────────────────────────────────────

function renderProtocolStep() {
  if (!currentProtocol || !currentProtocol.steps) return;

  const step = currentProtocol.steps[currentProtocolStepIndex];

  if (!step) {
    renderProtocolSummary();
    return;
  }

  protocolAnswerLocked = false;
  protocolSelectedAnswer = "";

  els.title.textContent = currentProtocol.title || "Δομημένη συνομιλία";

  const frag = document.createDocumentFragment();

  // Disclaimer πριν από το πρώτο βήμα
  if (
    currentProtocolStepIndex === 0 &&
    currentProtocol.disclaimer
  ) {
    const disclaimerBox = h(
      "div",
      "protocol-disclaimer-box"
    );

    disclaimerBox.appendChild(
      h(
        "p",
        "protocol-disclaimer-text",
        currentProtocol.disclaimer
      )
    );

    frag.appendChild(disclaimerBox);
  }

  // Progress
  const progress = h("div", "protocol-progress");
  progress.setAttribute("aria-label", "Πρόοδος συνομιλίας");

  progress.appendChild(
    h(
      "span",
      "protocol-progress-text",
      "Βήμα " +
        (currentProtocolStepIndex + 1) +
        " από " +
        currentProtocol.steps.length
    )
  );

  const progressTrack = h("div", "protocol-progress-track");
  const progressValue = h("div", "protocol-progress-value");

  progressValue.style.width =
    (
      ((currentProtocolStepIndex + 1) /
        currentProtocol.steps.length) *
      100
    ) + "%";

  progressTrack.appendChild(progressValue);
  progress.appendChild(progressTrack);

  frag.appendChild(progress);

  // Ερώτηση
  const questionCard = h("section", "protocol-question-card");

  questionCard.appendChild(
    h(
      "p",
      "protocol-question",
      step.question || ""
    )
  );

  const answerArea = h("div", "protocol-answer-area");

  buildProtocolAnswerControl(step, answerArea);

  questionCard.appendChild(answerArea);

  frag.appendChild(questionCard);

  // Κουμπί «Παράλειψη / Τέλος» (εκτός αν είναι το τελευταίο βήμα)
  if (
    currentProtocolStepIndex < currentProtocol.steps.length - 1 &&
    step.type !== "info"
  ) {
    const skipBtn = h("button", "protocol-skip-btn", "Παράλειψη / Τέλος");
    skipBtn.type = "button";
    skipBtn.addEventListener("click", () => {
      vibrateShort();
      renderProtocolSummary();
    });
    frag.appendChild(skipBtn);
  }

  clear(els.content);
  els.content.appendChild(frag);

  // Focus στο πρώτο διαθέσιμο στοιχείο
  const firstControl = answerArea.querySelector(
    "button, input, select, textarea"
  );

  if (firstControl) {
    firstControl.focus();
  }
}

// ─── Build UI ανά τύπο βήματος ────────────────────────────────────

function buildProtocolAnswerControl(step, container) {
  const type = step.type || "text";

  if (type === "choice") {
    buildProtocolChoice(container, step);
    return;
  }

  if (type === "yesno") {
    buildProtocolYesNo(container, step);
    return;
  }

  if (type === "number") {
    buildProtocolNumber(container, step);
    return;
  }

  if (type === "datetime") {
    buildProtocolDateTime(container, step);
    return;
  }

  if (type === "info") {
    buildProtocolInfo(container, step);
    return;
  }

  buildProtocolText(container, step);
}

function buildProtocolChoice(container, step) {
  const options = Array.isArray(step.options) ? step.options : [];

  const group = h("div", "protocol-choice-grid");
  group.setAttribute("role", "group");

  options.forEach((option) => {
    const value =
      typeof option === "string"
        ? option
        : option.value || option.label || "";

    const label =
      typeof option === "string"
        ? option
        : option.label || option.value || "";

    const button = h("button", "protocol-choice-btn", label);
    button.type = "button";

    button.addEventListener("click", () => {
      completeProtocolStep(value);
    });

    group.appendChild(button);
  });

  container.appendChild(group);
}

function buildProtocolYesNo(container, step) {
  const group = h("div", "yesno-grid protocol-yesno");

  const yes = h("button", "yesno-btn yesno-yes");
  yes.type = "button";
  yes.append(
    svgIcon("icon-check", "yesno-icon"),
    h("span", "yesno-label", "ΝΑΙ")
  );
  yes.addEventListener("click", () => {
    completeProtocolStep("ΝΑΙ");
  });

  const no = h("button", "yesno-btn yesno-no");
  no.type = "button";
  no.append(
    svgIcon("icon-close", "yesno-icon"),
    h("span", "yesno-label", "ΟΧΙ")
  );
  no.addEventListener("click", () => {
    completeProtocolStep("ΟΧΙ");
  });

  group.append(yes, no);
  container.appendChild(group);
}

function buildProtocolNumber(container, step) {
  const field = h("div", "protocol-input-group");

  const input = h("input", "protocol-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";

  if (step.placeholder) {
    input.placeholder = step.placeholder;
  }

  const action = h("button", "btn-primary", "Συνέχεια");
  action.type = "button";

  const submit = () => {
    const value = input.value.trim();

    if (!value) {
      showToast("Γράψε πρώτα την απάντηση.");
      input.focus();
      return;
    }

    if (!/^[\d.,\s]+$/.test(value)) {
      showToast("Γράψε έναν αριθμό.");
      input.focus();
      return;
    }

    completeProtocolStep(
      value + (step.unit ? " " + step.unit : "")
    );
  };

  action.addEventListener("click", submit);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });

  field.append(input, action);
  container.appendChild(field);
}

function buildProtocolText(container, step) {
  const field = h("div", "protocol-input-group");

  const input = h("textarea", "protocol-textarea");
  input.rows = 3;
  input.autocomplete = "off";

  if (step.placeholder) {
    input.placeholder = step.placeholder;
  }

  input.setAttribute(
    "aria-label",
    step.question || "Απάντηση"
  );

  const action = h("button", "btn-primary", "Συνέχεια");
  action.type = "button";

  const submit = () => {
    const value = input.value.trim();

    if (!value) {
      showToast("Γράψε πρώτα την απάντηση.");
      input.focus();
      return;
    }

    completeProtocolStep(value);
  };

  action.addEventListener("click", submit);

  input.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      submit();
    }
  });

  field.append(input, action);
  container.appendChild(field);
}

function buildProtocolDateTime(container, step) {
  const field = h("div", "protocol-input-group protocol-datetime");

  const date = h("input", "protocol-input");
  date.type = "date";
  date.setAttribute("aria-label", "Ημερομηνία");

  const time = h("input", "protocol-input");
  time.type = "time";
  time.setAttribute("aria-label", "Ώρα");

  const action = h("button", "btn-primary", "Συνέχεια");
  action.type = "button";

  action.addEventListener("click", () => {
    if (!date.value && !time.value) {
      showToast("Διάλεξε ημερομηνία ή ώρα.");
      return;
    }

    const value = [date.value, time.value]
      .filter(Boolean)
      .join(" ");

    completeProtocolStep(formatDateTimeValue(value));
  });

  field.append(date, time, action);
  container.appendChild(field);
}

function buildProtocolInfo(container, step) {
  container.appendChild(
    h(
      "p",
      "protocol-info",
      step.text || step.question || ""
    )
  );

  const action = h("button", "btn-primary", "Συνέχεια");
  action.type = "button";
  action.addEventListener("click", () =>
    completeProtocolStep("Ενημερώθηκα")
  );

  container.appendChild(action);
}

// ─── Ολοκλήρωση βήματος ───────────────────────────────────────────

function completeProtocolStep(answer) {
  if (protocolAnswerLocked || !currentProtocol) return;

  const step = currentProtocol.steps[currentProtocolStepIndex];

  if (!step) return;

  protocolAnswerLocked = true;

  const cleanAnswer = String(answer).trim();

  currentProtocolAnswers[currentProtocolStepIndex] = {
    question: step.question || "",
    answer: cleanAnswer
  };

  showProtocolAnswer(cleanAnswer);
}

function showProtocolAnswer(answer) {
  fullscreenProtocolMode = true;
  els.fullscreenClose.textContent = "Συνέχεια";

  els.fullscreenLabel.textContent = "Η απάντησή σας";
  els.fullscreenLabel.hidden = false;
  els.fullscreenText.textContent = answer;

  els.fullscreen.hidden = false;
  setBackgroundInert(true);

  document.addEventListener("keydown", onFullscreenKeydown);
  els.fullscreenClose.focus();
}

function advanceProtocol() {
  vibrateShort();
  currentProtocolStepIndex += 1;
  protocolAnswerLocked = false;

  if (currentProtocolStepIndex >= currentProtocol.steps.length) {
    renderProtocolSummary();
    return;
  }

  renderProtocolStep();
}

// ─── Σύνοψη πρωτοκόλλου ───────────────────────────────────────────

function renderProtocolSummary() {
  els.title.textContent = currentProtocol
    ? currentProtocol.title
    : "Σύνοψη συνομιλίας";

  const frag = document.createDocumentFragment();

  frag.appendChild(
    h(
      "h2",
      "protocol-summary-title",
      "Ολοκληρώθηκε η συνομιλία"
    )
  );

  frag.appendChild(
    h(
      "p",
      "protocol-summary-intro",
      "Αυτές είναι οι απαντήσεις που δόθηκαν."
    )
  );

  if (currentProtocol && currentProtocol.disclaimer) {
    const discBox = h("div", "protocol-disclaimer-box");
    discBox.appendChild(
      h(
        "p",
        "protocol-disclaimer-text",
        currentProtocol.disclaimer
      )
    );
    frag.appendChild(discBox);
  }

  const list = h("div", "protocol-summary-list");

  currentProtocolAnswers.forEach((item, index) => {
    if (!item) return;

    const row = h("article", "protocol-summary-row");

    row.append(
      h("span", "protocol-summary-step", "Βήμα " + (index + 1)),
      h("p", "protocol-summary-question", item.question),
      h("p", "protocol-summary-answer", item.answer)
    );

    list.appendChild(row);
  });

  frag.appendChild(list);

  const actions = h("div", "protocol-summary-actions");

  const save = h("button", "btn-primary", "Αποθήκευση στο Ιστορικό");
  save.type = "button";
  save.addEventListener("click", saveProtocolToHistory);

  const newConversation = h("button", "btn-secondary", "Νέα συνομιλία");
  newConversation.type = "button";
  newConversation.addEventListener("click", () => {
    currentProtocolStepIndex = 0;
    currentProtocolAnswers = [];
    protocolAnswerLocked = false;
    protocolSelectedAnswer = "";
    renderProtocol(currentProtocolId);
  });

  const home = h("button", "btn-secondary", "Αρχική");
  home.type = "button";
  home.addEventListener("click", () => navigateTo(VIEWS.HOME));

  actions.append(save, newConversation, home);
  frag.appendChild(actions);

  clear(els.content);
  els.content.appendChild(frag);
}

// ─── Αποθήκευση πρωτοκόλλου στο Ιστορικό ──────────────────────────

function saveProtocolToHistory() {
  if (!currentProtocol || !currentProtocol.id) return;

  const entries = getProtocolHistory();

  const record = {
    id:
      "protocol-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8),

    phrase: currentProtocol.title || "Δομημένη συνομιλία",

    response: currentProtocolAnswers
      .filter(Boolean)
      .map((item) => item.question + ": " + item.answer)
      .join("\n"),

    responseType: "protocol",

    protocolId: currentProtocol.id,

    protocolTitle: currentProtocol.title || "",

    steps: currentProtocolAnswers
      .filter(Boolean)
      .map((item) => ({
        question: item.question,
        answer: item.answer
      })),

    timestamp: Date.now()
  };

  entries.push(record);

  try {
    localStorage.setItem(
      PROTOCOL_HISTORY_KEY,
      JSON.stringify(entries)
    );

    showToast("Η συνομιλία αποθηκεύτηκε στο Ιστορικό.");
  } catch (error) {
    showToast("Δεν ήταν δυνατή η αποθήκευση.");
  }
}

// ─── Ιστορικό πρωτοκόλλων ─────────────────────────────────────────

function getProtocolHistory() {
  try {
    const raw = localStorage.getItem(PROTOCOL_HISTORY_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

// ─── Φτιάξε το αίτημά σου (Composer) ─────────────────────────────

function openComposer(categoryId) {
  currentComposerCategoryId = categoryId;
  currentComposerPurposeId = null;
  composerSelectedPrefix = "";

  history.pushState(
    { view: VIEWS.COMPOSER, categoryId: categoryId },
    ""
  );

  render(VIEWS.COMPOSER, true);
}

function openComposerDetail(purposeId) {
  currentComposerPurposeId = purposeId;
  composerSelectedPrefix = "";

  history.pushState(
    {
      view: VIEWS.COMPOSER_DETAIL,
      categoryId: currentComposerCategoryId,
      purposeId: purposeId
    },
    ""
  );

  render(VIEWS.COMPOSER_DETAIL, true);
}

function renderComposerCategory() {
  const cat = CARD_CATEGORIES.find((c) => c.id === currentComposerCategoryId);

  if (!cat || !Array.isArray(cat.purposes) || cat.purposes.length === 0) {
    navigateTo(VIEWS.HOME);
    return;
  }

  els.title.textContent = "Φτιάξε το αίτημά σου";

  const intro = h(
    "p",
    "composer-intro",
    "Διάλεξε τι θέλεις να κάνεις. Θα φτιάξουμε μαζί την κάρτα που θα δείξεις."
  );

  const list = h("div", "composer-purpose-list");

  cat.purposes.forEach((purpose) => {
    const btn = h("button", "composer-purpose-btn");
    btn.type = "button";
    btn.appendChild(h("span", "composer-purpose-label", purpose.label));

    btn.addEventListener("click", () => {
      openComposerDetail(purpose.id);
    });

    list.appendChild(btn);
  });

  clear(els.content);
  els.content.append(intro, list);
}

function renderComposerDetail() {
  const cat = CARD_CATEGORIES.find((c) => c.id === currentComposerCategoryId);

  if (!cat || !Array.isArray(cat.purposes)) {
    navigateTo(VIEWS.HOME);
    return;
  }

  const purpose = cat.purposes.find((p) => p.id === currentComposerPurposeId);

  if (!purpose) {
    render(VIEWS.COMPOSER, true);
    return;
  }

  composerPersonalChips = [];

  els.title.textContent = purpose.label;

  const frag = document.createDocumentFragment();

  frag.appendChild(
    h("p", "composer-prompt", purpose.prompt || "Γράψε τι θέλεις:")
  );

  if (Array.isArray(purpose.prefixes) && purpose.prefixes.length > 0) {
    const chips = h("div", "composer-chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Γρήγορες επιλογές");

    purpose.prefixes.forEach((prefix) => {
      const chip = h("button", "composer-chip", prefix);
      chip.type = "button";
      chip.setAttribute("aria-pressed", "false");

      chip.addEventListener("click", () => {
        const wasActive = chip.classList.contains("composer-chip-active");

        chips.querySelectorAll(".composer-chip").forEach((other) => {
          other.classList.remove("composer-chip-active");
          other.setAttribute("aria-pressed", "false");
        });

        if (!wasActive) {
          chip.classList.add("composer-chip-active");
          chip.setAttribute("aria-pressed", "true");
          composerSelectedPrefix = prefix;
        } else {
          composerSelectedPrefix = "";
        }
      });

      chips.appendChild(chip);
    });

    frag.appendChild(chips);
  }

  const textarea = h("textarea", "composer-textarea");
  textarea.rows = 3;
  textarea.maxLength = 300;
  textarea.placeholder = purpose.placeholder || "";
  textarea.setAttribute("aria-label", purpose.prompt || "Λεπτομέρειες");

  // Προσωπικά στοιχεία
  if (hasAnyPersonalData()) {
    const personalToggle = h(
      "button",
      "composer-personal-toggle",
      "+ Πρόσθεσε στοιχείο"
    );
    personalToggle.type = "button";

    const personalContainer = h("div");
    personalContainer.hidden = true;

    personalToggle.addEventListener("click", () => {
      const isHidden = personalContainer.hidden;
      personalContainer.hidden = !isHidden;
      personalToggle.textContent = isHidden
        ? "− Κλείσιμο στοιχείων"
        : "+ Πρόσθεσε στοιχείο";
    });

    const chips = h("div", "composer-personal-chips");

    PERSONAL_FIELDS.forEach((field) => {
      const value = getPersonalField(field.id);
      if (!value) return;

      const chip = h("button", "composer-personal-chip");
      chip.type = "button";
      chip.setAttribute("aria-pressed", "false");
      chip.appendChild(h("span", null, field.label));

      chip.addEventListener("click", () => {
        const isActive = composerPersonalChips.indexOf(field.id) !== -1;

        if (isActive) {
          composerPersonalChips = composerPersonalChips.filter(
            (id) => id !== field.id
          );
          chip.classList.remove("composer-personal-chip-active");
          chip.setAttribute("aria-pressed", "false");
        } else {
          composerPersonalChips.push(field.id);
          chip.classList.add("composer-personal-chip-active");
          chip.setAttribute("aria-pressed", "true");
        }
      });

      chips.appendChild(chip);
    });

    personalContainer.appendChild(chips);
    frag.appendChild(personalToggle);
    frag.appendChild(personalContainer);
  }

  frag.appendChild(textarea);

  const error = h("p", "form-error", "");
  error.hidden = true;
  frag.appendChild(error);

  const showBtn = h("button", "composer-show-btn", "ΕΜΦΑΝΙΣΗ");
  showBtn.type = "button";

  showBtn.addEventListener("click", () => {
    onComposerShow(purpose, textarea, error);
  });

  frag.appendChild(showBtn);

  clear(els.content);
  els.content.appendChild(frag);

  if (purpose.urgent === true) {
    showUrgentWarning(currentComposerCategoryId);
  }

  textarea.focus();
}

function showUrgentWarning(categoryId) {
  const wrap = h("div", "urgent-warning");

  wrap.appendChild(
    h("p", "urgent-text", "⚠ Αν είναι επείγον, στείλε SMS στο 112.")
  );

  const actions = h("div", "urgent-actions");

  const smsBtn = h("button", "urgent-btn urgent-btn-sms", "SMS 112");
  smsBtn.type = "button";
  smsBtn.addEventListener("click", () => {
    navigateTo(VIEWS.EMERGENCY_CALL);
  });
  actions.appendChild(smsBtn);

  const continueBtn = h("button", "urgent-btn", "Συνέχεια");
  continueBtn.type = "button";
  continueBtn.addEventListener("click", () => {
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  });
  actions.appendChild(continueBtn);

  wrap.appendChild(actions);

  els.content.insertBefore(wrap, els.content.firstChild);
}

function onComposerShow(purpose, textarea, error) {
  const typedText = (textarea.value || "").trim();

  let detail = "";

  if (composerSelectedPrefix && typedText) {
    detail = composerSelectedPrefix + " (" + typedText + ")";
  } else if (composerSelectedPrefix) {
    detail = composerSelectedPrefix;
  } else if (typedText) {
    detail = typedText;
  }

  // Προσωπικά στοιχεία που έχει επιλέξει ο χρήστης
  const personalLines = composerPersonalChips
    .map((fieldId) => {
      const field = PERSONAL_FIELDS.find((f) => f.id === fieldId);
      const value = getPersonalField(fieldId);
      if (!field || !value) return "";
      return field.label + ": " + value;
    })
    .filter(Boolean);

  if (!detail && personalLines.length === 0) {
    error.textContent = "Γράψε τι θέλεις ή διάλεξε από τις επιλογές.";
    error.hidden = false;
    textarea.focus();
    return;
  }

  error.hidden = true;

  const prefixClean = String(purpose.finalPrefix || "").replace(/\n+/g, " ");
  let composed = prefixClean;

  if (detail) {
    composed += " " + detail;
  }

  if (personalLines.length > 0) {
    composed += "\n" + personalLines.join("\n");
  }

  openFullscreenWithFollowup(
    composed,
    purpose.label,
    currentComposerCategoryId
  );
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

  if (!result || result.ok === false) {
    const messages = {
      empty: "Γράψε πρώτα μια φράση.",
      "too-long":
        "Η φράση είναι πολύ μεγάλη. Το μέγιστο είναι " +
        (typeof CUSTOM_CARD_MAX_LENGTH !== "undefined"
          ? CUSTOM_CARD_MAX_LENGTH
          : 300) +
        " χαρακτήρες.",
      storage: "Δεν ήταν δυνατή η αποθήκευση στη συσκευή."
    };

    els.addError.textContent =
      messages[result.reason] || messages.storage;
    els.addError.hidden = false;
    els.addText.focus();
    return;
  }

  closeDialog(els.addDialog);

  render(VIEWS.CUSTOM, false);
  showToast("Η κάρτα αποθηκεύτηκε.");
}

// ─── Διάλογος: Αγαπημένο ──────────────────────────────────────────

function openFavoriteDialog(favorite) {
  editingFavoriteId = favorite ? favorite.id : null;

  els.favDialogTitle.textContent = favorite
    ? "Επεξεργασία"
    : "Νέο Αγαπημένο";

  els.favLabel.value = favorite ? favorite.label : "";
  els.favValue.value = favorite ? favorite.value : "";
  els.favError.hidden = true;

  const activeTags = favorite ? favorite.tags || [] : [];

  const tagButtons = els.favTags.querySelectorAll("button");

  tagButtons.forEach((btn) => {
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

  const tags = Array.from(
    els.favTags.querySelectorAll("button")
  )
    .filter((btn) => btn.classList.contains("tag-btn-active"))
    .map((btn) => btn.dataset.tagId);

  const result = editingFavoriteId
    ? updateFavorite(editingFavoriteId, label, value, tags)
    : saveFavorite(label, value, tags);

  if (!result || result.ok === false) {
    const messages = {
      "label-empty": "Δώσε έναν σύντομο τίτλο.",
      "value-empty": "Γράψε το περιεχόμενο.",
      "label-too-long": "Ο τίτλος είναι πολύ μεγάλος.",
      "value-too-long": "Το περιεχόμενο είναι πολύ μεγάλο.",
      storage: "Δεν ήταν δυνατή η αποθήκευση."
    };

    els.favError.textContent =
      messages[result.reason] || messages.storage;
    els.favError.hidden = false;
    return;
  }

  const wasEditing = editingFavoriteId !== null;

  closeDialog(els.favDialog);
  editingFavoriteId = null;

  if (currentView === VIEWS.FAVORITES) {
    render(VIEWS.FAVORITES, false);
  }

  showToast(wasEditing ? "Ενημερώθηκε." : "Αποθηκεύτηκε στα Αγαπημένα.");
}

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

// ─── Διάλογος: Διαγραφή ──────────────────────────────────────────

function askDelete(type, id, text, opener) {
  pendingDelete = { type: type, id: id, text: text };

  els.confirmTitle.textContent = "Διαγραφή;";
  els.confirmText.textContent = text || "";

  els.confirmOk.onclick = onConfirmDelete;

  openDialog(els.confirmDialog, opener);
}

function onConfirmDelete() {
  if (!pendingDelete) return;

  let ok = false;

  if (pendingDelete.type === "custom") {
    ok = deleteCustomCard(pendingDelete.id);
  } else if (pendingDelete.type === "favorite") {
    ok = deleteFavorite(pendingDelete.id);
  } else if (pendingDelete.type === "protocol") {
    ok = deleteProtocolFromHistory(pendingDelete.id);
  } else {
    ok = deleteResponse(pendingDelete.id);
  }

  const wasProtocol = pendingDelete.type === "protocol";
  const wasCustom = pendingDelete.type === "custom";

  const view = wasCustom ? VIEWS.CUSTOM : VIEWS.FAVORITES;

  pendingDelete = null;
  closeDialog(els.confirmDialog);
  dialogOpener = null;

  if (wasProtocol) {
    renderFavorites();
  } else {
    render(view, true);
  }

  showToast(ok ? "Διαγράφηκε." : "Δεν ήταν δυνατή η διαγραφή.");
}

// ─── Διαγραφή από ιστορικό πρωτοκόλλων ────────────────────────────

function deleteProtocolFromHistory(id) {
  const entries = getProtocolHistory();
  const filtered = entries.filter((item) => item.id !== id);

  if (filtered.length === entries.length) return false;

  try {
    localStorage.setItem(
      PROTOCOL_HISTORY_KEY,
      JSON.stringify(filtered)
    );

    return true;
  } catch (error) {
    return false;
  }
}

// ─── Εκκίνηση ─────────────────────────────────────────────────────

function init() {
  // Content
  els.content = document.getElementById("content");
  els.title = document.getElementById("screen-title");
  els.back = document.getElementById("back-btn");
  els.fab = document.getElementById("add-custom-btn");
  els.toast = document.getElementById("toast");

  // Header
  els.headerLogo = document.getElementById("header-logo");
  els.headerSubtitle = document.getElementById("header-subtitle");
  els.header = document.querySelector("header");
  els.tabbarEl = document.querySelector(".tabbar");

  // Print
  els.printArea = document.getElementById("print-area");

  // Fullscreen
  els.fullscreen = document.getElementById("fullscreen");
  els.fullscreenLabel = document.getElementById("fullscreen-label");
  els.fullscreenText = document.getElementById("fullscreen-text");
  els.fullscreenClose = document.getElementById("fullscreen-close");

  // Response fullscreen
  els.responseFullscreen = document.getElementById("response-fullscreen");
  els.responseFullscreenPhrase = document.getElementById(
    "response-fullscreen-phrase"
  );
  els.responseFullscreenText = document.getElementById(
    "response-fullscreen-text"
  );
  els.responseFullscreenUnit = document.getElementById(
    "response-fullscreen-unit"
  );
  els.responseFullscreenClose = document.getElementById(
    "response-fullscreen-close"
  );
  els.responseSave = document.getElementById("response-save");
  els.responseDone = document.getElementById("response-done");

  // Response dialog
  els.responseDialog = document.getElementById("response-dialog");
  els.responseStage1 = document.getElementById("response-stage-1");
  els.responseStage2 = document.getElementById("response-stage-2");
  els.responsePhrase1 = document.getElementById("response-phrase-1");
  els.responsePhrase2 = document.getElementById("response-phrase-2");
  els.responseReady = document.getElementById("response-ready");
  els.responseCancel1 = document.getElementById("response-cancel-1");
  els.responseCancel2 = document.getElementById("response-cancel-2");
  els.responseSubmit = document.getElementById("response-submit");
  els.responseError = document.getElementById("response-error");

  els.responseInputNumber = document.getElementById("response-input-number");
  els.responseNumberInput = document.getElementById("response-number-input");
  els.responseNumberUnit = document.getElementById("response-number-unit");

  els.responseInputText = document.getElementById("response-input-text");
  els.responseTextInput = document.getElementById("response-text-input");

  els.responseInputYesno = document.getElementById("response-input-yesno");
  els.responseYes = document.getElementById("response-yes");
  els.responseNo = document.getElementById("response-no");

  els.responseInputDatetime = document.getElementById(
    "response-input-datetime"
  );
  els.responseDateInput = document.getElementById("response-date-input");
  els.responseTimeInput = document.getElementById("response-time-input");

  // Add dialog
  els.addDialog = document.getElementById("add-dialog");
  els.addForm = document.getElementById("add-form");
  els.addText = document.getElementById("add-text");
  els.addError = document.getElementById("add-error");

  // Favorite dialog
  els.favDialog = document.getElementById("fav-dialog");
  els.favForm = document.getElementById("fav-form");
  els.favDialogTitle = document.getElementById("fav-dialog-title");
  els.favLabel = document.getElementById("fav-label");
  els.favValue = document.getElementById("fav-value");
  els.favTags = document.getElementById("fav-tags");
  els.favError = document.getElementById("fav-error");

  // Confirm dialog
  els.confirmDialog = document.getElementById("confirm-dialog");
  els.confirmTitle = document.getElementById("confirm-title");
  els.confirmText = document.getElementById("confirm-text");
els.confirmOk = document.getElementById("confirm-ok");
els.confirmCancel = document.getElementById("confirm-cancel");
  // Tabs
  els.tabCards = document.getElementById("tab-cards");
  els.tabFavorites = document.getElementById("tab-favorites");
  els.tabMap = document.getElementById("tab-map");
  els.tabTranscribe = document.getElementById("tab-transcribe");

  // Δημιουργία tag buttons μια φορά
  if (els.favTags) {
    clear(els.favTags);

    TAGS.forEach((tag) => {
      const btn = h("button", "tag-btn");
      btn.type = "button";
      btn.dataset.tagId = tag.id;
      btn.setAttribute("aria-pressed", "false");

      btn.append(
        svgIcon(tag.iconId, "tag-btn-icon"),
        h("span", null, tag.label)
      );

      btn.addEventListener("click", onFavTagToggle);
      els.favTags.appendChild(btn);
    });
  }

  // Navigation
  els.back.addEventListener("click", goBack);

  els.fab.addEventListener("click", () => {
    if (currentView === VIEWS.FAVORITES) {
      openFavoriteDialog(null);
    } else {
      openCustomDialog();
    }
  });

  // Custom dialog
  els.addForm.addEventListener("submit", onAddCustomSubmit);

  const addCancel = document.getElementById("add-cancel");
  if (addCancel) {
    addCancel.addEventListener("click", () =>
      closeDialog(els.addDialog)
    );
  }

  // Favorite dialog
  els.favForm.addEventListener("submit", onFavSubmit);

  const favCancel = document.getElementById("fav-cancel");
  if (favCancel) {
    favCancel.addEventListener("click", () => {
      editingFavoriteId = null;
      closeDialog(els.favDialog);
    });
  }

  // Confirm dialog
  const confirmCancel = document.getElementById("confirm-cancel");
  if (confirmCancel) {
    confirmCancel.addEventListener("click", () =>
      closeDialog(els.confirmDialog)
    );
  }

  const confirmOk = document.getElementById("confirm-ok");
  if (confirmOk) {
    // Ο πραγματικός handler ορίζεται από askDelete
    confirmOk.addEventListener("click", () => {
      // Ο handler έχει ήδη οριστεί μέσω els.confirmOk.onclick
      // Δεν κάνουμε τίποτα εδώ.
    });
  }

  // Fullscreen listeners
  els.fullscreenClose.addEventListener("click", closeFullscreen);
  els.responseFullscreenClose.addEventListener("click", onResponseDone);
  els.responseSave.addEventListener("click", onResponseSave);
  els.responseDone.addEventListener("click", onResponseDone);

  // Response dialog listeners
  els.responseReady.addEventListener("click", onResponseReady);
  els.responseCancel1.addEventListener("click", () =>
    closeDialog(els.responseDialog)
  );
  els.responseCancel2.addEventListener("click", () =>
    closeDialog(els.responseDialog)
  );
  els.responseSubmit.addEventListener("click", onResponseSubmit);
  els.responseYes.addEventListener("click", onResponseYes);
  els.responseNo.addEventListener("click", onResponseNo);

  // Enter στο number input
  els.responseNumberInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onResponseSubmit();
    }
  });

  // Tabs
  els.tabCards.addEventListener("click", () => switchTab(TABS.CARDS));
  els.tabFavorites.addEventListener("click", () =>
    switchTab(TABS.FAVORITES)
  );
  els.tabMap.addEventListener("click", () => switchTab(TABS.MAP));
  els.tabTranscribe.addEventListener("click", () =>
    switchTab(TABS.TRANSCRIBE)
  );

  // Dialog close handlers
  els.addDialog.addEventListener("close", restoreFocusAfterDialog);
  els.favDialog.addEventListener("close", restoreFocusAfterDialog);
  els.confirmDialog.addEventListener("close", restoreFocusAfterDialog);
  els.responseDialog.addEventListener("close", restoreFocusAfterDialog);

  // Back button
  window.addEventListener("popstate", (event) => {
    const state = event.state || {};

    // Αν το fullscreen είναι ανοιχτό, το κλείνουμε ΚΑΙ επαναφέρουμε το state
    // ώστε ο χρήστης να μείνει στην ίδια οθόνη αντί να γυρίσει πίσω.
    if (els.fullscreen && !els.fullscreen.hidden) {
      closeFullscreen();
      history.pushState({ view: currentView }, "");
      return;
    }

    if (els.responseFullscreen && !els.responseFullscreen.hidden) {
      closeResponseFullscreen();
      history.pushState({ view: currentView }, "");
      return;
    }

    if (state.categoryId !== undefined) {
      currentComposerCategoryId = state.categoryId || null;
    }
    if (state.purposeId !== undefined) {
      currentComposerPurposeId = state.purposeId || null;
    }
    composerSelectedPrefix = "";

    const view = state.view;

    render(isKnownView(view) ? view : VIEWS.HOME, true);
  });

  history.replaceState({ view: VIEWS.HOME }, "");
  render(VIEWS.HOME, false);
}

// ─── Εκκίνηση εφαρμογής ───────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);