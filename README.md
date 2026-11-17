# BolKhata — बोलो और खाता लिखो 🎙️📒

**Voice-first khata for 1.2 crore Indian kirana stores.** The shopkeeper *speaks* Hinglish like a human — *"Ramesh ko ek pau chai, 2 packet Maggi, ₹150 me se ₹100 cash ₹50 udhaar"* — and BolKhata turns it into a structured bill, splits the tender, deducts stock, updates the customer's credit ledger, and confirms out loud: *"₹150 darj ho gaya."*

Built for the merchant who never learned typing — **if you can talk, you can keep khata.**

> **🔗 Live demo (HTTPS):** https://demo-kva.vercel.app
> **🎬 Demo video:** [`demo.mp4`](./demo.mp4)
> **📦 Repo:** https://github.com/MohammedTouseef6360/demo-KVA

---

## ⚡ Run in 10 seconds

```bash
npm start          # → http://localhost:3000
```

No dependencies. No build step. Node ≥16. Opens on phone via LAN IP too (`http://192.168.x.x:3000`) — fully mobile-first.

> **Offline?** Still works. Frontend is offline-first (localStorage + service worker). Backend sync resumes automatically when reachable. Backend itself is crash-guarded: global exception handlers, atomic JSON writes with `.backup` recovery, malformed-request rejection — it cannot die on bad input.

---

## 🏆 What makes this different (judge pitch)

| Existing apps (Khatabook/OkCredit) | BolKhata |
|---|---|
| Type every entry | **Speak one sentence** — whole bill at once |
| Separate steps for bill → payment → ledger | Split-tender parsed in the same breath |
| English UI, typing-heavy | Hinglish NLU + Hindi voice feedback |
| Manual stock | Auto-deduction + auto-SKU creation mid-sale |

**The wow:** say *"Nahi nahi, 2 nahi 3 packet Maggi"* while the bill is open — it patches ONLY that line's quantity and recalculates. No cancel, no re-entry.

---

## 🎬 90-second demo script

1. **Home tab** → tap demo chip *"Ramesh ko ek pau chai…"* (or hold mic and actually speak it on Chrome Android).
   → Bill card appears in **~1s**: 250g normalization visible, ₹100 cash / ₹50 udhaar split shown.
2. Say/click *"Nahi nahi, 2 nahi 3 packet Maggi"* → qty patches live.
3. Tap **✓ Darj karo** → toast + spoken *"₹150 darj ho gaya"*, dashboard ticks up, Maggi stock drops.
4. **Udhaar tab** → red banner shows 3-day-overdue customers → tap **Bhejo →** → WhatsApp opens with itemized statement + clickable `upi://pay` link.
5. Voice-query: *"Ramesh ka kitna baaki hai?"* → speaks back the exact balance.
6. **More tab** → Z-Report (gross/cash/udhaar/vasooli/net), CSV export, dead-stock capital analysis, rush-hour bars.
7. Say *"Bijli ka bill ₹800 diya"* → expense logged; dashboard now shows TRUE net profit, not just sales.
8. Say *"Fortune distributor ko ₹5000 diye aur 5peti tel aaya"* → supplier debt ↑, stock inwarded, simultaneously.

---

## ✅ Feature coverage vs. spec

### Tier 1 Core Chain
| Spec feature | Status | Where |
|---|---|---|
| Vernacular voice parsing + entity extraction | ✅ **real ASR** (Web Speech hi-IN) + rule-based Hinglish NLU, single-pass | `js/parser.js`, `js/speech.js` |
| Split-tender ("₹100 cash ₹50 udhaar") | ✅ role-classified money tokens | `parser.js → moneyScan()` |
| Colloquial units (ek pau/aadha/sawa/derh/dhai sau gram/peti) | ✅ normalized to g/ml/kg/L + pack-proportional loose pricing | `parser.js → extractQty()`, `packStd()` |
| Real-time voice correction (contextual patching) | ✅ patches one field, recalculates | `parseCorrection()`, `applyCorrection()` |
| Dynamic stock deduction | ✅ on confirm | `store.js → applySale()` |
| Zero-friction auto-cataloging (draft SKU) | ✅ NEW-SKU badge on unknown items | `store.js → draftSku()` |
| Threshold flagging | ✅ low-stock stat + amber/red cards | dashboard |
| Udhaar ledger lifecycle | ✅ per-customer history, partial collections | `applyCollection()` |
| Automated 3-day WhatsApp reminders | ✅ overdue engine + wa.me deep link + UPI intent inside message | `overdueCustomers()`, `reports.statement()` |
| Live dashboard (3 numbers, high contrast) | ✅ | Home tab |
| Spoken confirmation | ✅ TTS *"₹X darj ho gaya"* after every txn | `speech.speak()` |

### Wow layer
| Feature | Status |
|---|---|
| Hands-free ledger Q&A ("Ramesh ka kitna?", "Aaj kitni bikri?") | ✅ query intents + instant TTS answer |
| Preloaded FMCG catalog | ✅ **192 SKUs**, aliases (Surf→detergent, chai→Tata Tea), MRPs, EAN-13 barcodes |
| Camera barcode scanner (stretch) | ✅ native `BarcodeDetector` EAN-13/UPC + manual fallback, hybrid voice+scan bill |

### Tier 2 highlights shipped
Expense logging (voice) · True net profit vs sales · Supplier khata + voice inwarding · Returns restore stock+ledger · Credit-limit breach warnings (visual+spoken) · Best/worst sellers · Dead-stock capital lock-in · Rush-hour analysis · Z-Report (WhatsApp digest) · CSV export · Offline-first queue + cloud sync · PIN lock

---

## 🏗️ Architecture (30-second version)

```
Phone (PWA, offline-first)          Node backend (crash-guarded)
┌─────────────────────────┐  POST   ┌──────────────────────┐
│ speech.js  ASR/TTS      │  /sync  │ zero-dep http server │
│ parser.js  Hinglish NLU │ ──────► │ merge-by-id upsert   │
│ store.js   localStorage ├─────────┤ atomic db.json write │
│ scanner.js BarcodeDetct │  /api/* │ .bak auto-recovery   │
│ reports.js Z/CSV/WA/UPI │         │ global error traps   │
└─────────────────────────┘         └──────────────────────┘
```

- **Gnani Voice AI (BolBharat challenge):** STT via Gnani Prisma v3.0 (hi-IN, auto language detect), TTS via Gnani Timbre v3.0 (voice `Shivani`, speed 0.9), reasoning via Gnani Evon v3.3 (Gemini stand-in until a hosted Evon endpoint is available). All calls proxied through `/api/gnani/*` so the API key never ships to the browser. Rule-based NLU remains as an offline fallback. See `.env.example`.
- **New features:** Credit (udhaar) entries by voice, UPI+cash split tender, supplier payments ledger, daily cash-close/shift handover, voice price correction ("nahi, ₹60 per kilo"), relative dates ("kal"/"parso"), customer-name disambiguation, AI disclosure on first turn, multi-language TTS voice selector.
- **Why rules-based NLU fallback?** Latency <100ms (spec allows 1.5s), zero cost at scale, works fully offline, deterministic enough for money. LLM path is pluggable via `handleUtterance`/`parseAsync`.
- **Why localStorage not SQLite?** Hackathon-scope single-device truth; sync protocol already merges by id, swap to IndexedDB/SQLite is additive.

## 📋 Quick Start (local)
```bash
npm start          # → http://localhost:3000
```
No dependencies. No build step. Node ≥16. Opens on phone via LAN IP too (`http://192.168.x.x:3000`) — but the mic needs HTTPS (use localhost or deploy).

**Optional — enable Gnani Voice AI:** create a `.env` file:
```
GNANI_API_KEY=your_key_from_app.gnani.ai
GEMINI_API_KEY=your_gemini_key   # optional, for Evon LLM
```
Without keys the app runs in fallback mode (browser speech + rule-based NLU).

## 🎬 Demo in 10 seconds
Settings → "Demo Data" auto-runs the full tour: sale → collection → expense → inward → udhaar → Z-report → stock → home.

## 🚀 Deploy (Vercel)
1. Push to GitHub.
2. Import the repo on Vercel (it auto-detects `vercel.json`).
3. Add env vars in Vercel dashboard: `GNANI_API_KEY` (required), `GEMINI_API_KEY` (optional, for Evon LLM).
4. Deploy — HTTPS is automatic, so the mic works on phones.
5. Open the deploy URL → Settings → Demo Data to seed.

## 🔒 Crash-proofing checklist
uncaughtException/unhandledRejection traps · 2MB body cap · try/catch on every route · atomic temp-file rename writes · automatic `.backup.json` recovery on corrupt read · shape-validation on load · port-in-use auto-retry · malformed JSON → clean 400, never a crash.

## 📁 Files
`server/server.js` · `js/{catalog,parser,store,speech,scanner,reports,app}.js` · `css/{tokens,style}.css` · `index.html` · `sw.js` · `manifest.json`
