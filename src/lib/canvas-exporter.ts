import { TranscriptWord, SubtitleStyle, SUBTITLE_FONTS } from "@/types/editor";
import { fetchFile } from "@ffmpeg/util";
import { getProcessor, preloadProcessor } from "@/lib/video-processor";

const WORDS_PER_LINE = 3;
const SEGMENT_END_EPSILON = 1 / 30;
const STALL_FRAME_LIMIT = 45;
const RECORDER_STOP_TIMEOUT_MS = 30_000;
const RECORDER_STATE_POLL_MS = 120;
const RECORDER_FORCE_SETTLE_MS = 3_000;
const REMUX_EXEC_TIMEOUT_MIN_MS = 90_000;
const REMUX_EXEC_TIMEOUT_MAX_MS = 9 * 60_000;
const REMUX_EXEC_PER_SECOND_MS = 2_200;

interface FinalizeRecorderOptions {
  stream?: MediaStream;
  hasChunks?: () => boolean;
}

function stopStreamTracks(stream?: MediaStream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
}

async function finalizeRecorder(
  recorder: MediaRecorder,
  options: FinalizeRecorderOptions = {},
): Promise<void> {
  const { stream, hasChunks } = options;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let pollId: number | null = null;
    let forceTimeoutId: number | null = null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (pollId !== null) clearInterval(pollId);
      if (forceTimeoutId !== null) clearTimeout(forceTimeoutId);
      recorder.removeEventListener("stop", onStop);
      recorder.removeEventListener("error", onError);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const onStop = () => finish();
    const onError = () => fail("Recorder-Fehler beim Finalisieren");

    recorder.addEventListener("stop", onStop, { once: true });
    recorder.addEventListener("error", onError, { once: true });

    const timeoutId = window.setTimeout(() => {
      if (recorder.state === "inactive") {
        finish();
        return;
      }

      try {
        recorder.requestData();
      } catch {
        // Ignore: requestData can throw depending on browser state.
      }

      stopStreamTracks(stream);

      forceTimeoutId = window.setTimeout(() => {
        if (recorder.state === "inactive") {
          finish();
          return;
        }

        if (hasChunks?.()) {
          console.warn("[Export] Recorder timeout fallback: using captured chunks");
          finish();
          return;
        }

        fail("Recorder konnte nicht finalisiert werden (Timeout)");
      }, RECORDER_FORCE_SETTLE_MS);
    }, RECORDER_STOP_TIMEOUT_MS);

    pollId = window.setInterval(() => {
      if (recorder.state === "inactive") {
        finish();
      }
    }, RECORDER_STATE_POLL_MS);

    // If the recorder already stopped before this handler was attached,
    // we will never receive a stop event, so resolve on next microtask.
    if (recorder.state === "inactive") {
      queueMicrotask(finish);
      return;
    }

    try {
      recorder.requestData();
    } catch {
      // Ignore: requestData can throw depending on browser state.
    }

    try {
      recorder.stop();
    } catch {
      fail("Recorder konnte nicht gestoppt werden");
    }
  });
}

const withRemuxTimeout = async (
  task: Promise<unknown>,
  timeoutMs: number,
  label: string,
) => {
  await Promise.race([
    task,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} Timeout`)), timeoutMs);
    }),
  ]);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function getAdaptiveRemuxExecTimeout(
  durationSeconds: number,
  width: number,
  height: number,
) {
  const safeDuration = Math.max(1, durationSeconds || 0);
  const resolutionFactor = clamp((width * height) / (1280 * 720), 0.75, 3);

  const execMs = clamp(
    30_000 + Math.round(safeDuration * REMUX_EXEC_PER_SECOND_MS * resolutionFactor),
    REMUX_EXEC_TIMEOUT_MIN_MS,
    REMUX_EXEC_TIMEOUT_MAX_MS,
  );

  return execMs;
}

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
  const ffPromise = getProcessor((msg) => {
    console.log("[Export FFmpeg]", msg);
    onProgress(msg);
  });

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
  const remuxExecTimeoutMs = getAdaptiveRemuxExecTimeout(totalDuration, W, H);
  let elapsed = 0;

  recorder.start(100);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Avoid race condition: attach listener BEFORE setting currentTime.
    // If already at the target time, skip seeking entirely.
    if (Math.abs(video.currentTime - seg.start) > 0.01) {
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = seg.start;
      });
    }

    await video.play();

    await new Promise<void>((resolve) => {
      let lastTime = -1;
      let stalledFrames = 0;

      const frame = () => {
        const current = video.currentTime;
        const nearEnd = current >= seg.end - SEGMENT_END_EPSILON;

        if (nearEnd || video.paused || video.ended) {
          video.pause();
          resolve();
          return;
        }

        if (Math.abs(current - lastTime) < 0.0005) {
          stalledFrames += 1;
          if (stalledFrames >= STALL_FRAME_LIMIT) {
            console.warn("[Export] Segment stalled near end, forcing next segment", {
              segmentIndex: i,
              currentTime: current,
              segmentEnd: seg.end,
            });
            video.pause();
            resolve();
            return;
          }
        } else {
          stalledFrames = 0;
          lastTime = current;
        }

        ctx.drawImage(video, 0, 0, W, H);
        renderSubtitles(ctx, transcript, current, style, silences, W, H);

        const segElapsed = Math.min(current - seg.start, seg.end - seg.start);
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
  await finalizeRecorder(recorder, {
    stream: combined,
    hasChunks: () => chunks.length > 0,
  });

  if (chunks.length === 0) {
    throw new Error("Recorder hat keine Video-Daten erzeugt");
  }

  combined.getTracks().forEach((track) => track.stop());
  canvasStream.getTracks().forEach((track) => track.stop());

  video.src = "";
  const webmBlob = new Blob(chunks, { type: mimeType });

  // Strict MP4 export
  onProgress("Konvertiere zu MP4...");
  let ff: Awaited<typeof ffPromise> | null = null;
  try {
    ff = await ffPromise;
  } catch (e) {
    console.warn("[Export] FFmpeg engine unavailable:", e);
    throw new Error("MP4-Engine konnte nicht geladen werden");
  }

  if (!ff) {
    throw new Error("MP4-Engine nicht verfügbar");
  }

  try {
    onProgress("MP4-Konvertierung wird vorbereitet...");

    // Wire progress events so the user sees conversion %
    const onFfProgress = ({ progress }: { progress: number }) => {
      if (progress > 0 && progress <= 1) {
        onProgress(`MP4-Konvertierung: ${Math.round(progress * 100)}%`);
      }
    };
    ff.on("progress", onFfProgress);

    const webmData = await fetchFile(webmBlob);
    await ff.writeFile("input.webm", webmData);

    await withRemuxTimeout(
      ff.exec([
        "-i", "input.webm",
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ]),
      remuxExecTimeoutMs,
      "MP4-Konvertierung",
    );

    const mp4Data = await ff.readFile("output.mp4");
    try { await ff.deleteFile("output.mp4"); } catch {}
    try { await ff.deleteFile("input.webm"); } catch {}

    if (mp4Data instanceof Uint8Array && mp4Data.length > 1000) {
      onProgress("Fertig!");
      return new Blob([new Uint8Array(mp4Data)], { type: "video/mp4" });
    }

    throw new Error("MP4-Datei ungültig");
  } catch (e) {
    console.warn("[Export] MP4 remux failed:", e);
    try { await ff.deleteFile("input.webm"); } catch {}
    try { await ff.deleteFile("output.mp4"); } catch {}
    throw new Error("MP4-Konvertierung fehlgeschlagen");
  }
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
