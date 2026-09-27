// Δεδομένα καρτών συζήτησης — Δίαυλος
// Κάθε κατηγορία έχει: id, όνομα, εικονίδιο (emoji), και λίστα καρτών
// Κάθε κάρτα έχει: id, κείμενο
// ΣΚΟΠΙΜΑ μόνο γενικές, σταθερές φράσεις επικοινωνίας — όχι συγκεκριμένα
// δικαιολογητικά/κόστη που αλλάζουν συχνά και μπορεί να απαρχαιωθούν.

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

// Custom κάρτες του χρήστη — αποθηκεύονται ΤΟΠΙΚΑ στη συσκευή (localStorage),
// ποτέ σε server. Καμία σύνδεση με λογαριασμό ή ταυτότητα.
const CUSTOM_CARDS_KEY = "diavlos_custom_cards";

function getCustomCards() {
  try {
    const raw = localStorage.getItem(CUSTOM_CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomCard(text) {
  const cards = getCustomCards();
  cards.push({ id: "custom-" + Date.now(), text: text });
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
  return cards;
}

function deleteCustomCard(id) {
  const cards = getCustomCards().filter(c => c.id !== id);
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
  return cards;
}
