Tandaan v8

This version adds local multilingual speech-to-text using Transformers.js + the ONNX community Whisper Tiny model.

FIRST SETUP
1. Open Tandaan while connected to the internet.
2. Tap "Prepare offline voice".
3. Wait until it says "Offline voice ready".
4. The model and ONNX WASM files are cached by Transformers.js in the browser.
5. After setup, tap Speak, record, and Tandaan transcribes the audio on-device.

IMPORTANT
The first model setup needs internet. The first download is tens of MB. After the model is cached, the transcription itself does not use Safari SpeechRecognition or a cloud speech service.

MODEL
onnx-community/whisper-tiny (multilingual), using the WASM backend with q8 weights. The app intentionally does not force a language so the model can handle automatic language inference.

VOICE FLOW
Prepare model -> Speak -> Stop -> local transcription -> review transcript -> Use this text -> Add

MAX RECORDING
90 seconds per recording in this version.
