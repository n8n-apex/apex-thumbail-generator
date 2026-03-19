import { useRef, useEffect, useState, useCallback } from "react";

interface FacePosition {
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
}

const DEFAULT_POS: FacePosition = { x: 50, y: 35 };
const SMOOTHING = 0.15; // lower = smoother, slower tracking
const DETECTION_INTERVAL = 200; // ms between detections

/**
 * Tracks face position in a video element using canvas sampling.
 * Uses the FaceDetector API (Chromium) with canvas skin-tone fallback.
 */
export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [facePos, setFacePos] = useState<FacePosition>(DEFAULT_POS);
  const smoothedRef = useRef<FacePosition>(DEFAULT_POS);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const detectorFailedRef = useRef(false);

  // Initialize FaceDetector if available
  useEffect(() => {
    if (!enabled) return;
    if ("FaceDetector" in window && !detectorFailedRef.current) {
      try {
        detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        detectorFailedRef.current = true;
      }
    }
  }, [enabled]);

  const detectFace = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.videoWidth === 0) return;

    // Ensure canvas exists
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    // Sample at low resolution for performance
    const sampleW = 160;
    const sampleH = Math.round((video.videoHeight / video.videoWidth) * sampleW);
    canvas.width = sampleW;
    canvas.height = sampleH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, sampleW, sampleH);

    let detected: FacePosition | null = null;

    // Try FaceDetector API first
    if (detectorRef.current) {
      try {
        const faces = await detectorRef.current.detect(canvas);
        if (faces.length > 0) {
          const face = faces[0].boundingBox;
          detected = {
            x: ((face.x + face.width / 2) / sampleW) * 100,
            y: ((face.y + face.height / 2) / sampleH) * 100,
          };
        }
      } catch {
        detectorRef.current = null;
        detectorFailedRef.current = true;
      }
    }

    // Fallback: skin-tone detection via canvas pixels
    if (!detected) {
      const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = imageData.data;
      let sumX = 0, sumY = 0, count = 0;

      // Focus on upper 60% of frame where faces typically are
      const maxY = Math.round(sampleH * 0.65);
      for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < sampleW; x++) {
          const i = (y * sampleW + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];

          // Skin tone detection (works across various skin tones)
          if (isSkinTone(r, g, b)) {
            sumX += x;
            sumY += y;
            count++;
          }
        }
      }

      if (count > 50) {
        detected = {
          x: (sumX / count / sampleW) * 100,
          y: (sumY / count / sampleH) * 100,
        };
      }
    }

    if (detected) {
      // Clamp to reasonable range
      detected.x = Math.max(20, Math.min(80, detected.x));
      detected.y = Math.max(15, Math.min(55, detected.y));

      // Smooth the position
      smoothedRef.current = {
        x: smoothedRef.current.x + (detected.x - smoothedRef.current.x) * SMOOTHING,
        y: smoothedRef.current.y + (detected.y - smoothedRef.current.y) * SMOOTHING,
      };

      setFacePos({ ...smoothedRef.current });
    }
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      smoothedRef.current = DEFAULT_POS;
      setFacePos(DEFAULT_POS);
      return;
    }

    intervalRef.current = window.setInterval(detectFace, DETECTION_INTERVAL);
    return () => window.clearInterval(intervalRef.current);
  }, [enabled, detectFace]);

  return facePos;
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // YCbCr-based skin detection — works well across skin tones
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;

  return (
    y > 60 &&
    cb > 77 && cb < 127 &&
    cr > 133 && cr < 173
  );
}
