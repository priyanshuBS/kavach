# Kavach: a live guard against digital arrest scam calls

Kavach runs on an Android phone. While a call is going on (a normal call, or a WhatsApp/Skype video call), it listens through the microphone, turns speech into text, and checks whether the conversation follows the **digital arrest scam script**:

1. **Fake officer**: "Main CBI / Crime Branch / TRAI se bol raha hoon"
2. **Accusation**: "Aapke Aadhaar se money laundering case hai"
3. **Isolation**: "Kisi ko mat batana, camera on rakho"
4. **Urgency**: "2 ghante mein arrest ho jayega"
5. **Money demand**: "RBI safe account mein paise transfer karo"

When the call reaches the dangerous stages, Kavach does two things:

- It covers the call screen with a red warning: *"Real police never arrest anyone on a video call. Hang up and call 1930."*
- It sends a **Telegram alert** to a family member.

```
 Android phone (Expo app)                          Laptop (Node backend)                   Cloud
┌───────────────────────────────┐   WAV chunk    ┌──────────────────────────────┐
│ Call starts → GuardService    │ ─────────────► │ /api/sessions/:id/audio      │ ──► Groq Whisper (speech→text)
│ records mic (16 kHz, 6 s)     │   every 6 s    │  1. keyword rules (Hi/En)    │
│                               │                │  2. LLM stage classifier     │ ──► Groq gpt-oss (stage scores)
│ Warning overlay on call screen│ ◄───────────── │  3. risk engine (0-100)      │
│ (accessibility service)       │  risk + alert  │  4. alert once per call      │ ──► Telegram bot → family phone
└───────────────────────────────┘                └──────────────────────────────┘
                                                   Live dashboard at http://localhost:4000
```

## What's in the folder

```
kavach/
├── backend/                 Node.js server (no npm packages needed)
│   ├── src/stages.js        the 5 stages + Hindi/Hinglish/English rule patterns
│   ├── src/risk.js          risk score and alert decision
│   ├── src/groq.js          Whisper speech-to-text + LLM stage classifier
│   ├── src/sessions.js      the pipeline for each call
│   ├── src/telegram.js      family alert
│   ├── src/server.js        HTTP API + live dashboard
│   ├── public/index.html    dashboard for your demo (projector)
│   ├── data/calls/*.json    role-played scam + genuine calls (your dataset)
│   └── scripts/evaluate.js  detection rate, false alarms, time-to-alert
└── app/                     Expo (React Native) Android app
    ├── App.js               app state, tabs, alarm
    ├── src/screens/         Guard, Live call, Demo, Settings
    ├── src/components/      shield, risk ring, stage ladder, transcript…
    └── modules/kavach-guard/  native Android code (Kotlin): call listening + warning overlay
```

## What you need

- **Node.js 20.19 or newer** (check with `node -v`)
- An **Android phone** (Android 10 or newer works best)
- A free **Groq** account: https://console.groq.com/keys
- **Telegram** on the family member's phone
- A free **Expo** account: https://expo.dev/signup (it builds the APK in the cloud, so you don't need Android Studio)

---

## Step 1: Start the backend

Open a terminal in `C:\Users\priya\Projects\kavach\backend`:

```powershell
copy .env.example .env
```

Open `.env` in VS Code and fill in:

1. **GROQ_API_KEY**: create a key at https://console.groq.com/keys
2. **TELEGRAM_BOT_TOKEN**: in Telegram, message **@BotFather** → `/newbot` → choose a name → copy the token
3. **TELEGRAM_CHAT_ID**: on the family member's phone, open your new bot and send it "hi". Then run:
   ```powershell
   npm run telegram:chatid
   ```
   Copy the number it prints into `TELEGRAM_CHAT_ID`.
4. **PROTECTED_PERSON_NAME**: e.g. `Papa` (shown in the alert)

Start it:

```powershell
npm start
```

It prints something like:

```
🛡️  Kavach backend is running
   Dashboard:  http://localhost:4000
   Phone URL:  http://192.168.1.5:4000   <- type this in the app's Settings
```

If Windows asks whether Node.js may use the network, choose **Allow** for private networks. Otherwise the phone can't reach the laptop.

Open **http://localhost:4000** and click **▶ Play demo call**. You'll see the transcript appear, the stages light up, the risk meter climb, and the alarm fire. If Telegram is set up, the family phone buzzes.

Try the evaluation too:

```powershell
npm run eval          # keyword rules only
npm run eval -- --llm # rules + Groq LLM
```

## Step 2: Build and install the app

Open a second terminal in `C:\Users\priya\Projects\kavach\app`:

```powershell
npm install
npm install -g eas-cli
eas login
npm run build:dev
```

- The first build asks to create an EAS project. Answer **yes**.
- It asks about an Android keystore. Answer **yes** (Expo creates one for you).
- After about 10 to 15 minutes you get a link and a QR code. Open it on your phone, download the APK and install it. You may have to allow "Install unknown apps" for your browser.

Then start the JS server:

```powershell
npm start
```

Open the Kavach app on the phone. It connects to your laptop and loads the app. From now on, JS changes reload instantly. You only rebuild (`npm run build:dev`) if you change the Kotlin code or `app.json`.

> **Demo-day build:** `npm run build:apk` makes a standalone APK that doesn't need `npm start`. Only the backend has to be running.

## Step 3: Set up the phone (once)

In the app:

1. **Settings** → type the *Phone URL* from step 1 → **Save and test connection**. The three rows should show *On*.
2. **Guard** tab → step 2 → **Allow** microphone and notifications.
3. **Guard** tab → step 3 → **Open accessibility settings** → *Installed apps* → **Kavach call guard** → turn it on.
   - **Greyed out / "Restricted setting"?** This is normal for apps installed from an APK on Android 13+. Tap **Open app info** → **⋮** (top right) → **Allow restricted settings**, then try again.
4. Tap **Turn guard on**. A notification "Kavach is guarding your calls" appears.
5. Recommended: Android Settings → Apps → Kavach → Battery → **Unrestricted**, so the phone doesn't kill the guard.

## Step 4: Test it

**Quick test without a call:** Settings → turn on **Listen without a call** → turn the guard off and on again. Play a scam script out loud (or read `data/calls/scam-01…json` aloud). Watch the **Live call** tab and the laptop dashboard.

**Real call test:** ask a friend to call you (phone or WhatsApp) and read a scam script. **Put the call on speaker.** The Guard screen shows "Listening to this call" and a sound meter. When the alarm fires, the red warning covers the call screen and the family gets a Telegram message.

If the sound meter stays empty during calls, Android is giving Kavach silence. Check that the accessibility service is on, then try **Settings → Microphone source → Voice recognition** (then turn the guard off and on). Phone brands behave differently here.

**Demo tab:** plays the role-played calls through the same detector without needing audio. It's useful for showing examiners both scam and genuine calls.

---

## How the detection works

| Layer | What it does | Why |
|---|---|---|
| Rules (`stages.js`) | Weighted regex patterns per stage, in English, Hinglish and Devanagari. Strong phrases ("CBI", "digital arrest") weigh a lot. Common words ("police", "₹") weigh little. | Fast, explainable, works offline |
| LLM (`groq.js`) | `gpt-oss-120b` reads the last 8 lines and scores each stage 0–1. It's told about genuine bank/courier/police calls. | Understands context and paraphrases |
| Combine (`risk.js`) | `confidence = 0.35 × rule + 0.65 × LLM` (rules only if no LLM). A stage only ever goes *up* during a call. | Once someone claimed to be CBI, that stays true |
| Risk score | Weighted sum of stages (isolation and money weigh most) + bonus when *fake officer + accusation* appear together | The script, not single words, is the signal |
| Alert | Fires when *officer + accusation + (isolation or money)*, or score ≥ 75. Once per call. | Early, but not on single keywords |

**Results with rules only on the 6 sample calls:** 3/3 scams caught, 0/3 false alarms, alert on average 33 s (43%) into the call. The genuine courier call still scores 27 because "₹899… UPI" and "20 minute mein" look like money/urgency hints. That's exactly the kind of case where the LLM layer helps, which makes a good comparison for your report.

## Growing the dataset (your research contribution)

Add calls to `backend/data/calls/` in the same format:

```jsonc
{
  "id": "scam-04",
  "title": "Short description",
  "label": "scam",              // or "genuine"
  "language": "hinglish",
  "lines": [
    { "t": 0, "speaker": "caller", "text": "…", "stages": ["impersonation"] },
    { "t": 6, "speaker": "user",   "text": "…", "stages": [] }
  ]
}
```

`stages` is your human label for each line. The evaluation uses it for stage precision/recall and to find the *ideal* alert point, so you can report how many lines after the ideal point Kavach fired. Aim for 60–100 calls and include *hard negatives* (real bank, courier, police, electricity-board calls). New calls automatically appear in the app's Demo tab and in `npm run eval`.

Research questions you can answer with `npm run eval` vs `npm run eval -- --llm`:
- How early can a reliable warning be raised? (`avgTimeToAlertSec`, `avgPctOfCallBeforeAlert`)
- How many genuine calls trigger false alarms? (`falseAlarmRate`)
- Which stages are hardest to detect? (stage precision/recall)

## Honest limitations (good for your report)

- **Android only.** iPhones don't allow any app to listen during calls.
- **Speakerphone works best.** On the earpiece, the mic mostly hears the victim's side. Victim phrases ("haan sir, kisi ko nahi bataunga") still help a little.
- **Sideloaded APK.** Google Play doesn't allow accessibility services for call listening, so this is a research prototype.
- **Device differences.** Some phone brands block call audio even for accessibility services. The microphone source setting helps on many phones.
- **Privacy.** Audio goes to your own backend and to Groq for transcription. Nothing is saved to disk. Mention consent and the DPDP Act 2023. A future version could run Whisper on the phone for full privacy.

## Troubleshooting

| Problem | Fix |
|---|---|
| App says "Can't reach the server" | Same Wi-Fi? Correct IP from the backend output? Allow Node.js in Windows Firewall (Windows Security → Firewall → Allow an app). |
| "Turn guard on" is greyed out | Finish setup steps 1 and 2 on the Guard tab. |
| Guard tab says "Demo mode only" | You opened the project in Expo Go. Install the development build from step 2. |
| Telegram shows "Off" | Fill both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`, then restart `npm start`. |
| Backend says `[llm] skipped` | Check the Groq key. Detection keeps working with rules only. |
| Hindi comes out in Urdu script | Set `WHISPER_LANGUAGE=hi` in `.env`. |
