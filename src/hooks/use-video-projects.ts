import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { TranscriptWord, SilenceCutSettings, MOCK_TRANSCRIPT, MOCK_SILENCES } from "@/types/editor";
import { VideoProject, createVideoProject } from "@/types/video-project";
import { analyzeAudio, getActiveSegments, type SilenceGap } from "@/lib/audio-analysis";
import { extractAudioBlob } from "@/lib/audio-extract";
import { exportVideoWithoutSilences } from "@/lib/video-processor";
import { validateAndRepairTranscript } from "@/lib/transcript-validator";
import { supabase } from "@/integrations/supabase/client";

const CHUNK_DURATION = 0.05;

// Filter out garbled/nonsensical words for clean subtitle flow
function cleanTranscript(words: TranscriptWord[]): TranscriptWord[] {
  return words.filter((w) => {
    const text = w.text.trim();
    // Remove empty words
    if (!text) return false;
    // Remove very low confidence words
    if (w.confidence < 0.4) return false;
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
    const sc = project.silenceCut;

    try {
      const result = await analyzeAudio(project.file, {
        silenceThreshold: sc.threshold,
        minSilenceDuration: sc.minDuration,
        chunkDuration: CHUNK_DURATION,
        onProgress: (p) => updateProject(id, { progress: p }),
      });

      updateProjectStep(id, 0, { done: true, active: false });
      updateProjectStep(id, 1, { active: true });
      updateProject(id, { currentStep: "Pausen erkannt", rawAmplitudes: result.rawAmplitudes, duration: result.duration, progress: 0 });

      const detectedSilences = redetectSilences(result.rawAmplitudes, CHUNK_DURATION, result.duration, sc);
      updateProjectStep(id, 1, { done: true, active: false });
      updateProjectStep(id, 2, { active: true });
      updateProject(id, { currentStep: "Audio wird extrahiert..." });

      let transcriptResult: TranscriptWord[] = [];
      try {
        const audioBlob = await extractAudioBlob(project.file, 120);
        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
        updateProject(id, { currentStep: "KI verarbeitet..." });
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("language", "de");
        const { data, error } = await supabase.functions.invoke("transcribe", { body: formData });
        if (error) throw error;
        if (data?.transcript?.length > 0) {
          const cleaned = cleanTranscript(data.transcript);
          // Self-checking validation: repair timing issues
          const validated = validateAndRepairTranscript(cleaned);
          if (validated.fixes.length > 0) {
            console.log(`Transcript validation: ${validated.fixes.length} fixes, score: ${validated.score}/100`);
          }
          transcriptResult = validated.words;
        } else throw new Error("Empty");
      } catch {
        toast.info(`Demo-Transkript für ${project.file.name}`);
        transcriptResult = MOCK_TRANSCRIPT;
      }

      const reconciledSilences = reconcileSilencesWithTranscript(detectedSilences, transcriptResult);
      updateProjectStep(id, 2, { done: true, active: false });
      updateProjectStep(id, 3, { done: true });
      updateProject(id, {
        transcript: transcriptResult,
        silences: reconciledSilences,
        currentStep: "Fertig!",
        phase: "ready",
      });
      toast.success(`${project.file.name}: ${reconciledSilences.length} Pausen, ${transcriptResult.length} Wörter`);
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
    const proj = projects.find((p) => p.id === id);
    if (!proj || proj.isExporting) return;
    updateProject(id, { isExporting: true, exportProgress: "Vorbereitung..." });
    try {
      const segments = getActiveSegments(proj.silences, proj.duration);
      const blob = await exportVideoWithoutSilences(
        proj.file, segments,
        (msg) => updateProject(id, { exportProgress: msg })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clip_${proj.file.name.replace(/\.[^.]+$/, "")}_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${proj.file.name} exportiert!`);
    } catch {
      toast.error("Export fehlgeschlagen");
    } finally {
      updateProject(id, { isExporting: false, exportProgress: "" });
    }
  }, [projects, updateProject]);

  const resetAll = useCallback(() => {
    projects.forEach((p) => URL.revokeObjectURL(p.url));
    setProjects([]);
    setActiveIndex(0);
  }, [projects]);

  const regenerateTranscript = useCallback(async (id: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj || proj.phase !== "ready") return;
    updateProject(id, { currentStep: "Transkript wird neu generiert..." });
    try {
      const audioBlob = await extractAudioBlob(proj.file, 120);
      const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("language", "de");
      const { data, error } = await supabase.functions.invoke("transcribe", { body: formData });
      if (error) throw error;
      if (data?.transcript?.length > 0) {
        const cleaned = cleanTranscript(data.transcript);
        const validated = validateAndRepairTranscript(cleaned);
        const reconciledSilences = reconcileSilencesWithTranscript(
          redetectSilences(proj.rawAmplitudes, CHUNK_DURATION, proj.duration, proj.silenceCut),
          validated.words
        );
        updateProject(id, {
          transcript: validated.words,
          silences: reconciledSilences,
          currentStep: "Fertig!",
        });
        toast.success(`Neu transkribiert: ${validated.words.length} Wörter (Score: ${validated.score}/100)`);
      } else {
        throw new Error("Empty transcript");
      }
    } catch {
      toast.error("Transkription fehlgeschlagen");
    }
  }, [projects, updateProject]);

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
