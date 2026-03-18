import { useState, useCallback } from "react";
import { toast } from "sonner";
import DropZone from "@/components/editor/DropZone";
import AnalyzingState from "@/components/editor/AnalyzingState";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import {
  SubtitleStyle,
  TranscriptWord,
  SilenceGap,
  DEFAULT_SUBTITLE_STYLE,
  MOCK_TRANSCRIPT,
  MOCK_SILENCES,
} from "@/types/editor";
import { analyzeAudio, getActiveSegments } from "@/lib/audio-analysis";
import { exportVideoWithoutSilences } from "@/lib/video-processor";
import { supabase } from "@/integrations/supabase/client";

type Phase = "dropzone" | "analyzing" | "editing";

interface ProcessingStep {
  label: string;
  done: boolean;
  active: boolean;
}

const Index = () => {
  const [phase, setPhase] = useState<Phase>("dropzone");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [silences, setSilences] = useState<SilenceGap[]>([]);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [removeSilences, setRemoveSilences] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Analysis state
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: "Decoding audio", done: false, active: false },
    { label: "Detecting silence gaps", done: false, active: false },
    { label: "Transcribing speech (AI)", done: false, active: false },
    { label: "Preparing editor", done: false, active: false },
  ]);

  const updateStep = (index: number, update: Partial<ProcessingStep>) => {
    setProcessingSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s))
    );
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setPhase("analyzing");

    try {
      // Step 1: Audio analysis
      updateStep(0, { active: true });
      setAnalysisStep("Decoding audio from video...");

      const analysisResult = await analyzeAudio(file, {
        silenceThreshold: 0.015,
        minSilenceDuration: 0.4,
        onProgress: (p) => setAnalysisProgress(p),
      });

      updateStep(0, { done: true, active: false });
      updateStep(1, { active: true });
      setAnalysisStep("Silence gaps detected");
      setAnalysisProgress(0);

      setSilences(analysisResult.silences);
      setAmplitudes(analysisResult.amplitudes);
      setDuration(analysisResult.duration);

      updateStep(1, { done: true, active: false });

      // Step 2: Transcription via AI
      updateStep(2, { active: true });
      setAnalysisStep("Sending audio to AI for transcription...");

      let transcriptResult: TranscriptWord[] = [];

      try {
        // Extract audio as blob for the edge function
        // We'll send the video file directly and let the AI handle it
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("language", "de");

        const { data, error } = await supabase.functions.invoke("transcribe", {
          body: formData,
        });

        if (error) {
          console.error("Transcription error:", error);
          throw error;
        }

        if (data?.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
          transcriptResult = data.transcript;
        } else {
          throw new Error("Empty transcript");
        }
      } catch (err) {
        console.warn("AI transcription failed, using mock data:", err);
        toast.error("AI-Transkription fehlgeschlagen – verwende Demo-Daten", {
          description: "Die Edge Function ist möglicherweise nicht deployed.",
        });
        transcriptResult = MOCK_TRANSCRIPT;
      }

      setTranscript(transcriptResult);
      updateStep(2, { done: true, active: false });

      // Step 3: Prepare editor
      updateStep(3, { active: true });
      setAnalysisStep("Preparing editor...");
      await new Promise((r) => setTimeout(r, 300));
      updateStep(3, { done: true, active: false });

      setPhase("editing");
      toast.success(
        `Analyse fertig: ${analysisResult.silences.length} Pausen, ${transcriptResult.length} Wörter`
      );
    } catch (err) {
      console.error("Analysis failed:", err);
      toast.error("Analyse fehlgeschlagen");

      // Fallback: use mock data
      setSilences(MOCK_SILENCES);
      setTranscript(MOCK_TRANSCRIPT);
      setDuration(18);
      setAmplitudes([]);
      setPhase("editing");
    }
  }, []);

  const handleCaptureThumbnail = useCallback(() => {
    const video = document.querySelector("video");
    if (video) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/png");
        setThumbnailUrl(url);
        toast.success("Thumbnail captured!");
      }
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!videoFile || isExporting) return;

    setIsExporting(true);
    setExportProgress("Loading FFmpeg...");

    try {
      const segments = removeSilences
        ? getActiveSegments(silences, duration)
        : [{ start: 0, end: duration }];

      const blob = await exportVideoWithoutSilences(
        videoFile,
        segments,
        (msg) => setExportProgress(msg)
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reel_edited_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Export abgeschlossen!");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export fehlgeschlagen");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  }, [videoFile, isExporting, removeSilences, silences, duration]);

  if (phase === "dropzone") {
    return <DropZone onFileSelect={handleFileSelect} />;
  }

  if (phase === "analyzing") {
    return (
      <AnalyzingState
        fileName={videoFile?.name || "video.mp4"}
        progress={analysisProgress}
        currentStep={analysisStep}
        steps={processingSteps}
      />
    );
  }

  return (
    <EditorWorkspace
      videoUrl={videoUrl}
      videoFile={videoFile}
      transcript={transcript}
      silences={silences}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      removeSilences={removeSilences}
      subtitleStyle={subtitleStyle}
      thumbnailUrl={thumbnailUrl}
      amplitudes={amplitudes}
      isExporting={isExporting}
      exportProgress={exportProgress}
      onTimeUpdate={setCurrentTime}
      onPlayPause={() => setIsPlaying((p) => !p)}
      onSeek={setCurrentTime}
      onCaptureThumbnail={handleCaptureThumbnail}
      onDurationChange={setDuration}
      onStyleChange={setSubtitleStyle}
      onToggleSilences={setRemoveSilences}
      onExport={handleExport}
    />
  );
};

export default Index;
