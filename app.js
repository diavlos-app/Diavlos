// Δίαυλος — app.js
// Οθόνες: αρχική, λίστες φράσεων, Έκτακτη Ανάγκη, Αγαπημένα, Ιστορικό, Χάρτης.
// Interactive response modal + PDF export + Leaflet + Overpass API.

"use strict";

// ─── Σταθερές ─────────────────────────────────────────────────────

const VIEWS = {
  HOME: "home",
  EMERGENCY_CALL: "emergency-call",
  EMERGENCY_FIELD: "emergency-field",
  CUSTOM: "custom",
  FAVORITES: "favorites",
  MAP: "map"
};

const TABS = { CARDS: "cards", FAVORITES: "favorites", MAP: "map" };
const FAV_TABS = { FAVORITES: "favorites", HISTORY: "history" };

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

// Κατηγορίες OSM (για Overpass API)
const OSM_CATEGORIES = {
  health: {
    label: "Υγεία",
    color: "#d32f2f",
    filter: '["amenity"~"^(pharmacy|hospital|clinic|doctors|dentist|veterinary)$"]'
  },
  services: {
    label: "Υπηρεσίες",
    color: "#2d6a4f",
    filter: '["amenity"~"^(bank|post_office|townhall|police|government|community_centre|courthouse)$"]'
  },
  food: {
    label: "Φαγητό",
    color: "#f57c00",
    filter: '["amenity"~"^(cafe|restaurant|fast_food|bar|pub|ice_cream)$"]'
  },
  shopping: {
    label: "Ψώνια",
    color: "#6d4c41",
    filter: '["shop"~"^(supermarket|convenience|bakery|butcher|greengrocer|clothes|electronics|shoes|florist|hairdresser)$"]'
  },
  culture: {
    label: "Πολιτισμός",
    color: "#8e24aa",
    filter: '["tourism"~"^(museum|attraction|gallery)$"]'
  },
  transport: {
    label: "Μεταφορές",
    color: "#0288d1",
    filter: '["public_transport"~"^(station|platform)$"]'
  }
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_RADIUS_M = 1500;
const OVERPASS_TIMEOUT_MS = 15000;

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

// Map state
let mapInstance = null;
let userMarker = null;
let curatedLayerGroup = null;
let osmLayerGroup = null;
let allOsmPois = [];
let currentMapFilter = "all";
let showOnlyDeafFriendly = false;
let userLocation = null;
let osmFetchInProgress = false;

const els = {};

// ─── DOM helpers ──────────────────────────────────────────────────

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
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

function clear(node) { node.replaceChildren(); }

function isKnownView(view) {
  if (view === VIEWS.HOME || view === VIEWS.CUSTOM || view === VIEWS.FAVORITES) return true;
  if (view === VIEWS.EMERGENCY_CALL || view === VIEWS.EMERGENCY_FIELD) return true;
  if (view === VIEWS.MAP) return true;
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

  let view = VIEWS.HOME;
  if (tab === TABS.FAVORITES) view = VIEWS.FAVORITES;
  else if (tab === TABS.MAP) view = VIEWS.MAP;

  history.replaceState({ view: view }, "");
  render(view, true);
}

function updateTabBar() {
  els.tabCards.classList.toggle("active", currentTab === TABS.CARDS);
  els.tabFavorites.classList.toggle("active", currentTab === TABS.FAVORITES);
  els.tabMap.classList.toggle("active", currentTab === TABS.MAP);

  if (currentTab === TABS.CARDS) {
    els.tabCards.setAttribute("aria-current", "page");
    els.tabFavorites.removeAttribute("aria-current");
    els.tabMap.removeAttribute("aria-current");
  } else if (currentTab === TABS.FAVORITES) {
    els.tabFavorites.setAttribute("aria-current", "page");
    els.tabCards.removeAttribute("aria-current");
    els.tabMap.removeAttribute("aria-current");
  } else {
    els.tabMap.setAttribute("aria-current", "page");
    els.tabCards.removeAttribute("aria-current");
    els.tabFavorites.removeAttribute("aria-current");
  }
}

function render(view, moveFocus) {
  currentView = view;

  const isTopLevel = (view === VIEWS.HOME || view === VIEWS.FAVORITES);
  els.headerLogo.hidden = !isTopLevel;
  els.headerSubtitle.hidden = !isTopLevel;
  els.back.hidden = isTopLevel;

  const showFab = (view === VIEWS.CUSTOM || (view === VIEWS.FAVORITES && currentFavTab === FAV_TABS.FAVORITES));
  els.fab.hidden = !showFab;
  els.fab.setAttribute(
    "aria-label",
    view === VIEWS.FAVORITES ? "Νέο Αγαπημένο" : "Προσθήκη κάρτας"
  );

  if (view === VIEWS.FAVORITES) currentTab = TABS.FAVORITES;
  else if (view === VIEWS.MAP) currentTab = TABS.MAP;
  else if (view === VIEWS.HOME || CARD_CATEGORIES.some((c) => c.id === view)) currentTab = TABS.CARDS;
  updateTabBar();

  if (view === VIEWS.HOME) renderHome();
  else if (view === VIEWS.EMERGENCY_CALL) renderEmergencyCall();
  else if (view === VIEWS.EMERGENCY_FIELD) renderEmergencyField();
  else if (view === VIEWS.CUSTOM) renderCustom();
  else if (view === VIEWS.FAVORITES) renderFavorites();
  else if (view === VIEWS.MAP) renderMap();
  else renderPhraseList(view);

  if (moveFocus) els.title.focus();
}

// ─── Αρχική ───────────────────────────────────────────────────────

function renderHome() {
  els.title.textContent = "Δίαυλος";
  const frag = document.createDocumentFragment();

  frag.appendChild(emergencyCard());

  const grid = h("div", "category-grid");
  CARD_CATEGORIES.forEach((cat) => {
    if (cat.id === "emergency") return;
    grid.appendChild(categoryButton(cat.iconId, cat.name, cat.id));
  });
  frag.appendChild(grid);

  clear(els.content);
  els.content.appendChild(frag);
}

function emergencyCard() {
  const wrap = h("div", "emergency-card");

  const header = h("div", "emergency-header");
  header.appendChild(h("span", "emergency-title", "SOS"));
  header.appendChild(h("span", "emergency-subtitle", "ΕΚΤΑΚΤΗ ΑΝΑΓΚΗ"));
  wrap.appendChild(header);

  const actions = h("div", "emergency-actions");

  const smsBtn = h("button", "btn-emergency-sms", "SMS");
  smsBtn.type = "button";
  smsBtn.addEventListener("click", () => navigateTo(VIEWS.EMERGENCY_CALL));

  const fieldBtn = h("button", "btn-emergency-field", "ΝΑΙ / ΟΧΙ");
  fieldBtn.type = "button";
  fieldBtn.addEventListener("click", () => navigateTo(VIEWS.EMERGENCY_FIELD));

  actions.append(smsBtn, fieldBtn);
  wrap.appendChild(actions);

  return wrap;
}

function categoryButton(iconId, name, view) {
  const btn = h("button", "category-card");
  btn.type = "button";
  btn.append(svgIcon(iconId, "category-icon"), h("span", "category-name", name));
  btn.addEventListener("click", () => navigateTo(view));
  return btn;
}

// ─── Χάρτης ──────────────────────────────────────────────────────

function renderMap() {
  els.title.textContent = "Χάρτης";

  if (typeof L === "undefined") {
    clear(els.content);
    els.content.appendChild(
      h("p", "empty-state",
        "Ο χάρτης χρειάζεται σύνδεση στο internet την πρώτη φορά που ανοίγει. Δοκίμασε ξανά όταν συνδεθείς.")
    );
    return;
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(renderMapFilters());

  const mapContainer = h("div", "map-container");
  mapContainer.id = "map";
  frag.appendChild(mapContainer);

  clear(els.content);
  els.content.appendChild(frag);

  // Destroy προηγούμενου instance
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    userMarker = null;
    curatedLayerGroup = null;
    osmLayerGroup = null;
  }

  // Δημιουργία χάρτη
  mapInstance = L.map("map", {
    zoomControl: false,
    attributionControl: true
  }).setView([37.9838, 23.7275], 13);

  L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxZoom: 19
  }).addTo(mapInstance);

  // Layer groups
  curatedLayerGroup = L.layerGroup().addTo(mapInstance);
  osmLayerGroup = L.layerGroup().addTo(mapInstance);

  // Curated markers
  renderCuratedMarkers();

  // Κέντρο στη θέση του χρήστη
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocation = { lat: latitude, lng: longitude };

        if (mapInstance) mapInstance.setView([latitude, longitude], 15);

        userMarker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: "#2d6a4f",
          color: "#ffffff",
          weight: 3,
          fillOpacity: 1
        }).addTo(mapInstance);

        userMarker.bindPopup("Είσαι εδώ").openPopup();

        fetchOverpassPois();
      },
      () => {
        showToast("Δεν δόθηκε άδεια τοποθεσίας. Δείχνουμε την Αθήνα.");
        userLocation = { lat: 37.9838, lng: 23.7275 };
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }
}

// ─── Map filters ─────────────────────────────────────────────────

function renderMapFilters() {
  const wrap = h("div", "map-filters-wrap");

  // Category chips
  const chipsBar = h("div", "map-filter-bar");

  const allChip = h("button", "map-filter-chip" + (currentMapFilter === "all" ? " map-filter-chip-active" : ""), "Όλα");
  allChip.type = "button";
  allChip.dataset.filterId = "all";
  allChip.addEventListener("click", () => handleFilterChange("all"));
  chipsBar.appendChild(allChip);

  Object.keys(OSM_CATEGORIES).forEach((key) => {
    const cat = OSM_CATEGORIES[key];
    const chip = h("button", "map-filter-chip" + (currentMapFilter === key ? " map-filter-chip-active" : ""), cat.label);
    chip.type = "button";
    chip.dataset.filterId = key;
    chip.addEventListener("click", () => handleFilterChange(key));
    chipsBar.appendChild(chip);
  });

  wrap.appendChild(chipsBar);

  // Deaf-friendly toggle
  const toggleBar = h("div", "map-toggle-bar");
  const toggleBtn = h("button", "map-toggle" + (showOnlyDeafFriendly ? " map-toggle-active" : ""));
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-pressed", showOnlyDeafFriendly ? "true" : "false");
  toggleBtn.append(svgIcon("icon-star", "map-toggle-icon"), h("span", null, "Deaf-friendly"));
  toggleBtn.addEventListener("click", () => {
    showOnlyDeafFriendly = !showOnlyDeafFriendly;
    toggleBtn.classList.toggle("map-toggle-active", showOnlyDeafFriendly);
    toggleBtn.setAttribute("aria-pressed", showOnlyDeafFriendly ? "true" : "false");
    updateMapDisplay();
  });
  toggleBar.appendChild(toggleBtn);
  wrap.appendChild(toggleBar);

  return wrap;
}

function handleFilterChange(catKey) {
  currentMapFilter = catKey;

  const chips = els.content.querySelectorAll(".map-filter-chip");
  chips.forEach((chip) => {
    chip.classList.toggle("map-filter-chip-active", chip.dataset.filterId === catKey);
  });

  updateMapDisplay();
}

function updateMapDisplay() {
  renderCuratedMarkers();

  if (showOnlyDeafFriendly) {
    if (osmLayerGroup) osmLayerGroup.clearLayers();
  } else {
    if (allOsmPois.length === 0) {
      fetchOverpassPois();
    } else {
      renderOsmMarkers();
    }
  }
}

// ─── Curated markers ─────────────────────────────────────────────

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

function renderCuratedMarkers() {
  if (!curatedLayerGroup || typeof MAP_LOCATIONS === "undefined") return;

  curatedLayerGroup.clearLayers();

  MAP_LOCATIONS.forEach((loc) => {
    if (!loc.coords || !loc.coords.lat || !loc.coords.lng) return;

    // Φίλτρο κατηγορίας: οι κατηγορίες curated δεν ταιριάζουν 1:1 με OSM
    // Οπότε δεν φιλτράρουμε τα curated — φαίνονται πάντα όταν δεν είναι deaf-only
    const color = getCategoryColor(loc.category);

    const marker = L.circleMarker([loc.coords.lat, loc.coords.lng], {
      radius: 8,
      fillColor: color,
      color: "#ffffff",
      weight: 2.5,
      fillOpacity: 1
    });

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

// ─── Overpass API ───────────────────────────────────────────────

function buildOverpassQuery(lat, lng) {
  const r = OVERPASS_RADIUS_M;
  let body = "";

  Object.keys(OSM_CATEGORIES).forEach((key) => {
    const filter = OSM_CATEGORIES[key].filter;
    body += `node${filter}(around:${r},${lat},${lng});`;
    body += `way${filter}(around:${r},${lat},${lng});`;
  });

  return `[out:json][timeout:15];(${body});out center 300;`;
}

function fetchOverpassPois() {
  if (osmFetchInProgress) return;
  if (showOnlyDeafFriendly) return;
  if (!userLocation) return;

  osmFetchInProgress = true;
  showToast("Φόρτωση σημείων γύρω σου...");

  const query = buildOverpassQuery(userLocation.lat, userLocation.lng);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

  fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
    signal: controller.signal
  })
    .then((res) => {
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      allOsmPois = parseOverpassElements(data.elements || []);
      renderOsmMarkers();
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      console.warn("Overpass error:", err);
      showToast("Δεν φορτώθηκαν τα σημεία. Δοκίμασε ξανά.");
    })
    .finally(() => {
      osmFetchInProgress = false;
    });
}

function parseOverpassElements(elements) {
  return elements.map((item) => {
    const tags = item.tags || {};
    const lat = item.lat || (item.center ? item.center.lat : null);
    const lon = item.lon || (item.center ? item.center.lon : null);

    if (!lat || !lon) return null;

    // Κατηγοριοποίηση
    let category = null;
    const amenity = tags.amenity || "";
    const shop = tags.shop || "";
    const tourism = tags.tourism || "";
    const pt = tags.public_transport || "";

    if (/^(pharmacy|hospital|clinic|doctors|dentist|veterinary)$/.test(amenity)) category = "health";
    else if (/^(bank|post_office|townhall|police|government|community_centre|courthouse)$/.test(amenity)) category = "services";
    else if (/^(cafe|restaurant|fast_food|bar|pub|ice_cream)$/.test(amenity)) category = "food";
    else if (shop) category = "shopping";
    else if (/^(museum|attraction|gallery)$/.test(tourism)) category = "culture";
    else if (/^(station|platform)$/.test(pt)) category = "transport";

    if (!category) return null;

    return {
      id: item.id,
      lat: lat,
      lon: lon,
      category: category,
      tags: tags
    };
  }).filter(Boolean);
}

function renderOsmMarkers() {
  if (!osmLayerGroup) return;

  osmLayerGroup.clearLayers();

  if (showOnlyDeafFriendly) return;

  const filtered = currentMapFilter === "all"
    ? allOsmPois
    : allOsmPois.filter((poi) => poi.category === currentMapFilter);

  filtered.forEach((poi) => {
    const cat = OSM_CATEGORIES[poi.category];
    if (!cat) return;

    const marker = L.circleMarker([poi.lat, poi.lon], {
      radius: 5,
      fillColor: cat.color,
      color: "#ffffff",
      weight: 1.5,
      fillOpacity: 0.7
    });

    marker.bindPopup(buildOsmPopup(poi), {
      maxWidth: 280,
      minWidth: 200,
      closeButton: true,
      autoPan: true
    });

    osmLayerGroup.addLayer(marker);
  });
}

function buildOsmPopup(poi) {
  const wrap = h("div", "map-popup map-popup-osm");
  const tags = poi.tags || {};

  const header = h("div", "map-popup-header");
  header.appendChild(h("h3", "map-popup-title", tags.name || getPoiCategoryLabel(poi)));

  const cat = OSM_CATEGORIES[poi.category];
  if (cat) {
    const meta = h("p", "map-popup-meta");
    meta.textContent = cat.label;
    header.appendChild(meta);
  }
  wrap.appendChild(header);

  // Διεύθυνση
  const address = buildOsmAddress(tags);
  if (address) {
    wrap.appendChild(h("p", "map-popup-address", address));
  }

  // Ώρες
  if (tags.opening_hours) {
    wrap.appendChild(h("p", "map-popup-hours", "🕐 " + tags.opening_hours));
  }

  // Τηλέφωνο
  const phone = tags.phone || tags["contact:phone"];
  if (phone) {
    const link = h("a", "map-popup-phone", "📞 " + phone);
    link.href = "tel:" + phone.replace(/\s/g, "");
    wrap.appendChild(link);
  }

  // Website
  const site = tags.website || tags["contact:website"];
  if (site) {
    const link = h("a", "map-popup-website", "🔗 Ιστοσελίδα");
    link.href = site.startsWith("http") ? site : "https://" + site;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    wrap.appendChild(link);
  }

  // Disclaimer
  wrap.appendChild(h("p", "map-popup-osm-note",
    "Δεν έχει επιβεβαιωθεί deaf-friendly. Δεδομένα από OpenStreetMap."));

  return wrap;
}

function buildOsmAddress(tags) {
  const parts = [];
  if (tags["addr:street"]) {
    let line = tags["addr:street"];
    if (tags["addr:housenumber"]) line += " " + tags["addr:housenumber"];
    parts.push(line);
  }
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  return parts.join(", ");
}

function getPoiCategoryLabel(poi) {
  const tags = poi.tags || {};
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const tourism = tags.tourism || "";

  const labels = {
    pharmacy: "Φαρμακείο", hospital: "Νοσοκομείο", clinic: "Κλινική",
    doctors: "Ιατρείο", dentist: "Οδοντίατρος", veterinary: "Κτηνίατρος",
    bank: "Τράπεζα", post_office: "Ταχυδρομείο", townhall: "Δημαρχείο",
    police: "Αστυνομία", government: "Δημόσια Υπηρεσία",
    community_centre: "Κέντρο Κοινότητας", courthouse: "Δικαστήριο",
    cafe: "Καφετέρια", restaurant: "Εστιατόριο", fast_food: "Fast Food",
    bar: "Μπαρ", pub: "Παμπ", ice_cream: "Παγωτά",
    supermarket: "Σούπερ Μάρκετ", convenience: "Μίνι Μάρκετ",
    bakery: "Φούρνος", butcher: "Κρεοπωλείο", greengrocer: "Μανάβικο",
    clothes: "Ρούχα", electronics: "Ηλεκτρονικά", shoes: "Παπούτσια",
    florist: "Ανθοπωλείο", hairdresser: "Κομμωτήριο",
    museum: "Μουσείο", attraction: "Αξιοθέατο", gallery: "Γκαλερί"
  };

  if (amenity && labels[amenity]) return labels[amenity];
  if (shop && labels[shop]) return labels[shop];
  if (tourism && labels[tourism]) return labels[tourism];
  if (tags.public_transport === "station") return "Σταθμός";
  if (tags.public_transport === "platform") return "Στάση";
  return "Σημείο Ενδιαφέροντος";
}

// ─── Emergency SMS ────────────────────────────────────────────────

function renderEmergencyCall() {
  els.title.textContent = "SMS Έκτακτης Ανάγκης";

  const note = h("p", "emergency-note",
    "Ποτέ κλήση. Διάλεξε τι χρειάζεσαι· θα ανοίξει έτοιμο SMS προς το 112, " +
    "με την τοποθεσία σου αν το επιτρέψεις."
  );

  const list = h("div", "emergency-numbers");
  EMERGENCY_SERVICES.forEach((item) => {
    const btn = h("button", "emergency-number-btn");
    btn.type = "button";
    btn.append(
      svgIcon(item.iconId, "emergency-number-icon"),
      h("span", "emergency-number-label", item.label)
    );
    btn.addEventListener("click", () => composeEmergencySms(item.label));
    list.appendChild(btn);
  });

  clear(els.content);
  els.content.append(note, list);
}

function buildEmergencySmsBody(serviceLabel, locationLine) {
  let body = "Είμαι κωφός/κωφή. Χρειάζομαι: " + serviceLabel + ".";
  if (locationLine) body += " " + locationLine;
  return body;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

function openEmergencySms(body) {
  const sep = isIOSDevice() ? "&" : "?";
  window.location.href = "sms:" + EMERGENCY_SMS_NUMBER + sep + "body=" + encodeURIComponent(body);
}

function composeEmergencySms(serviceLabel) {
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
    { timeout: EMERGENCY_GEOLOCATION_TIMEOUT_MS, maximumAge: 60000 }
  );
}

// ─── Emergency field ──────────────────────────────────────────────

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
  yesBtn.append(svgIcon("icon-check", "yesno-icon"), h("span", "yesno-label", "ΝΑΙ"));

  const noBtn = h("button", "yesno-btn yesno-no");
  noBtn.type = "button";
  noBtn.setAttribute("aria-label", "Όχι");
  noBtn.append(svgIcon("icon-close", "yesno-icon"), h("span", "yesno-label", "ΟΧΙ"));

  yesBtn.addEventListener("click", () => openFullscreen("ΝΑΙ"));
  noBtn.addEventListener("click", () => openFullscreen("ΟΧΙ"));

  yesNo.append(yesBtn, noBtn);

  const phraseTitle = h("h2", "field-phrases-title", "Γρήγορες φράσεις");
  const phraseList = h("div", "card-list");
  EMERGENCY_FIELD_PHRASES.forEach((card) => {
    phraseList.appendChild(phraseCard(card, false, false));
  });

  clear(els.content);
  els.content.append(note, header, yesNo, phraseTitle, phraseList);
}
// ─── Λίστα φράσεων ────────────────────────────────────────────────

function renderPhraseList(view) {
  const cat = CARD_CATEGORIES.find((c) => c.id === view);
  if (!cat) return;

  els.title.textContent = cat.name;
  const list = h("div", "card-list");
  cat.cards.forEach((card) => {
    list.appendChild(phraseCard(card, false, true, cat));
  });

  clear(els.content);
  els.content.appendChild(list);
}

// ─── «Οι Κάρτες μου» ──────────────────────────────────────────────

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
  cards.forEach((card) => list.appendChild(phraseCard(card, true, true, null)));

  clear(els.content);
  els.content.appendChild(list);
}

// ─── Αγαπημένα + Ιστορικό ─────────────────────────────────────────

function renderFavorites() {
  els.title.textContent = currentFavTab === FAV_TABS.HISTORY ? "Ιστορικό" : "Αγαπημένα";

  const frag = document.createDocumentFragment();
  frag.appendChild(favoritesSegmented());

  if (currentFavTab === FAV_TABS.FAVORITES) {
    renderFavoritesList(frag);
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
  favBtn.setAttribute("aria-selected", currentFavTab === FAV_TABS.FAVORITES ? "true" : "false");
  favBtn.addEventListener("click", () => {
    if (currentFavTab === FAV_TABS.FAVORITES) return;
    currentFavTab = FAV_TABS.FAVORITES;
    renderFavorites();
  });

  const histBtn = h("button");
  histBtn.type = "button";
  histBtn.append(svgIcon("icon-history", null), h("span", null, "Ιστορικό"));
  histBtn.classList.toggle("active", currentFavTab === FAV_TABS.HISTORY);
  histBtn.setAttribute("role", "tab");
  histBtn.setAttribute("aria-selected", currentFavTab === FAV_TABS.HISTORY ? "true" : "false");
  histBtn.addEventListener("click", () => {
    if (currentFavTab === FAV_TABS.HISTORY) return;
    currentFavTab = FAV_TABS.HISTORY;
    renderFavorites();
  });

  seg.append(favBtn, histBtn);
  return seg;
}

// ─── Αγαπημένα λίστα ──────────────────────────────────────────────

function renderFavoritesList(frag) {
  const favorites = sortFavoritesAlphabetically(getFavorites());
  frag.appendChild(favoritesFilterBar());

  if (favorites.length === 0) {
    frag.appendChild(
      h("p", "empty-state",
        "Δεν έχεις ακόμα αγαπημένα. Πάτα το + για να προσθέσεις στοιχεία όπως ΑΦΜ, διεύθυνση ή τον καφέ σου.")
    );
    return;
  }

  const filtered = filterFavoritesByTags(favorites, selectedTags);

  if (filtered.length === 0) {
    frag.appendChild(h("p", "empty-state", "Κανένα αποτέλεσμα με τα επιλεγμένα φίλτρα."));
    return;
  }

  const list = h("div", "favorites-list");
  filtered.forEach((fav) => list.appendChild(favoriteRow(fav)));
  frag.appendChild(list);
}

function favoritesFilterBar() {
  const bar = h("div", "filter-bar");

  const allBtn = h("button", "filter-chip" + (selectedTags.length === 0 ? " filter-chip-active" : ""), "Όλα");
  allBtn.type = "button";
  allBtn.setAttribute("aria-pressed", selectedTags.length === 0 ? "true" : "false");
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
    chip.append(svgIcon(tag.iconId, "filter-chip-icon"), h("span", null, tag.label));
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
  delBtn.addEventListener("click", () => askDelete("favorite", fav.id, fav.label, delBtn));

  actions.append(editBtn, delBtn);
  row.append(main, actions);
  return row;
}

// ─── Ιστορικό λίστα ───────────────────────────────────────────────

function renderHistoryList(frag) {
  const all = getResponses();
  const filtered = filterResponsesByDate(all, currentHistoryFilter);

  frag.appendChild(historyToolbar(filtered.length));

  if (all.length === 0) {
    frag.appendChild(
      h("p", "empty-state",
        "Δεν έχεις ακόμα αποθηκευμένες απαντήσεις. Όταν χρησιμοποιήσεις μια κάρτα με «Απάντηση» και πατήσεις «Αποθήκευση», θα εμφανιστεί εδώ.")
    );
    return;
  }

  if (filtered.length === 0) {
    frag.appendChild(h("p", "empty-state", "Καμία απάντηση σε αυτό το διάστημα."));
    return;
  }

  const list = h("div", "history-list");
  filtered.forEach((resp) => list.appendChild(historyRow(resp)));
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
    const chip = h("button", "history-date-chip" + (currentHistoryFilter === c.id ? " active" : ""), c.label);
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
  exportBtn.append(svgIcon("icon-download", null), h("span", null, "PDF"));
  exportBtn.disabled = visibleCount === 0;
  if (visibleCount === 0) exportBtn.style.opacity = "0.4";
  exportBtn.addEventListener("click", () => exportHistoryToPdf());

  bar.append(filters, exportBtn);
  return bar;
}

function historyRow(resp) {
  const row = h("div", "history-row");

  const main = h("button", "history-main");
  main.type = "button";
  main.addEventListener("click", () => {
    openResponseFullscreen(resp.phrase, resp.response, resp.responseType, resp.unit, true);
  });

  const meta = h("div", "history-meta");
  if (resp.categoryName) {
    meta.appendChild(h("span", "history-category", resp.categoryName));
  }
  meta.appendChild(h("span", "history-time", formatDateTimeShort(resp.timestamp)));
  main.appendChild(meta);

  main.appendChild(h("span", "history-phrase", resp.phrase));
  main.appendChild(h("span", "history-response", formatResponseForDisplay(resp)));

  const actions = h("div", "favorite-actions");

  const delBtn = h("button", "icon-btn icon-btn-danger", "");
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Διαγραφή απάντησης");
  delBtn.appendChild(svgIcon("icon-trash", "icon-btn-icon"));
  delBtn.addEventListener("click", () => askDelete("response", resp.id, resp.phrase, delBtn));

  actions.appendChild(delBtn);
  row.append(main, actions);
  return row;
}

// ─── Κάρτα φράσης ─────────────────────────────────────────────────

function phraseCard(card, isCustom, showFavorite, category) {
  const wrap = h("div", "phrase-card");
  wrap.appendChild(h("p", "phrase-text", card.text));

  const actions = h("div", "phrase-actions");

  const speakBtn = h("button", "speak-btn");
  speakBtn.type = "button";
  speakBtn.append(svgIcon("icon-speak", "btn-icon"), h("span", "btn-label", "Ανάγνωση"));
  speakBtn.setAttribute("aria-label", "Ανάγνωση φωνητικά");
  speakBtn.addEventListener("click", () => speak(card.text));
  actions.appendChild(speakBtn);

  const showBtn = h("button", "show-btn");
  showBtn.type = "button";
  showBtn.append(svgIcon("icon-show", "btn-icon"), h("span", "btn-label", "Εμφάνιση"));
  showBtn.setAttribute("aria-label", "Εμφάνιση σε μεγάλα γράμματα");
  showBtn.addEventListener("click", () => openFullscreen(card.text));
  actions.appendChild(showBtn);

  if (card.response) {
    const replyBtn = h("button", "reply-btn");
    replyBtn.type = "button";
    replyBtn.append(svgIcon("icon-reply", "btn-icon"), h("span", "btn-label", "Απάντηση"));
    replyBtn.setAttribute("aria-label", "Άνοιξε για απάντηση από τον συνομιλητή");
    replyBtn.addEventListener("click", () => openResponseDialog(card, category));
    actions.appendChild(replyBtn);
  }

  if (showFavorite) {
    const favBtn = h("button", "fav-btn");
    favBtn.type = "button";
    favBtn.setAttribute("aria-label", "Αποθήκευση στα Αγαπημένα");
    favBtn.appendChild(svgIcon("icon-star", "btn-icon"));
    favBtn.addEventListener("click", () => quickSaveFavorite(card.text, favBtn));
    actions.appendChild(favBtn);
  }

  if (isCustom) {
    const delBtn = h("button", "delete-btn");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", "Διαγραφή κάρτας");
    delBtn.appendChild(svgIcon("icon-trash", "btn-icon"));
    delBtn.addEventListener("click", () => askDelete("custom", card.id, card.text, delBtn));
    actions.appendChild(delBtn);
  }

  wrap.appendChild(actions);
  return wrap;
}

// ─── Fullscreen (φράσεις/αγαπημένα) ───────────────────────────────

function openFullscreen(text, label) {
  els.fullscreenLabel.textContent = label || "";
  els.fullscreenLabel.hidden = !label;
  els.fullscreenText.textContent = text;
  els.fullscreen.hidden = false;
  setBackgroundInert(true);
  document.addEventListener("keydown", onFullscreenKeydown);
  els.fullscreenClose.focus();
}

function closeFullscreen() {
  els.fullscreen.hidden = true;
  setBackgroundInert(false);
  document.removeEventListener("keydown", onFullscreenKeydown);
}

function onFullscreenKeydown(event) {
  if (event.key === "Escape") {
    if (!els.responseFullscreen.hidden) closeResponseFullscreen();
    else if (!els.fullscreen.hidden) closeFullscreen();
  }
}

function setBackgroundInert(on) {
  [els.header, els.content, els.fab, els.tabbarEl].forEach((el) => {
    if (!el) return;
    if (on) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  });
}

// ─── Response dialog ──────────────────────────────────────────────

function openResponseDialog(card, category) {
  pendingResponseCard = card;
  pendingResponseCategory = category;
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

  openDialog(els.responseDialog, els.fab);
  els.responseReady.focus();
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

  openResponseFullscreen(phrase, value, type, unit);
}

// ─── Response fullscreen ──────────────────────────────────────────

function openResponseFullscreen(phrase, value, type, unit, fromHistory) {
  els.responseFullscreenPhrase.textContent = phrase;
  els.responseFullscreenText.textContent = formatResponseForFullscreen(value, type);

  if (type === "number" && unit) {
    els.responseFullscreenUnit.textContent = unit;
    els.responseFullscreenUnit.hidden = false;
  } else {
    els.responseFullscreenUnit.textContent = "";
    els.responseFullscreenUnit.hidden = true;
  }

  // Από το Ιστορικό είναι απλή προβολή: κρύβουμε το "Αποθήκευση"
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
  const categoryName = pendingResponseCategory ? pendingResponseCategory.name : "";
  const unit = pendingResponseCard ? (pendingResponseCard.unit || "") : "";

  const result = saveResponse(
    phrase,
    currentResponseValue,
    currentResponseType,
    unit,
    categoryId,
    categoryName
  );

  if (!result.ok) {
    showToast("Δεν ήταν δυνατή η αποθήκευση.");
    return;
  }

  pendingResponseCard = null;
  pendingResponseCategory = null;
  currentResponseValue = null;
  currentResponseType = null;

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
  const num = parseFloat(String(value).replace(",", "."));
  if (isNaN(num)) return value;
  return num.toFixed(2).replace(".", ",");
}

function formatDateTimeValue(value) {
  if (!value) return "";
  const parts = value.split(" ");
  const date = parts[0] || "";
  const time = parts[1] || "";

  let dateFormatted = "";
  if (date && date.indexOf("-") !== -1) {
    const [y, m, d] = date.split("-");
    if (y && m && d) dateFormatted = d + "/" + m + "/" + y;
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
  const months = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
                  "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + ", " + hours + ":" + mins;
}

// ─── PDF Export ───────────────────────────────────────────────────

function exportHistoryToPdf() {
  const all = getResponses();
  const responses = filterResponsesByDate(all, currentHistoryFilter);

  if (responses.length === 0) {
    showToast("Δεν υπάρχουν απαντήσεις για εξαγωγή.");
    return;
  }

  buildPrintArea({
    title: "Ιστορικό Απαντήσεων",
    cards: responses.map((r) => ({
      category: r.categoryName,
      meta: formatDateTimeLong(r.timestamp),
      question: r.phrase,
      answer: formatResponseForDisplay(r)
    }))
  });

  window.print();
  setTimeout(() => { els.printArea.replaceChildren(); }, 500);
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
  setTimeout(() => { els.printArea.replaceChildren(); }, 500);
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
    if (c.category) {
      meta.appendChild(h("span", "print-card-category", c.category));
    } else {
      meta.appendChild(h("span", "print-card-category", ""));
    }
    meta.appendChild(h("span", "print-card-time", c.meta || ""));
    card.appendChild(meta);

    const box = h("div", "print-box");
    box.appendChild(h("p", "print-question", c.question));
    box.appendChild(h("p", "print-answer", c.answer));
    card.appendChild(box);

    area.appendChild(card);
  });

  const footer = h("div", "print-footer");
  footer.appendChild(h("p", null, "Δημιουργήθηκε από την εφαρμογή Δίαυλος"));
  footer.appendChild(h("p", null, "diavlos-app.github.io"));
  area.appendChild(footer);
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

// ─── Διάλογος: Αγαπημένο ─────────────────────────────────────────

function openFavoriteDialog(favorite) {
  editingFavoriteId = favorite ? favorite.id : null;

  els.favDialogTitle.textContent = favorite ? "Επεξεργασία" : "Νέο Αγαπημένο";
  els.favLabel.value = favorite ? favorite.label : "";
  els.favValue.value = favorite ? favorite.value : "";
  els.favError.hidden = true;

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

  const wasEditing = editingFavoriteId !== null;
  closeDialog(els.favDialog);
  editingFavoriteId = null;
  render(VIEWS.FAVORITES, false);
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
  els.confirmText.textContent = text;
  openDialog(els.confirmDialog, opener);
}

function onConfirmDelete() {
  if (!pendingDelete) return;

  let ok;
  if (pendingDelete.type === "custom") {
    ok = deleteCustomCard(pendingDelete.id);
  } else if (pendingDelete.type === "favorite") {
    ok = deleteFavorite(pendingDelete.id);
  } else {
    ok = deleteResponse(pendingDelete.id);
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
  els.content = document.getElementById("content");
  els.title = document.getElementById("screen-title");
  els.back = document.getElementById("back-btn");
  els.fab = document.getElementById("add-custom-btn");
  els.toast = document.getElementById("toast");
  els.headerLogo = document.getElementById("header-logo");
  els.headerSubtitle = document.getElementById("header-subtitle");
  els.header = document.querySelector("header");
  els.tabbarEl = document.querySelector(".tabbar");

  els.printArea = document.getElementById("print-area");

  els.fullscreen = document.getElementById("fullscreen");
  els.fullscreenLabel = document.getElementById("fullscreen-label");
  els.fullscreenText = document.getElementById("fullscreen-text");
  els.fullscreenClose = document.getElementById("fullscreen-close");

  els.responseFullscreen = document.getElementById("response-fullscreen");
  els.responseFullscreenPhrase = document.getElementById("response-fullscreen-phrase");
  els.responseFullscreenText = document.getElementById("response-fullscreen-text");
  els.responseFullscreenUnit = document.getElementById("response-fullscreen-unit");
  els.responseFullscreenClose = document.getElementById("response-fullscreen-close");
  els.responseSave = document.getElementById("response-save");
  els.responseDone = document.getElementById("response-done");

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

  els.responseInputDatetime = document.getElementById("response-input-datetime");
  els.responseDateInput = document.getElementById("response-date-input");
  els.responseTimeInput = document.getElementById("response-time-input");

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

  els.tabCards = document.getElementById("tab-cards");
  els.tabFavorites = document.getElementById("tab-favorites");
  els.tabMap = document.getElementById("tab-map");

  TAGS.forEach((tag) => {
    const btn = h("button", "tag-btn");
    btn.type = "button";
    btn.dataset.tagId = tag.id;
    btn.setAttribute("aria-pressed", "false");
    btn.append(svgIcon(tag.iconId, "tag-btn-icon"), h("span", null, tag.label));
    btn.addEventListener("click", onFavTagToggle);
    els.favTags.appendChild(btn);
  });

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
  els.responseFullscreenClose.addEventListener("click", onResponseDone);
  els.responseSave.addEventListener("click", onResponseSave);
  els.responseDone.addEventListener("click", onResponseDone);

  els.responseReady.addEventListener("click", onResponseReady);
  els.responseCancel1.addEventListener("click", () => closeDialog(els.responseDialog));
  els.responseCancel2.addEventListener("click", () => closeDialog(els.responseDialog));
  els.responseSubmit.addEventListener("click", onResponseSubmit);
  els.responseYes.addEventListener("click", onResponseYes);
  els.responseNo.addEventListener("click", onResponseNo);

  els.responseNumberInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onResponseSubmit();
    }
  });

  els.tabCards.addEventListener("click", () => switchTab(TABS.CARDS));
  els.tabFavorites.addEventListener("click", () => switchTab(TABS.FAVORITES));
  els.tabMap.addEventListener("click", () => switchTab(TABS.MAP));

  els.addDialog.addEventListener("close", restoreFocusAfterDialog);
  els.favDialog.addEventListener("close", restoreFocusAfterDialog);
  els.confirmDialog.addEventListener("close", restoreFocusAfterDialog);
  els.responseDialog.addEventListener("close", restoreFocusAfterDialog);

  window.addEventListener("popstate", (event) => {
    const view = event.state && event.state.view;
    render(isKnownView(view) ? view : VIEWS.HOME, true);
  });

  history.replaceState({ view: VIEWS.HOME }, "");
  render(VIEWS.HOME, false);
}

document.addEventListener("DOMContentLoaded", init); 