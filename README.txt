TANDAAN - OFFLINE PERSONAL LIST

v3: Voice-ready mobile foundation.

Features:
- Todo, shopping and purchase lists
- Philippine peso totals
- Local device storage
- PWA/Home Screen support
- Offline cache
- Voice input button with browser speech-recognition support where available
- iOS 12 fallback: tap the text field and use the iPhone keyboard microphone
- Local-word normalization for common English / Tagalog / Hiligaynon / Cebuano-style commands

IMPORTANT ABOUT VOICE:
The Web Speech API is not reliably available in older iOS Safari versions such as iOS 12. This build therefore keeps voice recognition optional: browsers that expose SpeechRecognition can use the Speak button; older iPhones can use the iPhone keyboard's dictation microphone, which feeds text into Tandaan.

This does not yet provide a fully offline, in-browser multilingual speech model. The next voice-engine phase can add a bundled local model/worker if performance and storage targets are acceptable on the XS Max.

Run locally:
  npx serve -l 4173

Then open:
  http://localhost:4173
