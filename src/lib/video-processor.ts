import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Load FFmpeg WASM (singleton, lazy)
 */
export async function getFFmpeg(
  onProgress?: (msg: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress }) => {
      onProgress?.(`Processing: ${Math.round(progress * 100)}%`);
    });

    // Use single-threaded core (no SharedArrayBuffer needed)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Export video with silences removed using FFmpeg concat demuxer
 */
export async function exportVideoWithoutSilences(
  videoFile: File,
  segments: { start: number; end: number }[],
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg(onProgress);

  // Write input file
  const inputData = await fetchFile(videoFile);
  await ffmpeg.writeFile("input.mp4", inputData);

  onProgress?.("Cutting segments...");

  // Cut each segment
  const segmentFiles: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const outName = `seg_${i}.mp4`;

    await ffmpeg.exec([
      "-i", "input.mp4",
      "-ss", seg.start.toFixed(3),
      "-to", seg.end.toFixed(3),
      "-c", "copy",
      "-avoid_negative_ts", "make_zero",
      outName,
    ]);

    segmentFiles.push(outName);
    onProgress?.(`Cut segment ${i + 1}/${segments.length}`);
  }

  // Create concat list
  const concatList = segmentFiles.map((f) => `file '${f}'`).join("\n");
  const encoder = new TextEncoder();
  await ffmpeg.writeFile("concat.txt", encoder.encode(concatList));

  onProgress?.("Merging segments...");

  // Concat all segments
  await ffmpeg.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "output.mp4",
  ]);

  // Read output
  const data = await ffmpeg.readFile("output.mp4");
  const blob = new Blob([(data as Uint8Array).buffer], { type: "video/mp4" });

  // Cleanup
  await ffmpeg.deleteFile("input.mp4");
  for (const f of segmentFiles) {
    await ffmpeg.deleteFile(f);
  }
  await ffmpeg.deleteFile("concat.txt");
  await ffmpeg.deleteFile("output.mp4");

  onProgress?.("Export complete!");
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
  const ffmpeg = await getFFmpeg(onProgress);

  const inputData = await fetchFile(videoFile);
  await ffmpeg.writeFile("thumb_input.mp4", inputData);

  await ffmpeg.exec([
    "-i", "thumb_input.mp4",
    "-ss", timeInSeconds.toFixed(3),
    "-frames:v", "1",
    "-q:v", "2",
    "thumbnail.jpg",
  ]);

  const data = await ffmpeg.readFile("thumbnail.jpg");
  const blob = new Blob([(data as Uint8Array).buffer], { type: "image/jpeg" });

  await ffmpeg.deleteFile("thumb_input.mp4");
  await ffmpeg.deleteFile("thumbnail.jpg");

  return blob;
}
