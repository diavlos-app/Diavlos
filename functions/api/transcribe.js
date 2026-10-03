// Δίαυλος — /api/transcribe  (Cloudflare Pages Function)
// Δέχεται ένα μικρό αρχείο ήχου (WAV) και επιστρέφει {"text": "..."}.
// Χρησιμοποιεί Cloudflare Workers AI (Whisper large-v3-turbo).
//
// ΡΥΘΜΙΣΗ (μία φορά, στο dashboard του Cloudflare):
//   Workers & Pages → diavlos → Settings → Bindings → Add → Workers AI
//   Variable name:  AI
// Μετά κάνε ένα νέο deployment (ή Retry deployment).

const MODEL = "@cf/openai/whisper-large-v3-turbo";
const MAX_BYTES = 1_000_000;          // 1 MB ανά αίτημα (~30 δευτ. WAV 16kHz)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 25;       // ανά IP, ανά λεπτό (best effort)
const hits = new Map();

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  let host;
  try { host = new URL(origin).hostname; } catch (e) { return false; }
  // Παραγωγή + preview deployments του ίδιου project
  return host === "diavlos.pages.dev" || host.endsWith(".diavlos.pages.dev");
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX_PER_WINDOW;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const step = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

export async function onRequestPost({ request, env }) {
  if (!isAllowedOrigin(request.headers.get("Origin"))) {
    return json({ error: "forbidden" }, 403);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) return json({ error: "too-many" }, 429);

  const declared = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (declared > MAX_BYTES) return json({ error: "too-large" }, 413);

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return json({ error: "empty" }, 400);
  if (audio.byteLength > MAX_BYTES) return json({ error: "too-large" }, 413);

  if (!env || !env.AI) return json({ error: "no-binding" }, 500);

  try {
    const result = await env.AI.run(MODEL, {
      audio: toBase64(audio),
      language: "el",
      task: "transcribe",
      vad_filter: true
    });
    const text = ((result && result.text) || "").trim();
    return json({ text: text }, 200);
  } catch (err) {
    const msg = String((err && err.message) || err);
    console.error("[transcribe]", msg);
    // Εξαντλήθηκαν τα δωρεάν neurons της ημέρας
    if (/neuron|quota|limit|4006/i.test(msg)) return json({ error: "limit" }, 429);
    // ΠΡΟΣΩΡΙΝΟ για τις δοκιμές: το detail δείχνει το πραγματικό σφάλμα.
    // Αφαίρεσέ το (κράτα μόνο {error:"upstream"}) όταν δουλέψει.
    return json({ error: "upstream", detail: msg }, 502);
  }
}
