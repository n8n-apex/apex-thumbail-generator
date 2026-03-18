import { useState, useCallback } from "react";
import { toast } from "sonner";
import UploadScreen from "@/components/reel/UploadScreen";
import ProcessingScreen from "@/components/reel/ProcessingScreen";
import ReelPreview from "@/components/reel/ReelPreview";
import ControlsPanel from "@/components/reel/ControlsPanel";
import {
  SubtitleStyle, SpeakerSettings, TranscriptWord,
  DEFAULT_SUBTITLE_STYLE, DEFAULT_SPEAKER_SETTINGS,
  MOCK_TRANSCRIPT, MOCK_SILENCES,
} from "@/types/editor";
import { analyzeAudio, getActiveSegments } from "@/lib/audio-analysis";
import { extractAudioBlob } from "@/lib/audio-extract";
import { exportVideoWithoutSilences } from "@/lib/video-processor";
import { supabase } from "@/integrations/supabase/client";

type Phase = "upload" | "processing" | "ready";

const Index = () => {
  const [phase, setPhase] = useState<Phase>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [silences, setSilences] = useState<{ start: number; end: number }[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [speaker, setSpeaker] = useState<SpeakerSettings>(DEFAULT_SPEAKER_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Processing state
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [steps, setSteps] = useState([
    { label: "Analyzing audio", done: false, active: false },
    { label: "Detecting silences", done: false, active: false },
    { label: "AI transcription", done: false, active: false },
    { label: "Done", done: false, active: false },
  ]);

  const updateStep = (idx: number, upd: { done?: boolean; active?: boolean }) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...upd } : s)));
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setPhase("processing");

    try {
      // Step 1: Audio analysis
      updateStep(0, { active: true });
      setCurrentStep("Decoding audio...");

      const result = await analyzeAudio(file, {
        silenceThreshold: 0.015,
        minSilenceDuration: 0.4,
        onProgress: (p) => setProgress(p),
      });

      updateStep(0, { done: true, active: false });
      updateStep(1, { active: true });
      setCurrentStep("Silences detected");
      setSilences(result.silences);
      setDuration(result.duration);
      setProgress(0);
      updateStep(1, { done: true, active: false });

      // Step 2: Extract audio & transcribe
      updateStep(2, { active: true });
      setCurrentStep("Extracting audio for transcription...");

      let transcriptResult: TranscriptWord[] = [];
      try {
        // Extract compressed 16kHz mono WAV (much smaller than raw video)
        const audioBlob = await extractAudioBlob(file, 120);
        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });

        setCurrentStep("Sending to AI...");
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("language", "de");

        const { data, error } = await supabase.functions.invoke("transcribe", { body: formData });
        if (error) throw error;
        if (data?.transcript?.length > 0) {
          transcriptResult = data.transcript;
        } else {
          throw new Error("Empty");
        }
      } catch {
        toast.info("Using demo transcript (edge function not deployed)");
        transcriptResult = MOCK_TRANSCRIPT;
      }

      setTranscript(transcriptResult);
      updateStep(2, { done: true, active: false });
      updateStep(3, { done: true });
      setCurrentStep("Ready!");

      await new Promise((r) => setTimeout(r, 400));
      setPhase("ready");
      toast.success(`${result.silences.length} pauses found, ${transcriptResult.length} words transcribed`);
    } catch {
      toast.error("Processing failed, using demo data");
      setTranscript(MOCK_TRANSCRIPT);
      setSilences(MOCK_SILENCES);
      setDuration(12);
      setPhase("ready");
    }
  }, []);

  const handleReset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setTranscript([]);
    setSilences([]);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setPhase("upload");
    setProgress(0);
    setCurrentStep("");
    setSteps([
      { label: "Analyzing audio", done: false, active: false },
      { label: "Detecting silences", done: false, active: false },
      { label: "AI transcription", done: false, active: false },
      { label: "Done", done: false, active: false },
    ]);
  }, [videoUrl]);

  const handleExport = useCallback(async () => {
    if (!videoFile || isExporting) return;
    setIsExporting(true);
    setExportProgress("Loading FFmpeg...");
    try {
      const segments = getActiveSegments(silences, duration);
      const blob = await exportVideoWithoutSilences(videoFile, segments, setExportProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reel_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export complete!");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  }, [videoFile, isExporting, silences, duration]);

  if (phase === "upload") {
    return <UploadScreen onFileSelect={handleFileSelect} />;
  }

  if (phase === "processing") {
    return (
      <ProcessingScreen
        fileName={videoFile?.name || "video.mp4"}
        progress={progress}
        currentStep={currentStep}
        steps={steps}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-10 mesh-gradient p-8">
      <ReelPreview
        videoUrl={videoUrl!}
        transcript={transcript}
        subtitleStyle={subtitleStyle}
        speaker={speaker}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onTimeUpdate={setCurrentTime}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onSeek={setCurrentTime}
        onDurationChange={setDuration}
        onReset={handleReset}
        onSwapVideo={handleReset}
      />
      <ControlsPanel
        style={subtitleStyle}
        speaker={speaker}
        onStyleChange={setSubtitleStyle}
        onSpeakerChange={setSpeaker}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />
    </div>
  );
};

export default Index;
