# BolKhata — Bolo aur Khata Likho

**A voice-first khata for India's kirana stores.** The shopkeeper speaks one Hinglish sentence — *"Ramesh ko ek pau chai, 2 packet Maggi, ₹150 me se ₹100 cash ₹50 udhaar"* — and BolKhata writes the bill, splits the tender, deducts stock, updates the customer's udhaar ledger and confirms out loud: *"₹150 darj ho gaya."*

Built for the merchant who never learned typing: **if you can talk, you can keep khata.**

---

## Submission details (copy-paste)

| Field | Value |
|---|---|
| **Project name** | BolKhata — Bolo aur Khata Likho |
| **Track** | Voice Khata for kirana stores |
| **Live demo (HTTPS)** | https://demo-kva.vercel.app |
| **GitHub repo** | https://github.com/MohammedTouseef6360/demo-KVA |
| **Demo video** | https://raw.githubusercontent.com/MohammedTouseef6360/demo-KVA/main/demo.mp4 |
| **Event** | BolBharat — The Gnani Voice AI Innovation Challenge |
| **Built with** | Gnani Prisma v3.0 (STT) · Gnani Timbre v3.0 (TTS) · Gnani Evon v3.3 (LLM) · Vanilla JS PWA · Node.js |

**Short description (one line):**
> BolKhata turns one spoken Hinglish sentence into a complete bill — items, split tender, stock deduction and udhaar entry — with spoken confirmation, built on Gnani's Prisma, Timbre and Evon.

---

## The problem

12 million kirana stores run India's retail. Most owners are 40–60, work 12-hour shifts with both hands busy, and keep a paper *bahi-khata* — or use apps that assume typing and English. Typing a bill is slower than writing it, so the app gets abandoned and the udhaar disputes continue.

Voice is the only interface that costs the shopkeeper **nothing** to learn. But it has to understand *their* Hinglish — "ek pau chai", "derh kilo", "150 me se 100 cash 50 udhaar" — not textbook Hindi.

---

## What it does

**Voice billing (core loop)** — speak the whole bill at once: items + quantities + money split + customer name. Handles colloquial units (`pau` → 250 g, `derh` → 1.5), pack-versus-unit stock deduction, and rate pricing ("do kilo aloo 40 ke" → ₹40/kg).

**Voice correction mid-bill** — "nahi, 2 nahi 3 packet Maggi" patches that one line and recalculates. No cancel, no re-entry.

**Split tender** — cash + UPI + udhaar in the same sentence, split proportionally and journaled separately for the day's cash reconciliation.

**Udhaar ledger** — per-customer due, overdue detection (3-day default), one-tap WhatsApp statement with a clickable `upi://pay` link, credit-limit warning before a new udhaar.

**Stock + suppliers** — 192-SKU FMCG catalog with aliases and EAN-13 codes, low-stock alerts, barcode scan, supplier inward entries and supplier ledger.

**Daily close** — Z-report (gross / cash / UPI / new udhaar / collections / expenses / net), CSV export, WhatsApp share, and a Close-Day / Unlock handover so a shift can be audited.

**Offline-first** — localStorage + service worker; syncs to the backend when reachable; every feature still works with no network.

**AI disclosure** — the agent introduces itself as an AI on the first turn ("Main BolKhata AI assistant hoon"), once per device.

---

## How Gnani is used

```
Mic (16 kHz WAV) ──► POST /api/gnani/stt ──► Gnani Prisma v3.0  ──► transcript
                                                                      │
                                              POST /api/gnani/llm ──► Gnani Evon v3.3
                                                                      │  structured JSON
                                                                      ▼
                                                       bill + tender split + intents
                                                                      │
Speaker ◄── POST /api/gnani/tts ◄── Gnani Timbre v3.0 ◄───────────────┘
```

| Gnani service | Model | Used for | Notes |
|---|---|---|---|
| **Prisma** | v3.0 (`POST /stt/v3`) | Hinglish/Hindi speech → text | `hi-IN`, auto language detect, multipart WAV |
| **Timbre** | v3.0 (`POST /api/v1/tts/inference`) | Spoken confirmation + receipts | voice `Shivani`, speed 0.9, 24 kHz WAV, selectable voice/language |
| **Evon** | v3.3 (OpenAI-compatible) | Transcript → intent + items + money roles (JSON) | temperature 0.2, JSON mode |

The API key is **server-side only** (`process.env.GNANI_API_KEY`) and every Gnani call is proxied through our own Node route, so nothing leaks into the browser bundle.

**Degradation ladder (why the demo cannot fail):**
`Gnani Prisma/Timbre/Evon` → `browser SpeechRecognition / speechSynthesis` → `deterministic Hinglish rule engine`.
The rule engine also owns the money math, so a hallucinating LLM can never invent a total.

---

## Architecture

```
┌──────────────────────────── PWA (offline-first) ────────────────────────────┐
│  index.html + app.js        UI, tabs, sheets, bill editor                    │
│  speech.js                  mic → 16 kHz WAV, TTS playback, fallbacks       │
│  parser.js                  Evon call (parseAsync) → rules fallback          │
│  store.js                   localStorage source of truth, ledger math        │
│  catalog.js / scanner.js    192 SKUs, aliases, EAN-13, BarcodeDetector      │
│  reports.js                 Z-report, CSV, WhatsApp + UPI links              │
│  sw.js / manifest.json      installable, works with no network               │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ /api/*  (same origin, HTTPS)
┌───────────────────────────────▼─────────────────────────────────────────────┐
│  Node server (server/server.js) — zero runtime dependencies                  │
│   /api/gnani/{stt,tts,llm,status}   proxy, key never leaves the server       │
│   /api/sync, /api/state             merge-by-id JSON persistence             │
│   /api/report/z, /api/health        day close, uptime                        │
│   static file serving               MIME + path-traversal guards             │
│   crash guards                      uncaughtException / unhandledRejection,  │
│                                     atomic write + .backup recovery, 2 MB cap│
└─────────────────────────────────────────────────────────────────────────────┘
```

Runs as one Node process locally (`npm start`) and as a Vercel serverless function in production (`vercel.json` routes `/api/*` → `server/server.js`). On Vercel the filesystem is read-only, so persistence falls back to the device — the UI says **"Memory only"** instead of pretending it synced.

---

## Demo flow (2–3 minutes, live mic)

1. **Home** — dashboard: today's sales, udhaar, low stock. Tap the mic.
2. **Speak the bill** — *"Ramesh ko ek pau chai, 2 packet Maggi, 150 me se 100 cash 50 udhaar."*
   Transcript appears, bill card builds with quantities and the ₹100 cash / ₹50 udhaar split.
3. **Correct by voice** — *"Nahi, 2 nahi 3 packet Maggi."* One line updates, totals recalculate, spoken reply confirms.
4. **Confirm** — *"Darj karo."* Spoken *"₹150 darj ho gaya"*, Maggi stock drops, dashboard ticks up, Ramesh's due rises.
5. **Udhaar tab** — overdue banner, Ramesh's card, **Remind →** opens WhatsApp with an itemized statement and a `upi://pay` link.
6. **Collect** — say *"Ramesh ne 200 jama kiye kal"* → due drops, transaction is dated yesterday (relative dates understood).
7. **Close the day** — Z-report: gross, cash, UPI, new udhaar, collections, expenses, net → CSV / WhatsApp.
8. **Offline proof** — turn Wi-Fi off, bill again, turn it back on: it still works, then syncs.

---

## Setup

```bash
git clone https://github.com/MohammedTouseef6360/demo-KVA
cd demo-KVA
npm start            # http://localhost:3000  (Node ≥18, no npm install needed)
```

Enable the Gnani stack (optional — the app runs without it in fallback mode):

```bash
# .env
GNANI_API_KEY=your_key_from_app.gnani.ai
GEMINI_API_KEY=your_key               # optional, Evon stand-in
```

Deploy: import the repo on Vercel → add the same env vars → deploy. HTTPS is automatic, which is what makes the phone mic work.

---

## Judging-rubric mapping

| Criterion | Evidence in this build |
|---|---|
| Gnani stack actually used | Prisma v3.0 STT, Timbre v3.0 TTS and Evon v3.3 LLM all in the live loop; `/api/gnani/status` reports which keys are live |
| Voice-first, not voice-decorated | Every money-changing action is reachable by speech; the UI is the fallback, not the other way round |
| Vernacular understanding | Colloquial units, Hinglish money roles, relative dates, name disambiguation |
| Real merchant workflow | Bill → tender split → stock → udhaar ledger → reminder → daily close, end to end |
| Robustness | Crash-guarded backend, offline-first client, three-step degradation ladder, zero console errors on the live deploy |
| Usability for low-digital-literacy users | 56 px targets, 18 px type, deep-green Material 3, spoken confirmations, one-screen flows |

---

## Honest gaps / next steps

- **Streaming STT:** the current build calls Prisma's REST endpoint per utterance. `wss://api.vachana.ai/stt/v3/stream` (partial transcripts, barge-in) is the next milestone; the proxy is structured so only `speech.js` changes.
- **Telephony:** this edition forbids phone numbers, so the agent is browser-mic only.
- **Evon key:** until a hosted Evon endpoint is issued, the LLM path runs on Gemini behind the same `/api/gnani/llm` contract; the rules engine is always the safety net.
- **Multi-device:** the sync protocol merges by id, but there is no auth yet — it is a single-shop deployment.
- **Languages:** Hindi and Hinglish are tuned today; Timbre voices for Marathi/Gujarati/Tamil are a settings change plus eval data.

---

## Built with (tags)

Gnani Prisma v3.0, Gnani Timbre v3.0, Gnani Evon v3.3, Voice AI, STT, TTS, LLM, Hinglish NLU, PWA, Vanilla JavaScript, Node.js, Material 3, Offline-First, Service Worker, BarcodeDetector, UPI, WhatsApp, Fintech, Retail Tech, Kirana, Accessibility, India

---

## Pre-submit checklist

- [x] Live HTTPS demo — https://demo-kva.vercel.app
- [x] Public repo with README (setup, architecture, Gnani services)
- [x] Gnani key configured server-side on the deploy (`gnani: true`)
- [x] Zero console errors on the live deploy; `/api/health`, `/api/sync`, `/api/report/z` verified
- [ ] **Re-record the demo video as a 2–3 min live voice session** (current `demo.mp4` is a 42 s screenshot walkthrough and does not yet show a real spoken session)
- [ ] Register for Round 1 on HackBriven and paste the links above
