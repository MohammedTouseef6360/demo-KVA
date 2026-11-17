# LinkedIn Post (BolBharat submission)

🎙️ Just shipped **BolKhata** — a voice-first khata for 1.2 crore Indian kirana stores.

The shopkeeper speaks one Hinglish sentence —
"Ramesh ko ek pau chai, 2 packet Maggi, ₹150 me se ₹100 cash ₹50 udhaar"
— and BolKhata turns it into a structured bill, splits the tender, deducts stock (250g normalized from a 500g pack), updates the customer's credit ledger, and confirms out loud: "₹150 darj ho gaya."

Built for the merchant who never learned typing — if you can talk, you can keep khata.

What's inside:
• Real ASR (Gnani Prisma) + Hinglish NLU + Gnani Timbre TTS confirmations
• Split-tender parsed in the same breath (cash / UPI / udhaar)
• Colloquial units: ek pau, aadha, sawa, derh, dhai, peti → normalized to g/ml/kg/L
• Real-time voice correction: "Nahi nahi, 2 nahi 3 packet Maggi" patches only that line
• Auto stock deduction + auto-SKU creation mid-sale
• Udhaar ledger with 3-day WhatsApp reminders + clickable UPI link
• Z-Report, CSV export, dead-stock capital, rush-hour bars
• Offline-first (localStorage + service worker) + crash-guarded Node backend

Built for @HackBriven's BolBharat — The Gnani Voice AI Innovation Challenge 🙏

Live demo + code: <link>
Demo video: <link>

#VoiceAI #GnaniAI #HackBriven #BolBharat #Kirana #India #Hinglish #BuildInPublic