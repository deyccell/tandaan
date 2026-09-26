import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;
env.cacheKey = 'tandaan-transformers-v2';
try {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.simd = true;
} catch (e) {}

const MODEL_ID = 'onnx-community/whisper-tiny';
let transcriberPromise = null;

function progressCallback(info) {
  const progress = typeof info.progress === 'number' ? info.progress : 0;
  self.postMessage({ type: 'progress', progress, file: info.file || '', status: info.status || '' });
}

async function getTranscriber() {
  if (!transcriberPromise) {
    self.postMessage({ type: 'loading', message: 'Loading multilingual Whisper locally. The first run may take a while.' });
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: progressCallback,
    });
  }
  return transcriberPromise;
}

self.onmessage = async function (event) {
  const msg = event.data || {};
  try {
    if (msg.type === 'load') {
      await getTranscriber();
      self.postMessage({ type: 'ready' });
      return;
    }

    if (msg.type === 'transcribe') {
      const transcriber = await getTranscriber();
      const audio = msg.audio;
      if (!(audio instanceof Float32Array) || !audio.length) throw new Error('No usable audio supplied');
      self.postMessage({ type: 'loading', message: 'Transcribing on this device…' });

      // No language is supplied on purpose: the multilingual Whisper model is allowed
      // to infer the spoken language instead of forcing English/Tagalog/etc.
      const result = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      self.postMessage({ type: 'result', text: result && result.text ? result.text.trim() : '' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error && error.message ? error.message : String(error) });
  }
};
