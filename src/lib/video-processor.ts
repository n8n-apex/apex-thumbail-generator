import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getProcessor(
  onProgress?: (msg: string) => void
): Promise<FFmpeg> {
  if (instance?.loaded) return instance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress?.("Video-Engine wird geladen...");
      const ff = new FFmpeg();

      ff.on("log", ({ message }) => {
        console.log("[FFmpeg]", message);
      });

      ff.on("progress", ({ progress }) => {
        if (progress > 0 && progress <= 1) {
          onProgress?.(`Verarbeitung: ${Math.round(progress * 100)}%`);
        }
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      instance = ff;
      return ff;
    } catch (e) {
      loadPromise = null;
      instance = null;
      throw e;
    }
  })();

  return loadPromise;
}

/** Safe file cleanup */
async function cleanup(ff: FFmpeg, ...files: string[]) {
  for (const f of files) {
    try { await ff.deleteFile(f); } catch {}
  }
}

/**
 * Merge adjacent segments and filter out tiny ones
 */
function prepareSegments(
  segments: { start: number; end: number }[],
): { start: number; end: number }[] {
  const sorted = [...segments]
    .filter((s) => s.end - s.start >= 0.05)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) return [];

  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    // Merge segments that are within 50ms of each other
    if (sorted[i].start <= last.end + 0.05) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/**
 * Strategy 1: Segment-by-segment cut + concat demuxer.
 * Most reliable approach — cuts each segment individually with stream copy,
 * then concatenates using the concat demuxer. No complex filter graphs.
 */
async function exportViaSegmentConcat(
  ff: FFmpeg,
  segs: { start: number; end: number }[],
  onProgress?: (msg: string) => void,
): Promise<boolean> {
  const segFiles: string[] = [];

  try {
    // Step 1: Cut each segment with re-encode for frame-accurate cuts
    // Stream copy (-c copy) cuts at keyframes which causes imprecise start/end
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const outName = `seg_${i}.mp4`;
      segFiles.push(outName);

      onProgress?.(`Schneide Segment ${i + 1}/${segs.length}...`);

      // Use -ss before -i for fast seeking, then re-encode for frame accuracy
      await ff.exec([
        "-ss", s.start.toFixed(3),
        "-i", "input.mp4",
        "-t", (s.end - s.start).toFixed(3),
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-avoid_negative_ts", "make_zero",
        "-y", outName,
      ]);
    }

    // Step 2: Create concat list file
    const concatList = segFiles.map((f) => `file '${f}'`).join("\n");
    const encoder = new TextEncoder();
    await ff.writeFile("concat.txt", encoder.encode(concatList));

    // Step 3: Concatenate all segments (stream copy since all are same codec now)
    onProgress?.("Segmente werden zusammengefügt...");
    await ff.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "concat.txt",
      "-c", "copy",
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ]);

    return true;
  } catch (e) {
    console.warn("[FFmpeg] Segment concat failed:", e);
    return false;
  } finally {
    for (const f of segFiles) {
      await cleanup(ff, f);
    }
    await cleanup(ff, "concat.txt");
  }
}

/**
 * Strategy 2: filter_complex trim+concat (re-encodes, handles codec mismatches)
 */
async function exportViaFilterComplex(
  ff: FFmpeg,
  segs: { start: number; end: number }[],
  onProgress?: (msg: string) => void,
): Promise<boolean> {
  // Limit segments to avoid WASM memory issues
  const MAX_SEGS = 30;
  const finalSegs = segs.length > MAX_SEGS
    ? (() => {
        const step = Math.ceil(segs.length / MAX_SEGS);
        return segs.filter((_, i) => i % step === 0 || i === segs.length - 1);
      })()
    : segs;

  const tryWithAudio = async (withAudio: boolean) => {
    const filters: string[] = [];
    const concatParts: string[] = [];

    for (let i = 0; i < finalSegs.length; i++) {
      const s = finalSegs[i];
      const st = s.start.toFixed(3);
      const en = s.end.toFixed(3);

      filters.push(
        `[0:v]trim=start=${st}:end=${en},setpts=PTS-STARTPTS[v${i}]`
      );

      if (withAudio) {
        filters.push(
          `[0:a]atrim=start=${st}:end=${en},asetpts=PTS-STARTPTS[a${i}]`
        );
        concatParts.push(`[v${i}][a${i}]`);
      } else {
        concatParts.push(`[v${i}]`);
      }
    }

    const n = finalSegs.length;
    const concatFilter = withAudio
      ? `${concatParts.join("")}concat=n=${n}:v=1:a=1[outv][outa]`
      : `${concatParts.join("")}concat=n=${n}:v=1:a=0[outv]`;

    const filterComplex = filters.join(";") + ";" + concatFilter;

    await ff.exec([
      "-i", "input.mp4",
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      ...(withAudio ? ["-map", "[outa]"] : []),
      "-c:v", "libx264",
      "-crf", "18",
      "-preset", "ultrafast",
      ...(withAudio ? ["-c:a", "aac", "-b:a", "192k"] : []),
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ]);
  };

  try {
    onProgress?.(`${finalSegs.length} Segmente werden re-encodiert...`);
    await tryWithAudio(true);
    return true;
  } catch (e) {
    console.warn("[FFmpeg] filter_complex with audio failed:", e);
    try {
      onProgress?.("Retry ohne Audio...");
      await tryWithAudio(false);
      return true;
    } catch (e2) {
      console.warn("[FFmpeg] filter_complex without audio failed:", e2);
      return false;
    }
  }
}

/**
 * Strategy 3: Simple single-segment trim (for 1 segment or last resort)
 */
async function exportSimpleTrim(
  ff: FFmpeg,
  start: number,
  end: number,
  onProgress?: (msg: string) => void,
): Promise<boolean> {
  const duration = end - start;
  try {
    // Re-encode for frame-accurate cutting (stream copy cuts at keyframes = imprecise)
    onProgress?.("Video wird geschnitten...");
    await ff.exec([
      "-ss", start.toFixed(3),
      "-i", "input.mp4",
      "-t", duration.toFixed(3),
      "-c:v", "libx264",
      "-crf", "18",
      "-preset", "ultrafast",
      "-c:a", "aac",
      "-b:a", "192k",
      "-avoid_negative_ts", "make_zero",
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ]);
    return true;
  } catch (e) {
    console.warn("[FFmpeg] Re-encode trim failed:", e);
    // Fallback: stream copy (less accurate but more compatible)
    try {
      onProgress?.("Fallback-Export...");
      await ff.exec([
        "-ss", start.toFixed(3),
        "-i", "input.mp4",
        "-t", duration.toFixed(3),
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ]);
      return true;
    } catch (e2) {
      console.warn("[FFmpeg] Simple trim copy failed:", e2);
      return false;
    }
  }
}

/**
 * Export video with silences removed — cascading strategies:
 * 1. Segment-by-segment copy + concat demuxer (fastest, best quality)
 * 2. filter_complex re-encode (handles codec issues)
 * 3. Simple copy (full file fallback)
 */
export async function exportVideoWithoutSilences(
  videoFile: File,
  segments: { start: number; end: number }[],
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (segments.length === 0) throw new Error("Keine Segmente zum Exportieren");

  const ff = await getProcessor(onProgress);
  await cleanup(ff, "input.mp4", "output.mp4");

  onProgress?.("Video wird vorbereitet...");
  const inputData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", inputData);

  const segs = prepareSegments(segments);
  if (segs.length === 0) {
    await cleanup(ff, "input.mp4");
    throw new Error("Keine gültigen Segmente nach Filterung");
  }

  let success = false;

  if (segs.length === 1) {
    // Single segment — simple trim
    success = await exportSimpleTrim(ff, segs[0].start, segs[0].end, onProgress);
  } else {
    // Multi-segment: try strategies in order
    // Strategy 1: segment-by-segment copy + concat (fastest, preserves quality)
    success = await exportViaSegmentConcat(ff, segs, onProgress);

    // Strategy 2: filter_complex re-encode
    if (!success) {
      await cleanup(ff, "output.mp4");
      success = await exportViaFilterComplex(ff, segs, onProgress);
    }

    // Strategy 3: just copy the full file as-is
    if (!success) {
      console.warn("[FFmpeg] All multi-segment strategies failed, copying full file");
      onProgress?.("Fallback: Vollständige Datei...");
      try {
        await ff.exec([
          "-i", "input.mp4",
          "-c", "copy",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        ]);
        success = true;
      } catch {
        success = false;
      }
    }
  }

  if (!success) {
    await cleanup(ff, "input.mp4", "output.mp4");
    throw new Error("Export fehlgeschlagen — alle Strategien sind gescheitert");
  }

  onProgress?.("Finalisierung...");
  const data = await ff.readFile("output.mp4");
  if (!(data instanceof Uint8Array) || data.length < 1000) {
    await cleanup(ff, "input.mp4", "output.mp4");
    throw new Error("Export hat eine leere oder ungültige Datei erzeugt");
  }

  const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
  await cleanup(ff, "input.mp4", "output.mp4");

  onProgress?.("Fertig!");
  return blob;
}

/**
 * Extract a single frame as JPEG thumbnail
 */
export async function extractFrame(
  videoFile: File,
  timeInSeconds: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await getProcessor(onProgress);

  const inputData = await fetchFile(videoFile);
  await ff.writeFile("thumb_input.mp4", inputData);

  await ff.exec([
    "-i", "thumb_input.mp4",
    "-ss", timeInSeconds.toFixed(3),
    "-frames:v", "1",
    "-q:v", "2",
    "thumbnail.jpg",
  ]);

  const data = await ff.readFile("thumbnail.jpg");
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "image/jpeg" });

  await ff.deleteFile("thumb_input.mp4");
  await ff.deleteFile("thumbnail.jpg");

  return blob;
}
