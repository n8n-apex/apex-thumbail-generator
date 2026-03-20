/**
 * Auto Color Grading
 * Analyzes video frame luminance/color to automatically suggest optimal grading.
 */

import { ColorGradingSettings, DEFAULT_COLOR_GRADING } from "@/types/editor";

interface FrameAnalysis {
  avgBrightness: number;   // 0-1
  avgSaturation: number;   // 0-1
  warmth: number;          // -1 (cool) to 1 (warm)
  contrast: number;        // 0-1 (low to high)
  darkRatio: number;       // fraction of dark pixels
}

/**
 * Sample multiple frames from a video element and derive optimal color grading.
 */
export function autoGradeFromVideo(video: HTMLVideoElement): ColorGradingSettings {
  const analysis = analyzeVideoFrame(video);
  if (!analysis) return { ...DEFAULT_COLOR_GRADING };
  return deriveGrading(analysis);
}

function analyzeVideoFrame(video: HTMLVideoElement): FrameAnalysis | null {
  try {
    if (video.videoWidth === 0 || video.readyState < 2) return null;

    const canvas = document.createElement("canvas");
    const w = 64, h = 36; // Small sample for speed
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pixels = data.length / 4;

    let totalBrightness = 0;
    let totalSaturation = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    let darkPixels = 0;
    let brightPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += lum;
      if (lum < 0.2) darkPixels++;
      if (lum > 0.8) brightPixels++;

      // Saturation (simple HSL-based)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      totalSaturation += sat;

      totalR += r;
      totalG += g;
      totalB += b;
    }

    const avgBrightness = totalBrightness / pixels;
    const avgSaturation = totalSaturation / pixels;
    const avgR = totalR / pixels;
    const avgG = totalG / pixels;
    const avgB = totalB / pixels;

    // Warmth: positive if red-shifted, negative if blue-shifted
    const warmth = (avgR - avgB) / Math.max(0.01, avgR + avgB);

    // Contrast estimate from dark/bright pixel ratio
    const contrast = Math.min(1, (darkPixels + brightPixels) / pixels * 3);

    return {
      avgBrightness,
      avgSaturation,
      warmth,
      contrast,
      darkRatio: darkPixels / pixels,
    };
  } catch {
    return null;
  }
}

function deriveGrading(a: FrameAnalysis): ColorGradingSettings {
  const s: ColorGradingSettings = { ...DEFAULT_COLOR_GRADING };

  // Brightness correction — push toward 0.45-0.55 sweet spot
  if (a.avgBrightness < 0.35) {
    // Dark video → lift brightness
    s.brightness = Math.round((0.45 - a.avgBrightness) * 80);
  } else if (a.avgBrightness > 0.65) {
    // Overexposed → reduce
    s.brightness = Math.round((0.55 - a.avgBrightness) * 60);
  }

  // Contrast — add if flat, reduce if too harsh
  if (a.contrast < 0.15) {
    s.contrast = Math.round(15 + (0.15 - a.contrast) * 50);
  } else if (a.contrast > 0.6) {
    s.contrast = -Math.round((a.contrast - 0.5) * 30);
  } else {
    s.contrast = 10; // Slight default boost
  }

  // Saturation — boost if desaturated, reduce if oversaturated
  if (a.avgSaturation < 0.15) {
    s.saturation = Math.round(15 + (0.15 - a.avgSaturation) * 80);
  } else if (a.avgSaturation > 0.55) {
    s.saturation = -Math.round((a.avgSaturation - 0.45) * 40);
  }

  // Warmth correction — slight warm push for talking-head videos
  if (a.warmth < -0.05) {
    // Too cool → warm up
    s.warmth = Math.round(Math.abs(a.warmth) * 40);
  } else if (a.warmth > 0.15) {
    // Too warm → cool down slightly
    s.warmth = -Math.round((a.warmth - 0.1) * 25);
  } else {
    s.warmth = 5; // Subtle warmth for talking-head default
  }

  // Light vignette for professional look
  s.vignette = a.darkRatio > 0.3 ? 8 : 15;

  // Subtle fade for cinematic feel on dark videos
  if (a.avgBrightness < 0.3) {
    s.fade = 8;
  }

  // Clamp all values
  s.brightness = clamp(s.brightness, -40, 40);
  s.contrast = clamp(s.contrast, -30, 30);
  s.saturation = clamp(s.saturation, -30, 40);
  s.warmth = clamp(s.warmth, -25, 30);
  s.fade = clamp(s.fade, 0, 15);
  s.vignette = clamp(s.vignette, 0, 25);

  return s;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
