# Βιβλιοθήκες του service/ (τοπικά αντίγραφα)

Όλα τα αρχεία φορτώνονται από αυτόν τον φάκελο. Δεν υπάρχει CDN.
Όταν αλλάξει αρχείο εδώ, ανέβασε το CACHE στο sw.js.

| Αρχείο | Βιβλιοθήκη | Έκδοση | Άδεια | Πηγή (npm) |
|---|---|---|---|---|
| peerjs.min.js | PeerJS | 1.5.4 | MIT | peerjs@1.5.4, dist/peerjs.min.js |
| qrcode.min.js | qrcodejs | 1.0.0 | MIT | qrcodejs@1.0.0, qrcode.min.js |
| html2pdf.bundle.min.js | html2pdf.js | 0.10.1 | MIT | html2pdf.js@0.10.1, dist/html2pdf.bundle.min.js |
| icons-sprite.svg | Lucide (17 εικονίδια) | lucide-static 1.54.0 | ISC (+MIT για όσα προέρχονται από Feather) | lucide-static@1.54.0, icons/*.svg |

## SHA-384 (για έλεγχο ακεραιότητας)

- peerjs.min.js: sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR
- qrcode.min.js: sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU
- html2pdf.bundle.min.js: sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc

## Εικονίδια

Το icons-sprite.svg περιέχει 17 symbol με id της μορφής `i-όνομα`.
Χρήση: `<svg class="icon" aria-hidden="true"><use href="vendor/icons-sprite.svg#i-search"/></svg>`
Πάντα με ετικέτα κειμένου δίπλα. Χρώμα μέσω currentColor.

Λίστα: search, file-text, home, shield, briefcase, users, heart-pulse,
graduation-cap, sword, user, message-circle, qr-code, check, x, arrow-left,
rotate-ccw, zoom-in.

## Άδειες

LICENSE-peerjs.txt, LICENSE-qrcodejs.txt, LICENSE-html2pdf.txt,
LICENSE-html2pdf-bundle.txt (τρίτα components του bundle), LICENSE-lucide.txt.
