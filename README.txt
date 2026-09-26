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


Tandaan v4 changes
- Removed the manual voice-language selector.
- Added automatic language classification after a transcript is received.
- Improved shopping-list parsing for English, Tagalog-style, Hiligaynon and Cebuano/Bisaya phrases.
- Improved long purchase-list parsing for comma/semicolon-separated items.
- On iOS Home Screen/PWA mode, the Speak button guides the user to the iPhone keyboard microphone when Safari speech recognition is unavailable.


Voice UI: no manual language selector. Tandaan uses automatic language detection after transcription.


Build 6: removed all visible manual language-selection UI and strengthened service-worker refresh behavior so updated HTML is fetched when online. Language classification remains internal.


Tandaan v6

This version adds a Home Screen microphone capture test using the device microphone and MediaRecorder. The recording stays local in the browser and can be previewed. Speech-to-text is intentionally not claimed yet; the next phase can add an offline multilingual transcription engine after microphone capture is verified on the iPhone XS Max and iPhone 12.
