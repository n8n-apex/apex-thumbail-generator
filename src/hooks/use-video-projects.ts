import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { TranscriptWord, SilenceCutSettings, MOCK_TRANSCRIPT, MOCK_SILENCES } from "@/types/editor";
import { VideoProject, createVideoProject } from "@/types/video-project";
import { analyzeAudio, getActiveSegments, type SilenceGap } from "@/lib/audio-analysis";
import { extractAudioBlob } from "@/lib/audio-extract";
import { exportWithSubtitles } from "@/lib/canvas-exporter";
import { validateAndRepairTranscript } from "@/lib/transcript-validator";
import { alignTranscriptToAudioTimeline } from "@/lib/transcript-sync";
import { autoCalibrateFromAmplitudes } from "@/lib/auto-calibrate";
import { autoGradeFromVideo } from "@/lib/auto-color-grading";
import { applyCorrections } from "@/components/reel/TranscriptEditor";
import { supabase } from "@/integrations/supabase/client";

const CHUNK_DURATION = 0.05;

// Filler words to remove across common languages (DE, EN, FR, ES, etc.)
const FILLER_WORDS = new Set([
  // German
  "ähm", "äh", "ehm", "eh", "hm", "hmm", "mhm", "öhm", "öh", "ähh", "ehh",
  "halt", "quasi", "sozusagen", "irgendwie", "eigentlich", "ja", "ne", "naja",
  "genau", "also", "eben", "tja",
  // English
  "um", "uh", "uhm", "hmm", "hm", "er", "like", "you know", "i mean",
  "basically", "literally", "actually", "right",
  // French
  "euh", "bah", "ben", "hein",
  // Spanish
  "este", "pues", "bueno",
]);

// Filter out garbled/nonsensical words and filler words for clean subtitle flow
function cleanTranscript(words: TranscriptWord[]): TranscriptWord[] {
  return words.filter((w) => {
    const text = w.text.trim();
    // Remove empty words
    if (!text) return false;
    // Remove very low confidence words
    if (w.confidence < 0.4) return false;
    // Remove filler words (case-insensitive)
    if (FILLER_WORDS.has(text.toLowerCase())) return false;
    // Remove single characters that aren't real words (allow "I", "a" etc)
    if (text.length === 1 && !/[A-Za-zÄÖÜäöü0-9]/.test(text)) return false;
    // Remove words that are just punctuation/symbols
    if (/^[^\p{L}\p{N}]+$/u.test(text)) return false;
    // Remove words with impossible timing (negative duration or extremely short)
    if (w.end - w.start < 0.01) return false;
    return true;
  });
}

function redetectSilences(
  amplitudes: number[],
  chunkDuration: number,
  totalDuration: number,
  settings: SilenceCutSettings,
): SilenceGap[] {
  if (!settings.enabled || amplitudes.length === 0) return [];
  const silences: SilenceGap[] = [];
  let silenceStart: number | null = null;
  for (let i = 0; i < amplitudes.length; i++) {
    const time = i * chunkDuration;
    const isSilent = amplitudes[i] < settings.threshold;
    if (isSilent && silenceStart === null) {
      silenceStart = time;
    } else if (!isSilent && silenceStart !== null) {
      const dur = time - silenceStart;
      if (dur >= settings.minDuration) {
        silences.push({
          start: silenceStart + settings.padding,
          end: Math.max(time - settings.padding * 0.5, silenceStart + settings.padding + 0.01),
        });
      }
      silenceStart = null;
    }
  }
  if (silenceStart !== null) {
    const dur = totalDuration - silenceStart;
    if (dur >= settings.minDuration) {
      silences.push({
        start: silenceStart + settings.padding,
        end: Math.max(totalDuration - settings.padding * 0.5, silenceStart + settings.padding + 0.01),
      });
    }
  }

  // Force-trim leading background noise (first 0.4s if mostly quiet)
  const leadChunks = Math.min(Math.ceil(0.4 / chunkDuration), amplitudes.length);
  const leadAvg = amplitudes.slice(0, leadChunks).reduce((a, b) => a + b, 0) / leadChunks;
  if (leadAvg < settings.threshold * 3) {
    // Find exact point where audio actually starts
    let firstLoudChunk = 0;
    for (let i = 0; i < amplitudes.length; i++) {
      if (amplitudes[i] >= settings.threshold * 2) {
        firstLoudChunk = i;
        break;
      }
    }
    const trimEnd = Math.max(firstLoudChunk * chunkDuration - 0.05, 0);
    if (trimEnd > 0.02) {
      // Remove any existing silence that overlaps with our forced trim
      const filtered = silences.filter(s => s.start >= trimEnd);
      silences.length = 0;
      silences.unshift({ start: 0, end: trimEnd });
      silences.push(...filtered);
    }
  }

  // Force-trim trailing background noise (last 0.4s if mostly quiet)
  const tailStart = Math.max(0, amplitudes.length - leadChunks);
  const tailAvg = amplitudes.slice(tailStart).reduce((a, b) => a + b, 0) / leadChunks;
  if (tailAvg < settings.threshold * 3) {
    // Find exact point where audio ends
    let lastLoudChunk = amplitudes.length - 1;
    for (let i = amplitudes.length - 1; i >= 0; i--) {
      if (amplitudes[i] >= settings.threshold * 2) {
        lastLoudChunk = i;
        break;
      }
    }
    const trimStart = Math.min((lastLoudChunk + 1) * chunkDuration + 0.05, totalDuration);
    if (totalDuration - trimStart > 0.02) {
      // Remove any existing silence that overlaps with our forced trim
      const filtered = silences.filter(s => s.end <= trimStart);
      const nonOverlapping = silences.filter(s => s.end > trimStart);
      if (nonOverlapping.length > 0) {
        // Keep only the non-overlapping parts
      }
      silences.length = 0;
      silences.push(...filtered);
      silences.push({ start: trimStart, end: totalDuration });
    }
  }

  return silences;
}

function reconcileSilencesWithTranscript(
  silences: SilenceGap[],
  transcript: TranscriptWord[],
): SilenceGap[] {
  if (transcript.length === 0) return silences;
  const result: SilenceGap[] = [];
  const MARGIN = 0.05;
  for (const gap of silences) {
    const overlapping = transcript.filter(
      (w) => w.end > gap.start + MARGIN && w.start < gap.end - MARGIN
    );
    if (overlapping.length === 0) { result.push(gap); continue; }
    let cursor = gap.start;
    for (const word of overlapping) {
      const subGapEnd = word.start - MARGIN;
      if (subGapEnd - cursor >= 0.1) result.push({ start: cursor, end: subGapEnd });
      cursor = word.end + MARGIN;
    }
    if (gap.end - cursor >= 0.1) result.push({ start: cursor, end: gap.end });
  }
  return result;
}

export function useVideoProjects() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const processingRef = useRef(new Set<string>());
  const projectsRef = useRef<VideoProject[]>([]);
  // Keep ref in sync so callbacks always see latest state
  projectsRef.current = projects;

  const updateProject = useCallback((id: string, updates: Partial<VideoProject>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const updateProjectStep = useCallback((id: string, stepIdx: number, upd: { done?: boolean; active?: boolean }) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, steps: p.steps.map((s, i) => (i === stepIdx ? { ...s, ...upd } : s)) }
          : p
      )
    );
  }, []);

  const processVideo = useCallback(async (project: VideoProject) => {
    if (processingRef.current.has(project.id)) return;
    processingRef.current.add(project.id);
    const id = project.id;

    try {
      // Step 1: Analyze audio
      const result = await analyzeAudio(project.file, {
        silenceThreshold: 0.015, // Initial pass — will be overridden by calibration
        minSilenceDuration: 0.4,
        chunkDuration: CHUNK_DURATION,
        onProgress: (p) => updateProject(id, { progress: p }),
      });

      updateProjectStep(id, 0, { done: true, active: false });
      updateProjectStep(id, 1, { active: true });
      updateProject(id, { 
        currentStep: "KI kalibriert Parameter...", 
        rawAmplitudes: result.rawAmplitudes, 
        duration: result.duration, 
        progress: 0 
      });

      // Step 2: Auto-calibrate — analyze audio profile and derive optimal settings per video
      const calibration = autoCalibrateFromAmplitudes(
        result.rawAmplitudes, CHUNK_DURATION, result.duration
      );
      console.log(`Auto-calibration (confidence ${calibration.confidence}/100): ${calibration.reasoning}`);

      // Apply calibrated silence settings
      const calibratedSC = calibration.silenceCut;
      updateProject(id, { 
        silenceCut: calibratedSC,
        calibrationReasoning: calibration.reasoning,
      });

      const detectedSilences = redetectSilences(
        result.rawAmplitudes, CHUNK_DURATION, result.duration, calibratedSC
      );

      updateProjectStep(id, 1, { done: true, active: false });
      updateProjectStep(id, 2, { active: true });
      updateProject(id, { currentStep: "Audio wird extrahiert..." });

      // Step 3: Transcribe (precise word-level timestamps)
      let transcriptResult: TranscriptWord[] = [];
      try {
        const audioBlob = await extractAudioBlob(project.file, 120);
        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
        updateProject(id, { currentStep: "Sprache wird erkannt..." });
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("language", "de");

        // Try primary speech engine first (precise word-level timestamps)
        let data: any = null;
        let usedProvider = "deepgram";
        try {
          const dgResult = await supabase.functions.invoke("transcribe-deepgram", { body: formData });
          if (dgResult.error) throw dgResult.error;
          data = dgResult.data;
        } catch (primaryErr) {
          console.warn("Primary transcription failed, falling back to AI:", primaryErr);
          usedProvider = "ai-fallback";
          updateProject(id, { currentStep: "KI transkribiert..." });
          const fbForm = new FormData();
          fbForm.append("audio", audioFile);
          fbForm.append("language", "de");
          const fbResult = await supabase.functions.invoke("transcribe", { body: fbForm });
          if (fbResult.error) throw fbResult.error;
          data = fbResult.data;
        }

        if (data?.transcript?.length > 0) {
          const cleaned = cleanTranscript(data.transcript);
          const validated = validateAndRepairTranscript(cleaned);
          if (validated.fixes.length > 0) {
            console.log(`Transcript validation: ${validated.fixes.length} fixes, score: ${validated.score}/100`);
          }

          // Primary engine timestamps are already precise — only align for AI fallback
          let finalWords = validated.words;
          if (usedProvider !== "deepgram") {
            const synced = alignTranscriptToAudioTimeline(validated.words, detectedSilences, result.duration);
            if (synced.appliedAdjustments > 0) {
              console.log(
                `Transcript sync alignment: ${synced.appliedAdjustments} adjusted words, shift ${synced.globalShiftMs}ms`
              );
            }
            finalWords = synced.words;
          } else {
            console.log(`Transcription: ${validated.words.length} words with native timestamps`);
          }

          transcriptResult = applyCorrections(finalWords);
        } else throw new Error("Empty transcript");
      } catch {
        toast.info(`Demo-Transkript für ${project.file.name}`);
        transcriptResult = MOCK_TRANSCRIPT;
      }

      const reconciledSilences = reconcileSilencesWithTranscript(detectedSilences, transcriptResult);

      updateProjectStep(id, 2, { done: true, active: false });
      updateProjectStep(id, 3, { active: true });
      updateProject(id, { 
        currentStep: "Qualitätsprüfung...",
        transcript: transcriptResult,
        silences: reconciledSilences,
      });

      // Step 4: Sanity check — AI agent validates everything (auto-retry if score < 80)
      const MAX_RETRIES = 2;
      let currentTranscript = transcriptResult;
      let currentSilences = reconciledSilences;
      let lastCheck: any = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            updateProject(id, { currentStep: `Optimierung (Versuch ${attempt + 1})...` });
            toast.info(`🔄 ${project.file.name}: Score zu niedrig, Re-Kalibrierung #${attempt}...`);

            // Re-calibrate with tighter parameters based on previous issues
            const adjustedSC = { ...calibratedSC };
            adjustedSC.threshold = Math.max(0.005, adjustedSC.threshold * (1 - attempt * 0.15));
            adjustedSC.minDuration = Math.max(0.15, adjustedSC.minDuration * (1 - attempt * 0.1));
            adjustedSC.padding = Math.min(0.15, adjustedSC.padding + attempt * 0.02);
            updateProject(id, { silenceCut: adjustedSC });

            currentSilences = reconcileSilencesWithTranscript(
              redetectSilences(result.rawAmplitudes, CHUNK_DURATION, result.duration, adjustedSC),
              currentTranscript
            );
            updateProject(id, { silences: currentSilences });
          }

          const { data: checkData, error: checkError } = await supabase.functions.invoke("sanity-check", {
            body: {
              transcript: currentTranscript,
              silences: currentSilences,
              calibration: { reasoning: calibration.reasoning, confidence: calibration.confidence },
              duration: result.duration,
            },
          });

          if (!checkError && checkData?.result) {
            lastCheck = checkData.result;
            updateProject(id, { sanityCheck: lastCheck });
            console.log(`Sanity check attempt ${attempt + 1}:`, lastCheck);

            if (lastCheck.overall_score >= 80) {
              toast.success(`✅ ${project.file.name}: Export-bereit! (Score: ${lastCheck.overall_score}/100)`);
              break;
            }
          } else {
            break; // API error, don't retry
          }
        } catch (e) {
          console.warn(`Sanity check attempt ${attempt + 1} failed:`, e);
          break;
        }
      }

      // Final toast if still below threshold after all retries
      if (lastCheck && lastCheck.overall_score < 80) {
        toast.warning(`⚠️ ${project.file.name}: Score ${lastCheck.overall_score}/100 — manuelle Optimierung empfohlen`);
      }

      updateProjectStep(id, 3, { done: true, active: false });

      // Auto color grading: sample a frame from the video
      try {
        const grading = await new Promise<import("@/types/editor").ColorGradingSettings>((resolve) => {
          const tempVideo = document.createElement("video");
          tempVideo.src = project.url;
          tempVideo.muted = true;
          tempVideo.playsInline = true;
          tempVideo.preload = "auto";
          const onSeek = () => {
            tempVideo.removeEventListener("seeked", onSeek);
            const grade = autoGradeFromVideo(tempVideo);
            tempVideo.src = "";
            resolve(grade);
          };
          tempVideo.addEventListener("seeked", onSeek);
          tempVideo.addEventListener("loadeddata", () => {
            // Seek to 1s or 30% to get a representative frame
            tempVideo.currentTime = Math.min(1, (result?.duration ?? 3) * 0.3);
          });
          // Timeout fallback
          setTimeout(() => { tempVideo.src = ""; resolve(autoGradeFromVideo(tempVideo)); }, 3000);
        });
        updateProject(id, { colorGrading: grading });
        console.log("Auto color grading applied:", grading);
      } catch {
        console.warn("Auto color grading failed, using defaults");
      }

      updateProject(id, {
        currentStep: "Fertig!",
        phase: "ready",
      });
    } catch {
      toast.error(`${project.file.name}: Fehler, Demo-Daten`);
      updateProject(id, {
        transcript: MOCK_TRANSCRIPT,
        silences: MOCK_SILENCES,
        duration: 12,
        phase: "ready",
      });
    } finally {
      processingRef.current.delete(id);
    }
  }, [updateProject, updateProjectStep]);

  const addFiles = useCallback((files: File[]) => {
    const newProjects = files.map(createVideoProject);
    setProjects((prev) => {
      const updated = [...prev, ...newProjects];
      return updated;
    });
    // Set active to first new project if currently empty
    setProjects((prev) => {
      if (prev.length === newProjects.length) {
        setActiveIndex(0);
      }
      return prev;
    });
    // Process all new projects
    // Process all new projects
    newProjects.forEach((p) => processVideo(p));
  }, [processVideo]);

  const removeProject = useCallback((id: string) => {
    setProjects((prev) => {
      const proj = prev.find((p) => p.id === id);
      if (proj) URL.revokeObjectURL(proj.url);
      const next = prev.filter((p) => p.id !== id);
      return next;
    });
    setActiveIndex((prev) => Math.min(prev, Math.max(0, projects.length - 2)));
  }, [projects.length]);

  const redetectForProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.rawAmplitudes.length === 0 || p.duration === 0) return p;
        const raw = redetectSilences(p.rawAmplitudes, CHUNK_DURATION, p.duration, p.silenceCut);
        return { ...p, silences: reconcileSilencesWithTranscript(raw, p.transcript) };
      })
    );
  }, []);

  const exportProject = useCallback(async (id: string) => {
    const proj = projectsRef.current.find((p) => p.id === id);
    if (!proj || proj.isExporting) return;
    if (proj.duration <= 0) {
      toast.error("Video hat keine gültige Dauer");
      return;
    }

    updateProject(id, { isExporting: true, exportProgress: "Vorbereitung..." });
    try {
      const segments = getActiveSegments(proj.silences, proj.duration);
      const exportSegments = segments.length > 0
        ? segments
        : [{ start: 0, end: proj.duration }];

      console.log(`[Export] ${exportSegments.length} segments, total duration: ${proj.duration.toFixed(1)}s`);

      const blob = await exportWithSubtitles({
        videoUrl: proj.url,
        segments: exportSegments,
        transcript: proj.transcript,
        style: proj.subtitleStyle,
        silences: proj.silences,
        onProgress: (msg) => updateProject(id, { exportProgress: msg }),
      });

      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("quicktime") ? "mov" : "mp4";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apexclip_${proj.file.name.replace(/\.[^.]+$/, "")}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
      toast.success(`✅ ${proj.file.name} exportiert (${sizeMB} MB)`);
    } catch (e) {
      console.error("[Export] Failed:", e);
      toast.error(`Export fehlgeschlagen: ${e instanceof Error ? e.message : "Unbekannter Fehler"}`);
    } finally {
      updateProject(id, { isExporting: false, exportProgress: "" });
    }
  }, [updateProject]);

  const resetAll = useCallback(() => {
    projects.forEach((p) => URL.revokeObjectURL(p.url));
    setProjects([]);
    setActiveIndex(0);
  }, [projects]);

  const regenerateTranscript = useCallback(async (id: string) => {
    const proj = projectsRef.current.find((p) => p.id === id);
    if (!proj || proj.phase !== "ready") {
      toast.error("Projekt nicht bereit für Regenerierung");
      return;
    }
    toast.info("Transkript wird neu generiert...");
    try {
      const audioBlob = await extractAudioBlob(proj.file, 120);
      const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("language", "de");

      let data: any = null;
      try {
        const dgResult = await supabase.functions.invoke("transcribe-deepgram", { body: formData });
        if (dgResult.error) throw dgResult.error;
        data = dgResult.data;
      } catch {
        const fbForm = new FormData();
        fbForm.append("audio", audioFile);
        fbForm.append("language", "de");
        const fbResult = await supabase.functions.invoke("transcribe", { body: fbForm });
        if (fbResult.error) throw fbResult.error;
        data = fbResult.data;
      }

      if (data?.transcript?.length > 0) {
        const cleaned = cleanTranscript(data.transcript);
        const validated = validateAndRepairTranscript(cleaned);
        const latestProj = projectsRef.current.find((p) => p.id === id);
        const sc = latestProj?.silenceCut ?? proj.silenceCut;
        const rawSilences = redetectSilences(proj.rawAmplitudes, CHUNK_DURATION, proj.duration, sc);

        // Native timestamps are precise — skip re-alignment
        const corrected = applyCorrections(validated.words);
        const reconciledSilences = reconcileSilencesWithTranscript(rawSilences, corrected);

        updateProject(id, {
          transcript: corrected,
          silences: reconciledSilences,
        });
        toast.success(`Neu transkribiert: ${validated.words.length} Wörter (Score: ${validated.score}/100)`);
      } else {
        throw new Error("Empty transcript");
      }
    } catch (e) {
      console.error("Regenerate failed:", e);
      toast.error("Transkription fehlgeschlagen");
    }
  }, [updateProject]);

  return {
    projects,
    activeIndex,
    setActiveIndex,
    activeProject: projects[activeIndex] ?? null,
    addFiles,
    removeProject,
    updateProject,
    redetectForProject,
    exportProject,
    resetAll,
    regenerateTranscript,
    hasProjects: projects.length > 0,
  };
}
