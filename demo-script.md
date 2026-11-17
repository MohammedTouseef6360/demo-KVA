# BolKhata — Demo Recording Guide (Real App UI)

Use the **real app** (not the mock). Target ~90 seconds. Record with Win+G / OBS at 1080p portrait.

## Setup (once)
1. Open `http://localhost:3000` (or your HTTPS deploy URL) in Chrome.
2. DevTools → Application → Clear site data → Reload (clean seed).
3. Settings → turn **Voice feedback ON**, **Cloud sync OFF** (to avoid network noise).
4. Close Settings.

## Recording flow

### 0:00–0:08 — Home
- Show the home dashboard: "Namaste, Rahul ji!".
- Point at the 3 bento cards: **Aaj ki bikri ₹0**, **Baki udhaar ₹6,120**, **Kam stock 0**.
- **Voiceover (simple):** "This is BolKhata — a voice-first khata for small Indian shops. You speak, it writes the bill."

### 0:08–0:20 — Open voice + speak
- Tap the green mic button (bottom center) → voice overlay opens.
- Tap the mic icon (or hold it). Speak: *"Ramesh ko ek pau chai, 2 packet Maggi, 150 rupees me se 100 cash 50 udhaar"*.
- The heard-text line shows what was understood.
- **Voiceover:** "I speak one sentence in Hinglish — the whole bill comes out."

### 0:20–0:32 — Bill card
- Bill card appears: **Tata Tea 250g** (ek pau = 250g), **Maggi ×2**, **Cash ₹100**, **Udhaar ₹50**, **Total ₹171**.
- **Voiceover:** "It normalizes 'ek pau' to 250 grams, splits cash and credit, and prices by pack."

### 0:32–0:40 — Voice correction
- Tap mic again, say: *"Nahi nahi, 2 nahi 3 packet Maggi"*.
- Only the Maggi line changes to 3; total recalculates.
- **Voiceover:** "I correct by voice — only that line changes, no re-entry."

### 0:40–0:46 — Confirm
- Tap **✓ Confirm Sale**.
- Toast "₹185 darj ho gaya" + spoken confirmation. Dashboard updates; Maggi stock drops.
- **Voiceover:** "Confirm — it speaks back, updates the dashboard, and cuts stock."

### 0:46–0:58 — Udhaar + reminder
- Switch to **Udhaar** tab. Show the red overdue banner for Ramesh.
- Tap **Remind →** → WhatsApp opens with an itemized statement + a clickable `upi://pay` link.
- **Voiceover:** "Overdue customers get a one-tap WhatsApp reminder with a UPI pay link."

### 0:58–1:06 — Voice Q&A
- Tap the voice button in Udhaar tab. Speak: *"Ramesh ka kitna baaki hai?"*
- The app speaks back: "Ramesh ka udhaar 470 rupaye baaki hai."
- **Voiceover:** "Ask by voice — it answers with the exact balance."

### 1:06–1:16 — Reports (Z-Report)
- Open **Biz Reports**. Show Z-Report: Gross Bikri, Cash Drawer, Naya Udhaar, Purana Vasooli, Kharcha, NET CASH.
- Show rush-hour bars and dead-stock capital.
- **Voiceover:** "Z-Report, CSV export, dead-stock capital, rush-hour bars."

### 1:16–1:24 — Expenses (true net profit)
- Say: *"Bijli ka bill 800 rupees diya"* → expense logged.
- Dashboard now shows **Net profit = sales − expenses**, not just sales.
- **Voiceover:** "Log expenses by voice — true net profit, not just sales."

### 1:24–1:30 — Supplier inward + close
- Say: *"Fortune distributor ko 5000 diye aur 5 peti tel aaya"* → supplier debt up, stock inwarded.
- Open Reports → **Close Day** → locks the day with a spoken summary.
- **Voiceover:** "Supplier debt up, stock in — at the same time. Close the day with one tap. Built with Gnani Voice AI."

## Ending card (overlay in editor)
- "BolKhata — if you can talk, you can keep khata."
- "Powered by Gnani.ai (Prisma STT · Timbre TTS · Evon LLM)"
- "HackBriven · BolBharat Voice AI Challenge"

## Mic troubleshooting for the recording
- Mic works on **localhost** or **HTTPS** only. On a phone over LAN (http://192.168.x.x) the browser blocks the mic — use ngrok or the deployed HTTPS URL.
- If the mic fails, the app falls back to demo chips, which still run the full flow.