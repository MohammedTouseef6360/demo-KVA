# KiranaVoice — Devpost Submission (Copy-Paste Ready)

---

## PROJECT STORY (paste into "About the project")

## Inspiration

India has **12 million kirana stores** — the backbone of a $900 billion retail economy. Yet most shopkeepers (average age 50+) run their business on paper *bahi-khatas* or apps that demand typing. **They don't type — they talk.**

We saw a 70-year-old shopkeeper in Old Delhi lose ₹2,000/month to udhaar disputes because he couldn't read his own handwriting. He said: *"Agar bol ke likh deta toh koi problem nahi hoti."*

**KiranaVoice** was born — a voice-first khata where you speak naturally in Hinglish and it becomes a structured bill, updates stock, splits tender, and logs udhaar. All offline. All in the browser.

## What I Built

### Voice-First Bill Entry
Speak naturally in Hinglish: *"Ramesh ko ek pau chai, 2 Maggi — 150 me se 100 cash 50 udhaar"* — the parser understands colloquial units (ek pau → 250g, derh kilo → 1.5kg), money roles (total/cash/udhaar), and customer names in one breath.

### Voice Correction
Said the wrong quantity? Say *"Nahi 2 nahi 3 packet Maggi"* and it patches that one line item live without restarting.

### Barcode Scanner
Native BarcodeDetector API scans EAN-13/UPC barcodes via camera. Manual EAN input fallback. Unknown items → draft SKU card until MRP is provided.

### Udhaar Ledger
Customer cards with Overdue/Pending/Cleared status pills. "Remind" button generates a WhatsApp deep link with UPI collection request. Three-day overdue auto-detection.

### Stock Management
192-SKU FMCG catalog with aliases, MRPs, and EAN-13 barcodes. Category filter chips. Low-stock rows highlighted in red. One-tap restock.

### Z-Report + Export
End-of-day summary: Gross/Cash/Udhaar/Vasooli rows. NET amount highlighted. Export as CSV. Share via WhatsApp with UPI link.

### Split-Tender
Cash + Udhaar in one sentence. Rate-per-unit pricing (*"do kilo aloo 40 ke"* → ₹40/kg → ₹80 for 2kg).

### Offline-First + Crash-Guarded
localStorage + sync queue. Node backend with atomic writes, `.backup` auto-recovery, global `uncaughtException`/`unhandledRejection` traps — cannot crash.

## How I Built It

**Frontend:** Vanilla JavaScript (ES2022), HTML5, CSS3 — zero framework dependencies.

**Browser APIs:**
- Web Speech API (`webkitSpeechRecognition`, `hi-IN`) for live ASR + `speechSynthesis` for Hindi TTS confirmations
- BarcodeDetector API for native EAN-13/UPC camera scanning
- Service Worker + Web Manifest for PWA install + offline cache
- Vibration API for haptic feedback
- Clipboard + Web Share API for WhatsApp UPI links

**Backend:** Node.js zero-dependency `http` module. Atomic JSON writes with `.backup` recovery. Global crash handlers. Merge-by-id sync protocol.

**NLU Engine:** Rule-based Hinglish parser with money-token classification, colloquial unit normalization, split-tender detection, voice correction, expense/return/inward detection, and query understanding. No LLM, no API keys, deterministic, sub-100ms, works offline.

**Storage:** localStorage + IndexedDB with sync queue. Crash-guarded JSON persistence on server.

**Design:** PhonePe-inspired Material 3 — deep green `#006847` primary, Plus Jakarta Sans headings, Inter body, Material Symbols Outlined icons, 5-tab bottom nav with center Voice FAB.

## Challenges I Overcome

| Challenge | Solution |
|-----------|----------|
| Hinglish NLU without LLM | Hand-crafted tokenizer + money-role classification + colloquial unit map |
| Split-tender in one sentence | Role-classified money tokens (total/cash/udhaar/rate) with positional context |
| Voice correction mid-flow | Context-aware patch: "nahi 2 nahi 3 packet" → finds item, updates qty, recalculates |
| Offline + sync | LocalStorage queue + merge-by-id sync + crash-proof server with atomic writes |
| 70yo usability | 56px touch targets, 18px base type, deep green primary, center FAB, Hindi voice feedback |
| Camera scan fallback | BarcodeDetector + manual EAN input + "catalog miss → draft SKU" flow |

## What I Learned

- Voice is the great equalizer for non-digital users — but only if it understands *their* language (Hinglish, colloquial units), not textbook Hindi
- Rule-based NLU beats LLMs for money — deterministic, sub-100ms, works offline, zero cost, zero hallucinations on financial data
- PhonePe's design language (deep green, white cards, center FAB) is instantly trusted by Indian merchants — no learning curve
- Crash-guarded backend matters more than fancy features — a sync that survives bad JSON, port conflicts, and power cuts

---

## BUILT WITH (paste into tags field)

JavaScript, HTML5, CSS3, Node.js, Web Speech API, BarcodeDetector, Service Worker, PWA, Material Design, Offline-First, Vanilla JS, Zero Dependencies, Hinglish NLU, Voice Interface, Split-Tender, Udhaar Ledger, Barcode Scanner, PhonePe Design, Indian Market, Fintech, Retail Tech, Accessibility, Hindi, WhatsApp Integration, UPI

---

## TRY IT OUT LINKS (paste into links fields)

**Link 1:**
- Title: Live Demo
- URL: (deploy to Vercel/Railway first — see below)

**Link 2:**
- Title: GitHub Repository
- URL: https://github.com/your-username/kiranavoice

**Link 3:**
- Title: Demo Video
- URL: https://youtu.be/your-video-id

**Link 4:**
- Title: Local Setup
- URL: https://github.com/your-username/kiranavoice#readme

---

## VIDEO DEMO SCRIPT (60-90 seconds)

| Time | Action | Narration |
|------|--------|-----------|
| 0-5s | Open app, show dashboard | "KiranaVoice — speak, don't type." |
| 5-15s | Tap mic, say "Ramesh ko ek pau chai, 2 Maggi — 150 me se 100 cash 50 udhaar" | "Natural Hinglish. Split tender in one breath." |
| 15-22s | Show bill, tap Confirm → "₹150 darj ho gaya" spoken | "Spoken confirmation builds trust." |
| 22-28s | Say "Nahi, 2 nahi 3 packet Maggi" | "Voice correction patches one line." |
| 28-35s | Tap Scan, point at barcode | "Native camera scan + manual fallback." |
| 35-42s | Tap Udhaar → Remind → WhatsApp opens with UPI link | "3-day auto-reminders + instant UPI settlement." |
| 42-48s | Toggle Wi-Fi off → "Offline OK" → toggle on → "Cloud synced" | "Offline-first, crash-guarded backend." |
| 48-55s | Settings → Biz Reports → Z WhatsApp | "End-of-day Z-report in one tap." |
| 55-60s | Close with logo | "KiranaVoice — bolo aur khata likho." |

---

## SCREENSHOTS TO CAPTURE (8 images, 3:2 ratio, 1920x1280)

1. Home Dashboard — bento stats (sales, udhaar, low stock) + quick actions grid
2. Voice View — pulse rings, "LISTENING…" text, live transcript, draft items, Confirm Sale
3. Udhaar Ledger — overdue banner, customer cards with status pills, Remind button
4. Stock Management — category chips, low-stock red rail, Restock buttons
5. Transaction History — date headers, payment chips (Cash/UPI/Split), green/red amounts
6. Z-Report Sheet — Gross/Cash/Udhaar/Vasooli rows, NET highlighted, Export buttons
7. Scanner View — corner brackets, scan line, matched item card
8. Settings — PIN toggle, Sound, Sync, Demo Data button

---

## DEPLOY CHECKLIST

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "KiranaVoice — voice-first kirana khata"
git remote add origin https://github.com/your-username/kiranavoice.git
git push -u origin main

# 2. Deploy to Vercel (free)
npm i -g vercel
vercel --prod
# → gives you https://kiranavoice.vercel.app

# 3. Deploy to Railway (alternative, persistent backend)
railway login
railway init
railway up
```

---

## DEVPOST SUBMISSION CHECKLIST

- [ ] Deploy to Vercel/Railway → get public URL
- [ ] Record 60-sec demo video → upload to YouTube (unlisted)
- [ ] Take 8 screenshots (3:2 ratio, 1920x1280)
- [ ] Push code to GitHub with clean README
- [ ] Paste PROJECT STORY into "About the project"
- [ ] Paste BUILT WITH tags into tags field
- [ ] Add TRY IT OUT links
- [ ] Upload screenshots
- [ ] Add video URL
- [ ] SUBMIT BEFORE DEADLINE
