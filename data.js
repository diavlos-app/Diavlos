// Δίαυλος — data.js
// Περιεχόμενο καρτών + αποθήκευση προσωπικών καρτών (μόνο τοπικά, στη συσκευή).
//
// ΣΚΟΠΙΜΑ μόνο γενικές, σταθερές φράσεις επικοινωνίας — όχι συγκεκριμένα
// δικαιολογητικά ή κόστη που αλλάζουν συχνά και μπορεί να είναι λάθος.
// Το περιεχόμενο των καρτών είναι ενδεικτικό και θα επεκταθεί.

const CARD_CATEGORIES = [
  {
    id: "kep",
    name: "ΚΕΠ",
    icon: "🏛️",
    cards: [
      { id: "kep-1", text: "Θέλω να υποβάλω αίτηση." },
      { id: "kep-2", text: "Θέλω πιστοποιητικό. Ποια δικαιολογητικά χρειάζομαι;" },
      { id: "kep-3", text: "Πόσο θα κοστίσει αυτή η διαδικασία;" },
      { id: "kep-4", text: "Πόσες μέρες θα χρειαστούν;" },
      { id: "kep-5", text: "Μπορείτε να μου το γράψετε, παρακαλώ;" },
      { id: "kep-6", text: "Μπορείτε να μιλήσετε πιο αργά ή να το επαναλάβετε;" },
      { id: "kep-7", text: "Δεν κατάλαβα. Μπορείτε να το εξηγήσετε διαφορετικά;" },
      { id: "kep-8", text: "Ευχαριστώ, κατάλαβα." },
      { id: "kep-9", text: "Είμαι κωφός/κωφή. Θα επικοινωνήσουμε γραπτώς, σας παρακαλώ." }
    ]
  },
  {
    id: "general",
    name: "Γενικά",
    icon: "💬",
    cards: [
      { id: "gen-1", text: "Γεια σας, είμαι κωφός/κωφή. Μπορούμε να επικοινωνήσουμε γραπτώς;" },
      { id: "gen-2", text: "Παρακαλώ, γράψτε μου ό,τι θέλετε να πείτε." },
      { id: "gen-3", text: "Ευχαριστώ πολύ για την υπομονή σας." },
      { id: "gen-4", text: "Μια στιγμή, παρακαλώ, να το διαβάσω." },
      { id: "gen-5", text: "Συγγνώμη, μπορείτε να το επαναλάβετε γραπτώς;" }
    ]
  }
];

// ─── Προσωπικές κάρτες ────────────────────────────────────────────
// Αποθηκεύονται ΜΟΝΟ στο localStorage της συσκευής. Δεν στέλνονται πουθενά
// και δεν συνδέονται με λογαριασμό. Αν ο χρήστης καθαρίσει τα δεδομένα του
// browser ή απεγκαταστήσει την εφαρμογή, χάνονται.

const CUSTOM_CARDS_KEY = "diavlos_v1_custom_cards";
const CUSTOM_CARD_MAX_LENGTH = 300;

function readCustomCards() {
  try {
    const raw = localStorage.getItem(CUSTOM_CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Κρατάμε μόνο έγκυρες εγγραφές, ώστε ένα χαλασμένο αντικείμενο
    // να μην σπάει ολόκληρη την οθόνη.
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.text === "string"
    );
  } catch (e) {
    return [];
  }
}

function writeCustomCards(cards) {
  try {
    localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
    return true;
  } catch (e) {
    // Πλήρης χώρος ή ιδιωτική περιήγηση χωρίς αποθήκευση
    return false;
  }
}

function getCustomCards() {
  return readCustomCards();
}

// Επιστρέφει { ok: true } ή { ok: false, reason }
function saveCustomCard(text) {
  const clean = (text || "").trim();
  if (!clean) return { ok: false, reason: "empty" };
  if (clean.length > CUSTOM_CARD_MAX_LENGTH) return { ok: false, reason: "too-long" };

  const cards = readCustomCards();
  const id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  cards.push({ id: id, text: clean });
  return writeCustomCards(cards) ? { ok: true } : { ok: false, reason: "storage" };
}

function deleteCustomCard(id) {
  const cards = readCustomCards().filter((c) => c.id !== id);
  return writeCustomCards(cards);
}
