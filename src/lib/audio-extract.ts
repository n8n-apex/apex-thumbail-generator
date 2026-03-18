/**
 * Extract audio from a video file as a compressed WebM blob (small size)
 * using MediaRecorder + Web Audio API
 */
export async function extractAudioBlob(
  file: File,
  maxDurationSec = 120
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Limit duration
  const duration = Math.min(audioBuffer.duration, maxDurationSec);
  const sampleRate = audioBuffer.sampleRate;
  const length = Math.floor(duration * sampleRate);

  // Create offline context to render audio
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  await audioCtx.close();

  // Encode as WAV (small, universally supported)
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);

  // Downsample to 16kHz for speech (much smaller file)
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const newLength = Math.floor(samples.length / ratio);
  const downsampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    downsampled[i] = samples[Math.floor(i * ratio)];
  }

  const dataLength = newLength * 2; // 16-bit
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write samples as 16-bit PCM
  let offset = 44;
  for (let i = 0; i < newLength; i++) {
    const s = Math.max(-1, Math.min(1, downsampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
