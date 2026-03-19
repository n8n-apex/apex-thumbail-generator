/**
 * Audio Analysis - Silence Detection using Web Audio API
 * Analyzes audio amplitude to find silence gaps in video files
 */

export interface SilenceGap {
  start: number;
  end: number;
}

export interface AnalysisResult {
  silences: SilenceGap[];
  duration: number;
  amplitudes: number[]; // normalized 0-1 per chunk for waveform
  rawAmplitudes: number[]; // raw RMS values for re-analysis
}

/**
 * Extracts audio from a video file and analyzes it for silence gaps
 */
export async function analyzeAudio(
  file: File,
  options: {
    silenceThreshold?: number; // RMS threshold (0-1), default 0.01
    minSilenceDuration?: number; // minimum silence length in seconds, default 0.5
    chunkDuration?: number; // analysis chunk size in seconds, default 0.05
    onProgress?: (progress: number) => void;
  } = {}
): Promise<AnalysisResult> {
  const {
    silenceThreshold = 0.015,
    minSilenceDuration = 0.4,
    chunkDuration = 0.05,
    onProgress,
  } = options;

  // Decode audio from video file
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  
  onProgress?.(0.1);
  
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // mono analysis
  
  onProgress?.(0.3);

  // Analyze amplitude in chunks
  const samplesPerChunk = Math.floor(sampleRate * chunkDuration);
  const totalChunks = Math.ceil(channelData.length / samplesPerChunk);
  const amplitudes: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * samplesPerChunk;
    const end = Math.min(start + samplesPerChunk, channelData.length);
    
    // Calculate RMS for this chunk
    let sumSquares = 0;
    for (let j = start; j < end; j++) {
      sumSquares += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSquares / (end - start));
    amplitudes.push(rms);

    if (i % 100 === 0) {
      onProgress?.(0.3 + (i / totalChunks) * 0.6);
    }
  }

  // Normalize amplitudes
  const maxAmplitude = Math.max(...amplitudes, 0.001);
  const normalizedAmplitudes = amplitudes.map((a) => a / maxAmplitude);

  // Detect silence gaps
  const silences: SilenceGap[] = [];
  let silenceStart: number | null = null;

  for (let i = 0; i < amplitudes.length; i++) {
    const time = i * chunkDuration;
    const isSilent = amplitudes[i] < silenceThreshold;

    if (isSilent && silenceStart === null) {
      silenceStart = time;
    } else if (!isSilent && silenceStart !== null) {
      const silenceDuration = time - silenceStart;
      if (silenceDuration >= minSilenceDuration) {
        // Add small padding to keep natural speech rhythm
        silences.push({
          start: silenceStart + 0.1,
          end: time - 0.05,
        });
      }
      silenceStart = null;
    }
  }

  // Handle silence at the end
  if (silenceStart !== null) {
    const silenceDuration = duration - silenceStart;
    if (silenceDuration >= minSilenceDuration) {
      silences.push({
        start: silenceStart + 0.1,
        end: duration - 0.05,
      });
    }
  }

  onProgress?.(1);
  await audioContext.close();

  return {
    silences,
    duration,
    amplitudes: normalizedAmplitudes,
    rawAmplitudes: amplitudes,
  };
}

/**
 * Calculate total time saved by removing silences
 */
export function calculateTimeSaved(silences: SilenceGap[]): number {
  return silences.reduce((total, s) => total + (s.end - s.start), 0);
}

/**
 * Get non-silence segments for export
 */
export function getActiveSegments(
  silences: SilenceGap[],
  duration: number
): { start: number; end: number }[] {
  const segments: { start: number; end: number }[] = [];
  let cursor = 0;
  const sorted = [...silences].sort((a, b) => a.start - b.start);

  for (const s of sorted) {
    if (cursor < s.start) {
      segments.push({ start: cursor, end: s.start });
    }
    cursor = s.end;
  }

  if (cursor < duration) {
    segments.push({ start: cursor, end: duration });
  }

  return segments;
}
