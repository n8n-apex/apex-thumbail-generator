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

  // Clean up any leftover files from previous failed exports
  try { await ff.deleteFile("input.mp4"); } catch {}
  try { await ff.deleteFile("output.mp4"); } catch {}

  onProgress?.("Preparing video...");
  const inputData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", inputData);

  try {
    if (segments.length === 1) {
      const s = segments[0];
      onProgress?.("Trimming...");
      await ff.exec([
        "-i", "input.mp4",
        "-ss", s.start.toFixed(3),
        "-to", s.end.toFixed(3),
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        "-y", "output.mp4",
      ]);
    } else {
      // Limit segments to avoid filter_complex overflow (max ~50 segments)
      const maxSegments = 50;
      const segs = segments.length > maxSegments
        ? segments.filter((_, i) => i % Math.ceil(segments.length / maxSegments) === 0 || i === segments.length - 1)
        : segments;

      const filters: string[] = [];
      const concatInputs: string[] = [];

      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        filters.push(
          `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
          `[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
        );
        concatInputs.push(`[v${i}][a${i}]`);
      }

      const filterComplex =
        filters.join(";") +
        `;${concatInputs.join("")}concat=n=${segs.length}:v=1:a=1[outv][outa]`;

      onProgress?.(`Processing ${segs.length} segments...`);
      await ff.exec([
        "-i", "input.mp4",
        "-filter_complex", filterComplex,
        "-map", "[outv]",
        "-map", "[outa]",
        "-preset", "ultrafast",
        "-crf", "23",
        "-y", "output.mp4",
      ]);
    }

    onProgress?.("Finalizing...");
    const data = await ff.readFile("output.mp4");
    if (!(data instanceof Uint8Array) || data.length < 1000) {
      throw new Error("Export produced empty or invalid file");
    }
    const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });

    // Cleanup
    try { await ff.deleteFile("input.mp4"); } catch {}
    try { await ff.deleteFile("output.mp4"); } catch {}

    onProgress?.("Done!");
    return blob;
  } catch (e) {
    // Cleanup on error
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
