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

  onProgress?.("Preparing video...");
  const inputData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", inputData);

  // Build a single complex filter that trims and concatenates all segments
  // This is much faster than cutting each segment individually
  if (segments.length === 1) {
    // Single segment — simple trim, no filter needed
    const s = segments[0];
    onProgress?.("Trimming...");
    await ff.exec([
      "-i", "input.mp4",
      "-ss", s.start.toFixed(3),
      "-to", s.end.toFixed(3),
      "-c", "copy",
      "-avoid_negative_ts", "make_zero",
      "output.mp4",
    ]);
  } else {
    // Multiple segments — use concat with trim filter in one pass
    // Build filter_complex string
    const filters: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      filters.push(
        `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
        `[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
      );
      concatInputs.push(`[v${i}][a${i}]`);
    }

    const filterComplex =
      filters.join(";") +
      `;${concatInputs.join("")}concat=n=${segments.length}:v=1:a=1[outv][outa]`;

    onProgress?.("Processing video...");
    await ff.exec([
      "-i", "input.mp4",
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-map", "[outa]",
      "-preset", "ultrafast",
      "-crf", "23",
      "output.mp4",
    ]);
  }

  onProgress?.("Finalizing...");
  const data = await ff.readFile("output.mp4");
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

  // Cleanup
  await ff.deleteFile("input.mp4");
  await ff.deleteFile("output.mp4");

  onProgress?.("Done!");
  return blob;
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
