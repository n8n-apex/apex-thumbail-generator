import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import UploadScreen from "@/components/reel/UploadScreen";
import ProcessingScreen from "@/components/reel/ProcessingScreen";
import ReelPreview from "@/components/reel/ReelPreview";
import ControlsPanel from "@/components/reel/ControlsPanel";
import {
  SubtitleStyle, SpeakerSettings, SilenceCutSettings, TranscriptWord,
  DEFAULT_SUBTITLE_STYLE, DEFAULT_SPEAKER_SETTINGS, DEFAULT_SILENCE_CUT,
  MOCK_TRANSCRIPT, MOCK_SILENCES,
} from "@/types/editor";
import { analyzeAudio, getActiveSegments, calculateTimeSaved, type SilenceGap } from "@/lib/audio-analysis";
import { extractAudioBlob } from "@/lib/audio-extract";
import { exportVideoWithoutSilences } from "@/lib/video-processor";
import { supabase } from "@/integrations/supabase/client";

type Phase = "upload" | "processing" | "ready";

/**
 * Re-detect silences from raw amplitudes with new threshold settings.
 */
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

/**
 * Reconcile silence gaps with transcript words so they never overlap.
 * Trims or splits silence gaps that contain spoken words.
 */
function reconcileSilencesWithTranscript(
  silences: SilenceGap[],
  transcript: TranscriptWord[],
): SilenceGap[] {
  if (transcript.length === 0) return silences;

  const result: SilenceGap[] = [];
  const MARGIN = 0.05; // small margin to avoid clipping word edges

  for (const gap of silences) {
    // Find all words that overlap with this silence gap
    const overlapping = transcript.filter(
      (w) => w.end > gap.start + MARGIN && w.start < gap.end - MARGIN
    );

    if (overlapping.length === 0) {
      // No words in this gap — keep it as is
      result.push(gap);
      continue;
    }

    // Split the gap around the overlapping words
    let cursor = gap.start;
    for (const word of overlapping) {
      const subGapEnd = word.start - MARGIN;
      if (subGapEnd - cursor >= 0.1) {
        result.push({ start: cursor, end: subGapEnd });
      }
      cursor = word.end + MARGIN;
    }
    // Remaining portion after the last overlapping word
    if (gap.end - cursor >= 0.1) {
      result.push({ start: cursor, end: gap.end });
    }
  }

  return result;
}

const CHUNK_DURATION = 0.05;

const Index = () => {
  const [phase, setPhase] = useState<Phase>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [silences, setSilences] = useState<SilenceGap[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [speaker, setSpeaker] = useState<SpeakerSettings>(DEFAULT_SPEAKER_SETTINGS);
  const [silenceCut, setSilenceCut] = useState<SilenceCutSettings>(DEFAULT_SILENCE_CUT);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Raw amplitudes stored for re-analysis without re-decoding
  const rawAmplitudesRef = useRef<number[]>([]);

  // Re-analyze when silence cut settings change — reconcile with transcript
  useEffect(() => {
    if (rawAmplitudesRef.current.length === 0 || duration === 0) return;
    const raw = redetectSilences(rawAmplitudesRef.current, CHUNK_DURATION, duration, silenceCut);
    setSilences(reconcileSilencesWithTranscript(raw, transcript));
  }, [silenceCut.threshold, silenceCut.minDuration, silenceCut.padding, silenceCut.enabled, duration, transcript]);

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
      updateStep(0, { active: true });
      setCurrentStep("Decoding audio...");

      const result = await analyzeAudio(file, {
        silenceThreshold: silenceCut.threshold,
        minSilenceDuration: silenceCut.minDuration,
        chunkDuration: CHUNK_DURATION,
        onProgress: (p) => setProgress(p),
      });

      // Store raw amplitudes for re-analysis
      rawAmplitudesRef.current = result.rawAmplitudes;

      updateStep(0, { done: true, active: false });
      updateStep(1, { active: true });
      setCurrentStep("Silences detected");

      // Re-detect with current settings using raw amplitudes
      const detectedSilences = redetectSilences(result.rawAmplitudes, CHUNK_DURATION, result.duration, silenceCut);
      // Don't set silences yet — will reconcile after transcript is ready
      setDuration(result.duration);
      setProgress(0);
      updateStep(1, { done: true, active: false });

      // Transcription
      updateStep(2, { active: true });
      setCurrentStep("Extracting audio for transcription...");

      let transcriptResult: TranscriptWord[] = [];
      try {
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
      // Now reconcile silences with actual transcript words
      const reconciledSilences = reconcileSilencesWithTranscript(detectedSilences, transcriptResult);
      setSilences(reconciledSilences);
      updateStep(2, { done: true, active: false });
      updateStep(3, { done: true });
      setCurrentStep("Ready!");

      await new Promise((r) => setTimeout(r, 400));
      setPhase("ready");
      toast.success(`${detectedSilences.length} Pausen gefunden, ${transcriptResult.length} Wörter transkribiert`);
    } catch {
      toast.error("Processing failed, using demo data");
      setTranscript(MOCK_TRANSCRIPT);
      setSilences(MOCK_SILENCES);
      setDuration(12);
      setPhase("ready");
    }
  }, [silenceCut]);

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
    rawAmplitudesRef.current = [];
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

  const timeSaved = calculateTimeSaved(silences);

  if (phase === "upload") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <UploadScreen onFileSelect={handleFileSelect} />
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <ProcessingScreen
          fileName={videoFile?.name || "video.mp4"}
          progress={progress}
          currentStep={currentStep}
          steps={steps}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden mesh-gradient">
      <ReelPreview
        videoUrl={videoUrl!}
        transcript={transcript}
        subtitleStyle={subtitleStyle}
        speaker={speaker}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        silences={silences}
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
        silenceCut={silenceCut}
        onStyleChange={setSubtitleStyle}
        onSpeakerChange={setSpeaker}
        onSilenceCutChange={setSilenceCut}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        silenceCount={silences.length}
        timeSaved={timeSaved}
        duration={duration}
      />
    </div>
  );
};

export default Index;
