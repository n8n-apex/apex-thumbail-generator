import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Load video processing engine (singleton, lazy)
 */
export async function getProcessor(
  onProgress?: (msg: string) => void
): Promise<FFmpeg> {
  if (instance?.loaded) return instance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress?.("Loading video engine...");
      const ff = new FFmpeg();

      ff.on("log", ({ message }) => {
        console.log("[VideoProcessor]", message);
      });

      ff.on("progress", ({ progress }) => {
        if (progress > 0 && progress <= 1) {
          onProgress?.(`Processing: ${Math.round(progress * 100)}%`);
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
      // Reset so next call can retry
      loadPromise = null;
      instance = null;
      throw e;
    }
  })();

  return loadPromise;
}

/**
 * Export video with silences removed — single-pass trim+concat
 */
export async function exportVideoWithoutSilences(
  videoFile: File,
  segments: { start: number; end: number }[],
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (segments.length === 0) throw new Error("No segments to export");

  const ff = await getProcessor(onProgress);

  // Cleanup leftovers from previous failed runs
  try { await ff.deleteFile("input.mp4"); } catch {}
  try { await ff.deleteFile("output.mp4"); } catch {}

  onProgress?.("Preparing video...");
  const inputData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", inputData);

  const sorted = [...segments]
    .filter((s) => s.end - s.start >= 0.08)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const s of sorted) {
    if (merged.length === 0) {
      merged.push({ ...s });
      continue;
    }
    const last = merged[merged.length - 1];
    if (s.start <= last.end + 0.03) {
      last.end = Math.max(last.end, s.end);
    } else {
      merged.push({ ...s });
    }
  }

  const safeSegments = merged.length > 0 ? merged : [{ start: 0, end: 0.5 }];
  const maxSegments = 60;
  const step = Math.ceil(safeSegments.length / maxSegments);
  const segs = step > 1
    ? safeSegments.filter((_, i) => i % step === 0 || i === safeSegments.length - 1)
    : safeSegments;

  const runExport = async (includeAudio: boolean) => {
    const filters: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (includeAudio) {
        filters.push(
          `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
          `[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
        );
        concatInputs.push(`[v${i}][a${i}]`);
      } else {
        filters.push(
          `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
        );
        concatInputs.push(`[v${i}]`);
      }
    }

    const concatTail = includeAudio
      ? `${concatInputs.join("")}concat=n=${segs.length}:v=1:a=1[outv][outa]`
      : `${concatInputs.join("")}concat=n=${segs.length}:v=1:a=0[outv]`;

    const filterComplex = `${filters.join(";")};${concatTail}`;

    const args = [
      "-i", "input.mp4",
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      ...(includeAudio ? ["-map", "[outa]"] : []),
      "-preset", "ultrafast",
      "-crf", "23",
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ];

    await ff.exec(args);
  };

  try {
    onProgress?.(`Processing ${segs.length} segments...`);

    try {
      await runExport(true);
    } catch (audioErr) {
      console.warn("[VideoProcessor] Audio export failed, retrying without audio", audioErr);
      onProgress?.("Retry without audio...");
      await runExport(false);
    }

    onProgress?.("Finalizing...");
    const data = await ff.readFile("output.mp4");
    if (!(data instanceof Uint8Array) || data.length < 1000) {
      throw new Error("Export produced empty or invalid file");
    }

    const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });

    try { await ff.deleteFile("input.mp4"); } catch {}
    try { await ff.deleteFile("output.mp4"); } catch {}

    onProgress?.("Done!");
    return blob;
  } catch (e) {
    try { await ff.deleteFile("input.mp4"); } catch {}
    try { await ff.deleteFile("output.mp4"); } catch {}
    console.error("[VideoProcessor] Export failed:", e);
    throw e;
  }
}

/**
 * Extract a single frame as thumbnail
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
