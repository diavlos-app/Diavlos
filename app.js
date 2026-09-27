// Δίαυλος — app.js
// Λογική εμφάνισης καρτών συζήτησης. Καμία εξωτερική εξάρτηση.

let currentCategory = null;

function init() {
  renderCategoryList();
  document.getElementById("add-custom-btn").addEventListener("click", showAddCustomForm);
  document.getElementById("back-btn").addEventListener("click", () => {
    currentCategory = null;
    renderCategoryList();
  });
}

function renderCategoryList() {
  const container = document.getElementById("content");
  document.getElementById("back-btn").hidden = true;
  document.getElementById("screen-title").textContent = "Κάρτες Συζήτησης";

  let html = '<div class="category-grid">';
  CARD_CATEGORIES.forEach(cat => {
    html += `
      <button class="category-card" data-id="${cat.id}">
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
      </button>`;
  });
  html += `
      <button class="category-card" data-id="custom">
        <span class="category-icon">⭐</span>
        <span class="category-name">Οι Κάρτες μου</span>
      </button>`;
  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".category-card").forEach(btn => {
    btn.addEventListener("click", () => openCategory(btn.dataset.id));
  });
}

function openCategory(id) {
  currentCategory = id;
  document.getElementById("back-btn").hidden = false;

  let cards, title;
  if (id === "custom") {
    cards = getCustomCards();
    title = "Οι Κάρτες μου";
  } else {
    const cat = CARD_CATEGORIES.find(c => c.id === id);
    cards = cat.cards;
    title = cat.name;
  }
  document.getElementById("screen-title").textContent = title;
  renderCards(cards, id === "custom");
}

function renderCards(cards, isCustom) {
  const container = document.getElementById("content");

  if (cards.length === 0 && isCustom) {
    container.innerHTML = `
      <p class="empty-state">Δεν έχεις προσθέσει ακόμα δικές σου κάρτες.</p>`;
    return;
  }

  let html = '<div class="card-list">';
  cards.forEach(card => {
    html += `
      <div class="phrase-card">
        <p class="phrase-text">${escapeHtml(card.text)}</p>
        <div class="phrase-actions">
          <button class="speak-btn" data-text="${escapeHtml(card.text)}" aria-label="Διάβασέ το δυνατά">
            🔊 Ανάγνωση
          </button>
          ${isCustom ? `<button class="delete-btn" data-id="${card.id}" aria-label="Διαγραφή">🗑️</button>` : ""}
        </div>
      </div>`;
  });
  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".speak-btn").forEach(btn => {
    btn.addEventListener("click", () => speakText(btn.dataset.text));
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteCustomCard(btn.dataset.id);
      openCategory("custom");
    });
  });
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Η συσκευή σου δεν υποστηρίζει ανάγνωση κειμένου.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "el-GR";
  window.speechSynthesis.cancel(); // stop any previous speech
  window.speechSynthesis.speak(utterance);
}

function showAddCustomForm() {
  const text = prompt("Γράψε τη φράση που θέλεις να προσθέσεις:");
  if (text && text.trim()) {
    saveCustomCard(text.trim());
    if (currentCategory === "custom") {
      openCategory("custom");
    } else {
      openCategory("custom");
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", init);
