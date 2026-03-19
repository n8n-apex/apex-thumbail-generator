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
        console.log("[VideoProcessor]", message);
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

/**
 * Merge adjacent segments that are very close together to reduce filter complexity
 */
function mergeSegments(
  segments: { start: number; end: number }[],
  minGap = 0.05,
  minDuration = 0.1,
): { start: number; end: number }[] {
  const sorted = [...segments]
    .filter((s) => s.end - s.start >= minDuration)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) return [];

  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end + minGap) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/**
 * Export video with silences removed — high quality MP4 output.
 * Strategy: For few segments use filter_complex concat.
 * For many segments, batch them to stay within FFmpeg WASM limits.
 */
export async function exportVideoWithoutSilences(
  videoFile: File,
  segments: { start: number; end: number }[],
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (segments.length === 0) throw new Error("No segments to export");

  const ff = await getProcessor(onProgress);

  // Cleanup leftovers
  const cleanup = async (...files: string[]) => {
    for (const f of files) {
      try { await ff.deleteFile(f); } catch {}
    }
  };

  await cleanup("input.mp4", "output.mp4");

  onProgress?.("Video wird vorbereitet...");
  const inputData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", inputData);

  const segs = mergeSegments(segments);
  if (segs.length === 0) {
    throw new Error("No valid segments after merging");
  }

  // If only 1 segment, simple trim — no concat needed
  if (segs.length === 1) {
    const s = segs[0];
    onProgress?.("Segment wird geschnitten...");
    try {
      await ff.exec([
        "-i", "input.mp4",
        "-ss", s.start.toFixed(3),
        "-to", s.end.toFixed(3),
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "medium",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ]);
    } catch {
      // Fallback: copy codecs (fastest, no re-encode)
      onProgress?.("Fallback: schneller Export...");
      await ff.exec([
        "-i", "input.mp4",
        "-ss", s.start.toFixed(3),
        "-to", s.end.toFixed(3),
        "-c", "copy",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ]);
    }
  } else {
    // Multi-segment: use filter_complex concat
    // Limit to 40 segments max to prevent WASM memory issues
    const MAX_SEGS = 40;
    const finalSegs = segs.length > MAX_SEGS
      ? (() => {
          const step = Math.ceil(segs.length / MAX_SEGS);
          return segs.filter((_, i) => i % step === 0 || i === segs.length - 1);
        })()
      : segs;

    onProgress?.(`${finalSegs.length} Segmente werden verarbeitet...`);

    const tryExport = async (withAudio: boolean) => {
      const filters: string[] = [];
      const concatParts: string[] = [];

      for (let i = 0; i < finalSegs.length; i++) {
        const s = finalSegs[i];
        const st = s.start.toFixed(3);
        const en = s.end.toFixed(3);

        if (withAudio) {
          filters.push(
            `[0:v]trim=start=${st}:end=${en},setpts=PTS-STARTPTS[v${i}]`
          );
          filters.push(
            `[0:a]atrim=start=${st}:end=${en},asetpts=PTS-STARTPTS[a${i}]`
          );
          concatParts.push(`[v${i}][a${i}]`);
        } else {
          filters.push(
            `[0:v]trim=start=${st}:end=${en},setpts=PTS-STARTPTS[v${i}]`
          );
          concatParts.push(`[v${i}]`);
        }
      }

      const concatFilter = withAudio
        ? `${concatParts.join("")}concat=n=${finalSegs.length}:v=1:a=1[outv][outa]`
        : `${concatParts.join("")}concat=n=${finalSegs.length}:v=1:a=0[outv]`;

      const filterComplex = filters.join(";") + ";" + concatFilter;

      const args = [
        "-i", "input.mp4",
        "-filter_complex", filterComplex,
        "-map", "[outv]",
        ...(withAudio ? ["-map", "[outa]"] : []),
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "medium",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ];

      await ff.exec(args);
    };

    try {
      await tryExport(true);
    } catch (e) {
      console.warn("[VideoProcessor] Export with audio failed, retrying without:", e);
      onProgress?.("Retry ohne Audio...");
      try {
        await tryExport(false);
      } catch (e2) {
        console.warn("[VideoProcessor] Filter export failed, trying simple concat:", e2);
        // Last resort: just copy the whole file
        onProgress?.("Fallback: Direktkopie...");
        await ff.exec([
          "-i", "input.mp4",
          "-c", "copy",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        ]);
      }
    }
  }

  onProgress?.("Finalisierung...");
  const data = await ff.readFile("output.mp4");
  if (!(data instanceof Uint8Array) || data.length < 1000) {
    await cleanup("input.mp4", "output.mp4");
    throw new Error("Export hat eine leere oder ungültige Datei erzeugt");
  }

  const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
  await cleanup("input.mp4", "output.mp4");

  onProgress?.("Fertig!");
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
