import { TranscriptWord, SubtitleStyle, SUBTITLE_FONTS } from "@/types/editor";
import { fetchFile } from "@ffmpeg/util";
import { getProcessor, preloadProcessor } from "@/lib/video-processor";

const WORDS_PER_LINE = 3;

interface ExportOptions {
  videoUrl: string;
  segments: { start: number; end: number }[];
  transcript: TranscriptWord[];
  style: SubtitleStyle;
  silences: { start: number; end: number }[];
  onProgress: (msg: string) => void;
}

/** Warm up FFmpeg in the background so export starts instantly. */
export const preloadRemuxer = preloadProcessor;

export async function exportWithSubtitles(opts: ExportOptions): Promise<Blob> {
  const { videoUrl, segments, transcript, style, silences, onProgress } = opts;

  if (segments.length === 0) throw new Error("Keine Segmente zum Exportieren");

  onProgress("Video wird vorbereitet...");
  // Start loading shared FFmpeg in parallel while recording runs.
  const ffPromise = getProcessor((msg) => console.log("[Export FFmpeg]", msg));

  const video = document.createElement("video");
  video.src = videoUrl;
  video.playsInline = true;
  video.preload = "auto";
  video.muted = true;

  await new Promise<void>((resolve, reject) => {
    video.oncanplaythrough = () => resolve();
    video.onerror = () => reject(new Error("Video konnte nicht geladen werden"));
    video.load();
  });

  const W = video.videoWidth || 1080;
  const H = video.videoHeight || 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Build combined stream: canvas video + video audio
  const canvasStream = canvas.captureStream(30);
  let combined: MediaStream;

  try {
    const videoStream = (video as any).captureStream();
    const audioTracks = videoStream.getAudioTracks();
    combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);
  } catch {
    console.warn("[Export] captureStream not available, exporting without audio");
    combined = canvasStream;
  }

  // MediaRecorder — WebM first (universally supported), then remux to MP4
  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  let elapsed = 0;

  recorder.start(100);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    video.currentTime = seg.start;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });

    await video.play();

    await new Promise<void>((resolve) => {
      const frame = () => {
        if (video.currentTime >= seg.end || video.paused || video.ended) {
          video.pause();
          resolve();
          return;
        }

        ctx.drawImage(video, 0, 0, W, H);
        renderSubtitles(ctx, transcript, video.currentTime, style, silences, W, H);

        const segElapsed = video.currentTime - seg.start;
        const pct = Math.round(((elapsed + segElapsed) / totalDuration) * 100);
        onProgress(`Aufnahme: ${pct}%`);

        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    elapsed += seg.end - seg.start;
  }

  // Stop recording → WebM blob
  onProgress("Aufnahme abgeschlossen...");
  recorder.stop();
  await new Promise<void>((r) => {
    recorder.onstop = () => r();
  });

  video.src = "";
  const webmBlob = new Blob(chunks, { type: mimeType });

  // Remux WebM → MP4 via shared FFmpeg instance
  onProgress("MP4-Engine wird geladen...");
  const ff = await Promise.race([
    ffPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("FFmpeg-Engine reagiert nicht (Timeout)")), 90_000)
    ),
  ]);

  onProgress("Konvertiere zu MP4...");  
  const webmData = await fetchFile(webmBlob);
  await ff.writeFile("input.webm", webmData);

  // Strategy 1: forced MP4 encode (works for any MediaRecorder WebM codec)
  try {
    await ff.exec([
      "-i", "input.webm",
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ]);
    
    const mp4Data = await ff.readFile("output.mp4");
    try { await ff.deleteFile("output.mp4"); } catch {}
    
    if (mp4Data instanceof Uint8Array && mp4Data.length > 1000) {
      onProgress("Fertig!");
      try { await ff.deleteFile("input.webm"); } catch {}
      return new Blob([new Uint8Array(mp4Data)], { type: "video/mp4" });
    }
  } catch (e) {
    console.warn("[Export] MP4 remux failed, trying MOV:", e);
  }

  // Strategy 2: MOV fallback encode
  try {
    await ff.exec([
      "-i", "input.webm",
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "160k",
      "-y", "output.mov",
    ]);
    
    const movData = await ff.readFile("output.mov");
    try { await ff.deleteFile("output.mov"); } catch {}
    
    if (movData instanceof Uint8Array && movData.length > 1000) {
      onProgress("Fertig!");
      try { await ff.deleteFile("input.webm"); } catch {}
      return new Blob([new Uint8Array(movData)], { type: "video/quicktime" });
    }
  } catch (e) {
    console.warn("[Export] MOV remux also failed:", e);
  }

  try { await ff.deleteFile("input.webm"); } catch {}

  throw new Error("Export fehlgeschlagen: Weder MP4 noch MOV konnten erzeugt werden");
}

// ── Subtitle renderer for canvas ──────────────────────────────

function renderSubtitles(
  ctx: CanvasRenderingContext2D,
  transcript: TranscriptWord[],
  currentTime: number,
  style: SubtitleStyle,
  silences: { start: number; end: number }[],
  W: number,
  H: number,
) {
  const t = currentTime - (style.timeOffset ?? 0);

  // Skip during silences
  for (const s of silences) {
    if (t >= s.start && t < s.end) return;
  }

  const activeIdx = findActive(transcript, t);
  if (activeIdx === -1) return;

  const maxLines = style.boxHeight ?? 2;
  const phraseSize = WORDS_PER_LINE * maxLines;
  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);
  const words = transcript.slice(phraseStart, phraseEnd);
  const activeInPhrase = activeIdx - phraseStart;

  const fontConfig = SUBTITLE_FONTS[style.font] ?? SUBTITLE_FONTS.montserrat;
  const fontFamily = fontConfig.family.replace(/'/g, "");

  // Scale font size to canvas resolution (style.fontSize is designed for ~400px wide preview)
  const fontSize = Math.round(style.fontSize * (W / 400) * 0.38);

  ctx.save();
  ctx.font = `${fontConfig.weight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Build lines
  const lines: { text: string; wordData: { text: string; isActive: boolean; isPast: boolean }[] }[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
    const chunk = words.slice(i, i + WORDS_PER_LINE);
    lines.push({
      text: chunk.map((w) => w.text.toUpperCase()).join(" "),
      wordData: chunk.map((w, j) => ({
        text: w.text.toUpperCase(),
        isActive: i + j === activeInPhrase,
        isPast: i + j < activeInPhrase,
      })),
    });
  }

  const x = W * (style.positionX / 100);
  const y = H * (style.positionY / 100);
  const lineHeight = fontSize * 1.3;
  const bgBox = style.backgroundBox ?? "none";
  const isOnLight = bgBox === "white";

  // Background box
  if (bgBox !== "none") {
    const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l.text).width));
    const boxW = maxLineW + fontSize * 1.5;
    const boxH = lines.length * lineHeight + fontSize * 0.8;
    const bx = x - boxW / 2;
    const by = y - boxH / 2;
    const r = fontSize * 0.3;

    ctx.fillStyle = bgBox === "black" ? "rgba(0,0,0,0.82)" : "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, r);
    ctx.fill();
  }

  // Draw lines with word-level highlighting
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  for (let li = 0; li < lines.length; li++) {
    const ly = startY + li * lineHeight;
    const line = lines[li];

    // Measure total line width for left-alignment of words
    const spaceWidth = ctx.measureText(" ").width;
    const wordWidths = line.wordData.map((w) => ctx.measureText(w.text).width);
    const totalW = wordWidths.reduce((s, w) => s + w, 0) + spaceWidth * (line.wordData.length - 1);
    let wx = x - totalW / 2;

    for (let wi = 0; wi < line.wordData.length; wi++) {
      const w = line.wordData[wi];
      const ww = wordWidths[wi];
      const wordCx = wx + ww / 2;

      // Drop shadow
      if (!isOnLight) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillText(w.text, wordCx + 2, ly + 2);
      }

      // Active word: accent color + slight size bump
      if (w.isActive) {
        ctx.save();
        const bigSize = Math.round(fontSize * 1.15);
        ctx.font = `${fontConfig.weight} ${bigSize}px ${fontFamily}`;
        ctx.fillStyle = style.accentColor;

        // Glow effect for neon preset
        if (style.preset === "neon") {
          ctx.shadowColor = style.accentColor;
          ctx.shadowBlur = fontSize * 0.4;
        }

        ctx.fillText(w.text, wordCx, ly);
        ctx.restore();
        ctx.font = `${fontConfig.weight} ${fontSize}px ${fontFamily}`;
      } else if (w.isPast) {
        ctx.fillStyle = isOnLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)";
        ctx.fillText(w.text, wordCx, ly);
      } else {
        ctx.fillStyle = isOnLight ? "#000" : "#FFF";
        ctx.fillText(w.text, wordCx, ly);
      }

      wx += ww + spaceWidth;
    }
  }

  ctx.restore();
}

function findActive(transcript: TranscriptWord[], t: number): number {
  let lo = 0;
  let hi = transcript.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (t < transcript[mid].start) hi = mid - 1;
    else if (t > transcript[mid].end) lo = mid + 1;
    else return mid;
  }

  // Proximity check
  for (let i = Math.max(0, lo - 2); i <= Math.min(transcript.length - 1, lo + 1); i++) {
    if (t >= transcript[i].start - 0.05 && t <= transcript[i].end + 0.2) return i;
  }

  return -1;
}
