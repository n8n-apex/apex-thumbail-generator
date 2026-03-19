/**
 * Auto-Calibration Engine
 * Analyzes audio characteristics per video and determines optimal parameters.
 * Makes every video export-ready on first pass (zero-shot).
 */

import { SilenceCutSettings } from "@/types/editor";

export interface AudioProfile {
  /** Average RMS amplitude of non-silent sections */
  avgLoudness: number;
  /** RMS of the quietest 20% of chunks (noise floor) */
  noiseFloor: number;
  /** Speech pace: average gap between speech bursts */
  avgSpeechGap: number;
  /** Dynamic range: ratio of loudest to quietest speech */
  dynamicRange: number;
  /** Percentage of audio that is speech vs silence */
  speechRatio: number;
  /** Estimated speaking speed (words per minute based on amplitude patterns) */
  estimatedPace: "slow" | "normal" | "fast";
}

export interface CalibratedSettings {
  silenceCut: SilenceCutSettings;
  profile: AudioProfile;
  confidence: number; // 0-100 how confident we are in calibration
  reasoning: string;
}

/**
 * Analyze raw amplitude data to build an audio profile,
 * then derive optimal silence-cutting parameters.
 */
export function autoCalibrateFromAmplitudes(
  rawAmplitudes: number[],
  chunkDuration: number,
  totalDuration: number,
): CalibratedSettings {
  if (rawAmplitudes.length === 0) {
    return {
      silenceCut: { enabled: true, threshold: 0.015, minDuration: 0.4, padding: 0.1 },
      profile: { avgLoudness: 0, noiseFloor: 0, avgSpeechGap: 0, dynamicRange: 1, speechRatio: 0.5, estimatedPace: "normal" },
      confidence: 0,
      reasoning: "No audio data available",
    };
  }

  const profile = buildAudioProfile(rawAmplitudes, chunkDuration, totalDuration);
  const settings = deriveOptimalSettings(profile, totalDuration);

  return settings;
}

function buildAudioProfile(
  amplitudes: number[],
  chunkDuration: number,
  totalDuration: number,
): AudioProfile {
  const sorted = [...amplitudes].sort((a, b) => a - b);
  const len = sorted.length;

  // Noise floor: average of bottom 20%
  const bottom20 = sorted.slice(0, Math.max(1, Math.floor(len * 0.2)));
  const noiseFloor = bottom20.reduce((s, v) => s + v, 0) / bottom20.length;

  // Average loudness of top 60% (speech sections)
  const top60 = sorted.slice(Math.floor(len * 0.4));
  const avgLoudness = top60.reduce((s, v) => s + v, 0) / top60.length;

  // Dynamic range
  const dynamicRange = avgLoudness / Math.max(noiseFloor, 0.0001);

  // Detect speech vs silence ratio using adaptive threshold
  const adaptiveThreshold = noiseFloor + (avgLoudness - noiseFloor) * 0.15;
  let speechChunks = 0;
  let silentChunks = 0;
  const gaps: number[] = [];
  let currentGap = 0;
  let inSpeech = false;

  for (const amp of amplitudes) {
    if (amp > adaptiveThreshold) {
      if (!inSpeech && currentGap > 0) {
        gaps.push(currentGap * chunkDuration);
      }
      speechChunks++;
      currentGap = 0;
      inSpeech = true;
    } else {
      silentChunks++;
      currentGap++;
      inSpeech = false;
    }
  }

  const speechRatio = speechChunks / Math.max(1, speechChunks + silentChunks);
  const avgSpeechGap = gaps.length > 0
    ? gaps.reduce((s, v) => s + v, 0) / gaps.length
    : 0.3;

  // Estimate pace from speech density
  let estimatedPace: "slow" | "normal" | "fast" = "normal";
  if (avgSpeechGap > 0.6 || speechRatio < 0.4) estimatedPace = "slow";
  else if (avgSpeechGap < 0.25 && speechRatio > 0.7) estimatedPace = "fast";

  return { avgLoudness, noiseFloor, avgSpeechGap, dynamicRange, speechRatio, estimatedPace };
}

function deriveOptimalSettings(
  profile: AudioProfile,
  totalDuration: number,
): CalibratedSettings {
  const { noiseFloor, avgLoudness, avgSpeechGap, dynamicRange, speechRatio, estimatedPace } = profile;

  // Threshold: set just above noise floor, scaled by dynamic range
  // Higher dynamic range = easier to separate speech from silence
  let threshold: number;
  if (dynamicRange > 10) {
    // Clean audio with clear speech/silence distinction
    threshold = noiseFloor * 2.5;
  } else if (dynamicRange > 4) {
    // Moderate distinction
    threshold = noiseFloor + (avgLoudness - noiseFloor) * 0.12;
  } else {
    // Noisy audio — be conservative
    threshold = noiseFloor + (avgLoudness - noiseFloor) * 0.2;
  }
  // Clamp to sensible range
  threshold = Math.max(0.005, Math.min(0.08, threshold));

  // Min duration: based on speaking pace
  let minDuration: number;
  switch (estimatedPace) {
    case "fast":
      minDuration = 0.25; // Fast speakers have shorter natural pauses
      break;
    case "slow":
      minDuration = 0.6; // Slow speakers have longer natural pauses — don't cut them
      break;
    default:
      minDuration = 0.4;
  }

  // Padding: protect speech edges
  // Higher dynamic range = cleaner edges = less padding needed
  let padding: number;
  if (dynamicRange > 8) {
    padding = 0.06;
  } else if (dynamicRange > 4) {
    padding = 0.1;
  } else {
    padding = 0.15; // Noisy audio needs more protection
  }

  // Confidence based on how well we can distinguish speech
  let confidence = 50;
  if (dynamicRange > 6) confidence += 20;
  if (dynamicRange > 10) confidence += 10;
  if (speechRatio > 0.3 && speechRatio < 0.85) confidence += 10;
  if (totalDuration > 5) confidence += 10;
  confidence = Math.min(100, confidence);

  const reasoning = [
    `Audio-Profil: ${estimatedPace === "fast" ? "schnelles" : estimatedPace === "slow" ? "langsames" : "normales"} Sprechtempo`,
    `Dynamik: ${dynamicRange.toFixed(1)}x (${dynamicRange > 8 ? "sehr klar" : dynamicRange > 4 ? "gut" : "verrauscht"})`,
    `Sprachanteil: ${(speechRatio * 100).toFixed(0)}%`,
    `Ø Pause: ${(avgSpeechGap * 1000).toFixed(0)}ms`,
    `→ Threshold: ${(threshold * 1000).toFixed(1)}, MinPause: ${(minDuration * 1000).toFixed(0)}ms, Padding: ${(padding * 1000).toFixed(0)}ms`,
  ].join(" | ");

  return {
    silenceCut: { enabled: true, threshold, minDuration, padding },
    profile,
    confidence,
    reasoning,
  };
}
