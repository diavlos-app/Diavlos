// Δίαυλος — transcribe.js
// Μεταγραφή ομιλίας σε κείμενο (ελληνικά) μέσω /api/transcribe.
//
// Πώς δουλεύει:
//  1. Ακούει το μικρόφωνο συνεχώς.
//  2. Όταν ο ομιλητής κάνει παύση (~0,7 δευτ.), κόβει τη φράση.
//  3. Τη στέλνει ως μικρό WAV στον server και δείχνει το κείμενο.
// Ο ήχος και το κείμενο ΔΕΝ αποθηκεύονται στη συσκευή.

"use strict";

const TRANSCRIBE_ENDPOINT = "/api/transcribe";

const TX = {
  TARGET_RATE: 16000,     // Hz — αρκεί για ομιλία
  PAUSE_MS: 700,          // παύση που κλείνει τη φράση
  MAX_PHRASE_MS: 12000,   // μέγιστη φράση (αναγκαστικό κόψιμο)
  MIN_VOICE_MS: 350,      // πιο σύντομα = θόρυβος, αγνοούνται
  PREROLL_MS: 400,        // ήχος πριν την αρχή της φράσης (να μην κόβεται η 1η συλλαβή)
  MIN_THRESHOLD: 0.02     // ελάχιστο επίπεδο ήχου για «ομιλία»
};

// Φράσεις που το Whisper «επινοεί» όταν ακούει σιωπή/θόρυβο
const TX_PHANTOM_FRAGMENTS = [
  "παρακολουθησατε",
  "υποτιτλ",
  "amara.org",
  "subtitles by"
];

// Συγκατάθεση για επεξεργασία φωνής (αποθηκεύεται ως "true_<χρονοσφραγίδα>")
const TX_CONSENT_KEY = "diavlos_v1_transcribe_consent";

let txState = "idle";           // idle | starting | listening
let txStream = null;
let txCtx = null;
let txSource = null;
let txProc = null;
let txWakeLock = null;
let txSegmenter = null;
let txItems = [];               // { id, status: pending|done|error, text }
let txQueue = [];
let txBusy = false;
let txNextId = 1;
const txUI = {};

// ─── Καθαρές συναρτήσεις (χωρίς DOM) ──────────────────────────────

function txNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function txIsPhantom(text) {
  const clean = txNormalize(text);
  if (!clean.replace(/[^a-zα-ω0-9]/g, "")) return true;   // μόνο σημεία στίξης
  return TX_PHANTOM_FRAGMENTS.some((f) => clean.indexOf(f) !== -1);
}

function txDownsample(frames, fromRate, toRate) {
  let total = 0;
  frames.forEach((f) => { total += f.length; });
  const merged = new Float32Array(total);
  let pos = 0;
  frames.forEach((f) => { merged.set(f, pos); pos += f.length; });

  const ratio = fromRate / toRate;
  const outLen = Math.floor(total / ratio);
  const out = new Int16Array(outLen);

  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end && j < total; j++) sum += merged[j];
    let v = sum / (end - start);
    v = Math.max(-1, Math.min(1, v));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

function txEncodeWav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
  return buffer;
}

// Κόβει τον συνεχή ήχο σε φράσεις, με βάση τις παύσεις.
function txMakeSegmenter(sampleRate, onPhrase) {
  const maxPreroll = Math.ceil((TX.PREROLL_MS / 1000) * sampleRate / 4096);
  let preroll = [];
  let phrase = null;
  let noise = 0.005;      // εκτίμηση θορύβου περιβάλλοντος

  function finish() {
    if (!phrase) return;
    const p = phrase;
    phrase = null;
    preroll = [];
    if (p.voicedMs >= TX.MIN_VOICE_MS) onPhrase(p.frames);
  }

  return {
    // Επιστρέφει το επίπεδο ήχου (για την ένδειξη στην οθόνη)
    push(frame) {
      let sum = 0;
      for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
      const rms = Math.sqrt(sum / frame.length);
      const frameMs = (frame.length / sampleRate) * 1000;
      const threshold = Math.max(TX.MIN_THRESHOLD, noise * 3);
      const voiced = rms > threshold;

      if (!phrase) {
        if (voiced) {
          phrase = { frames: preroll.concat([frame]), voicedMs: frameMs, silenceMs: 0, totalMs: frameMs };
          preroll = [];
        } else {
          noise = noise * 0.95 + rms * 0.05;
          preroll.push(frame);
          if (preroll.length > maxPreroll) preroll.shift();
        }
        return rms;
      }

      phrase.frames.push(frame);
      phrase.totalMs += frameMs;
      if (voiced) { phrase.voicedMs += frameMs; phrase.silenceMs = 0; }
      else phrase.silenceMs += frameMs;

      if (phrase.silenceMs >= TX.PAUSE_MS || phrase.totalMs >= TX.MAX_PHRASE_MS) finish();
      return rms;
    },
    flush() { finish(); }
  };
}

// ─── Οθόνη «Μεταγραφή» ─────────────────────────────────────────────

function renderTranscribe() {
  els.title.textContent = "Μεταγραφή";

  const wrap = h("div", "tx-wrap");

  wrap.appendChild(h("p", "tx-disclaimer",
    "Αυτόματη μεταγραφή. Μπορεί να έχει λάθη. Για ιατρικά ή νομικά θέματα ζητήστε γραπτή επιβεβαίωση."));

  txUI.button = h("button", "tx-btn");
  txUI.button.type = "button";
  txUI.button.addEventListener("click", () => {
    if (txState === "idle") txStart();
    else txStop();
  });

  txUI.status = h("p", "tx-status");
  txUI.status.setAttribute("role", "status");

  txUI.level = h("div", "tx-level");
  txUI.level.setAttribute("aria-hidden", "true");
  txUI.level.appendChild(h("span"));

  txUI.privacy = h("p", "tx-privacy",
    "Πατώντας «Έναρξη», ο ήχος στέλνεται για μεταγραφή στο Cloudflare. " +
    "Η εφαρμογή δεν αποθηκεύει ούτε τον ήχο ούτε το κείμενο.");

  txUI.list = h("div", "tx-list");
  txUI.list.setAttribute("role", "log");
  txUI.list.setAttribute("aria-live", "polite");

  txUI.clear = h("button", "btn-secondary tx-clear", "Καθαρισμός");
  txUI.clear.type = "button";
  txUI.clear.addEventListener("click", () => {
    txItems = txItems.filter((it) => it.status === "pending");
    txRenderList();
  });

  wrap.append(txUI.button, txUI.status, txUI.level, txUI.privacy, txUI.list, txUI.clear);

  clear(els.content);
  els.content.appendChild(wrap);

  txSetState(txState);
  txRenderList();
}

function txSetState(state) {
  txState = state;
  if (!txUI.button || !txUI.button.isConnected) return;

  txUI.button.classList.toggle("tx-btn-active", state === "listening");
  txUI.button.disabled = state === "starting";

  if (state === "idle") {
    txUI.button.textContent = "Έναρξη";
    txUI.status.textContent = "Πάτα «Έναρξη» και δώσε το κινητό να μιλήσει ο συνομιλητής σου.";
    txUI.level.style.setProperty("--level", "0");
  } else if (state === "starting") {
    txUI.button.textContent = "Ξεκινά…";
    txUI.status.textContent = "Άνοιγμα μικροφώνου…";
  } else {
    txUI.button.textContent = "Στοπ";
    txUI.status.textContent = "Ακούω…";
  }
}

function txRenderList() {
  if (!txUI.list || !txUI.list.isConnected) return;

  clear(txUI.list);

  if (txItems.length === 0) {
    txUI.list.appendChild(h("p", "empty-state",
      "Το κείμενο της συζήτησης θα εμφανίζεται εδώ."));
  }

  txItems.forEach((item) => {
    if (item.status === "done") {
      const btn = h("button", "tx-line", item.text);
      btn.type = "button";
      btn.setAttribute("aria-label", "Εμφάνιση σε μεγάλα γράμματα: " + item.text);
      btn.addEventListener("click", () => openFullscreen(item.text));
      txUI.list.appendChild(btn);
    } else if (item.status === "pending") {
      const p = h("p", "tx-line tx-line-pending", "…");
      p.setAttribute("aria-busy", "true");
      txUI.list.appendChild(p);
    } else {
      txUI.list.appendChild(h("p", "tx-line tx-line-error", item.text));
    }
  });

  txUI.clear.hidden = txItems.length === 0;
  txUI.list.scrollTop = txUI.list.scrollHeight;
}

// ─── Ηχογράφηση ───────────────────────────────────────────────────

// ─── Συγκατάθεση ───────────────────────────────────────────────────

function txHasConsent() {
  try {
    const value = localStorage.getItem(TX_CONSENT_KEY);
    return typeof value === "string" && value.indexOf("true_") === 0;
  } catch (err) {
    return false;
  }
}

function txStoreConsent() {
  try {
    localStorage.setItem(TX_CONSENT_KEY, "true_" + Date.now());
  } catch (err) {
    // Αν δεν γίνεται αποθήκευση (π.χ. ιδιωτική περιήγηση), θα ξαναρωτήσουμε την επόμενη φορά
  }
}

// Επιστρέφει Promise<boolean>: true αν ο χρήστης αποδέχτηκε.
function txAskConsent() {
  return new Promise((resolve) => {
    const dialog = h("dialog", "consent-dialog");
    dialog.setAttribute("aria-labelledby", "consent-title");

    const title = h("h2", null, "Έγκριση Επεξεργασίας Φωνής");
    title.id = "consent-title";

    const p1 = h("p", "consent-text",
      "Για τη λειτουργία της μεταγραφής, ο ήχος αποστέλλεται στιγμιαία στην υπηρεσία " +
      "Cloudflare Workers AI για μετατροπή σε κείμενο. Δεν αποθηκεύεται κανένα αρχείο " +
      "ήχου ή κειμένου σε διακομιστή.");

    const p2 = h("p", "consent-text",
      "Ο ήχος ενδέχεται να περιέχει αναφορές σε θέματα υγείας. Πατώντας «Αποδοχή», " +
      "παρέχετε τη ρητή συγκατάθεσή σας (Άρθρο 9 GDPR) για τη στιγμιαία αυτή επεξεργασία " +
      "σύμφωνα με την Πολιτική Απορρήτου.");

    const actions = h("div", "dialog-actions");
    const accept = h("button", "btn-primary", "Αποδοχή & Έναρξη");
    accept.type = "button";
    const cancel = h("button", "btn-secondary", "Άκυρο");
    cancel.type = "button";
    actions.append(accept, cancel);

    dialog.append(title, p1, p2, actions);
    document.body.appendChild(dialog);

    let accepted = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
      resolve(accepted);
    };
    const closeDialog = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    };

    accept.addEventListener("click", () => {
      accepted = true;
      txStoreConsent();
      closeDialog();
      finish();
    });
    cancel.addEventListener("click", () => {
      closeDialog();
      finish();
    });
    // Escape ή πίσω: θεωρείται άκυρο
    dialog.addEventListener("close", finish);

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    accept.focus();
  });
}

async function txStart() {
  if (txState !== "idle") return;

  // Πριν την πρώτη χρήση του μικροφώνου χρειάζεται ρητή συγκατάθεση
  if (!txHasConsent()) {
    const accepted = await txAskConsent();
    if (!accepted) return;
  }

  if (!navigator.onLine) {
    showToast("Η μεταγραφή χρειάζεται σύνδεση στο internet.");
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AudioCtx) {
    showToast("Η συσκευή δεν υποστηρίζει ηχογράφηση.");
    return;
  }

  txSetState("starting");

  try {
    txStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  } catch (err) {
    txSetState("idle");
    showToast(err && err.name === "NotAllowedError"
      ? "Δεν δόθηκε άδεια για το μικρόφωνο."
      : "Δεν βρέθηκε μικρόφωνο.");
    return;
  }

  try {
    txCtx = new AudioCtx();
    if (txCtx.state === "suspended") await txCtx.resume();

    txSegmenter = txMakeSegmenter(txCtx.sampleRate, txOnPhrase);
    txSource = txCtx.createMediaStreamSource(txStream);
    txProc = txCtx.createScriptProcessor(4096, 1, 1);
    txProc.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const rms = txSegmenter.push(new Float32Array(input));
      if (txUI.level) txUI.level.style.setProperty("--level", String(Math.min(1, rms * 8)));
    };
    txSource.connect(txProc);
    txProc.connect(txCtx.destination);   // απαραίτητο για να ξεκινήσει η επεξεργασία

    txStream.getAudioTracks().forEach((track) => {
      track.addEventListener("ended", () => { if (txState === "listening") txStop(); });
    });
  } catch (err) {
    txCleanup();
    txSetState("idle");
    showToast("Δεν ήταν δυνατή η έναρξη της ηχογράφησης.");
    return;
  }

  txSetState("listening");
  txRequestWakeLock();
}

function txCleanup() {
  if (txProc) { txProc.onaudioprocess = null; try { txProc.disconnect(); } catch (e) {} }
  if (txSource) { try { txSource.disconnect(); } catch (e) {} }
  if (txStream) txStream.getTracks().forEach((t) => t.stop());
  if (txCtx) { try { txCtx.close(); } catch (e) {} }
  txProc = null; txSource = null; txStream = null; txCtx = null; txSegmenter = null;
  txReleaseWakeLock();
}

function txStop() {
  if (txState === "idle") return;
  if (txSegmenter) txSegmenter.flush();   // στέλνει και την τελευταία φράση
  txCleanup();
  txSetState("idle");
}

// Καλείται από το app.js όταν φεύγουμε από την οθόνη
function stopTranscription() {
  if (txState !== "idle") txStop();
}

// ─── Αποστολή φράσεων ─────────────────────────────────────────────

function txOnPhrase(frames) {
  const rate = txCtx ? txCtx.sampleRate : 48000;
  const pcm = txDownsample(frames, rate, TX.TARGET_RATE);
  const wav = new Blob([txEncodeWav(pcm, TX.TARGET_RATE)], { type: "audio/wav" });

  const item = { id: txNextId++, status: "pending", text: "" };
  txItems.push(item);
  txRenderList();

  txQueue.push({ item: item, blob: wav });
  txPump();
}

async function txPump() {
  if (txBusy) return;
  txBusy = true;
  while (txQueue.length > 0) {
    await txSend(txQueue.shift());
  }
  txBusy = false;
}

function txFail(item, message) {
  item.status = "error";
  item.text = message;
}

async function txSend(job) {
  const item = job.item;

  try {
    const res = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: job.blob
    });

    if (res.status === 429) {
      txFail(item, "Έφτασε το όριο μεταγραφής. Δοκίμασε αργότερα ή γράψτε την απάντηση.");
      stopTranscription();
    } else if (!res.ok) {
      txFail(item, "Δεν μεταγράφηκε αυτή η φράση.");
    } else {
      const data = await res.json();
      const text = (data && data.text ? data.text : "").trim();
      if (!text || txIsPhantom(text)) {
        txItems = txItems.filter((it) => it.id !== item.id);   // σιωπή/θόρυβος — δεν δείχνουμε τίποτα
      } else {
        item.status = "done";
        item.text = text;
      }
    }
  } catch (err) {
    txFail(item, "Δεν υπάρχει σύνδεση. Η φράση δεν μεταγράφηκε.");
  }

  txRenderList();
}

// ─── Wake Lock (να μη σβήνει η οθόνη) ─────────────────────────────

async function txRequestWakeLock() {
  if (!("wakeLock" in navigator) || txWakeLock) return;
  try {
    txWakeLock = await navigator.wakeLock.request("screen");
    txWakeLock.addEventListener("release", () => { txWakeLock = null; });
  } catch (err) {
    txWakeLock = null;
  }
}

function txReleaseWakeLock() {
  if (txWakeLock) {
    try { txWakeLock.release(); } catch (e) {}
    txWakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && txState === "listening") txRequestWakeLock();
});
