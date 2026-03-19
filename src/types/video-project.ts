import { TranscriptWord, SubtitleStyle, SpeakerSettings, SilenceCutSettings, ColorGradingSettings, DEFAULT_SUBTITLE_STYLE, DEFAULT_SPEAKER_SETTINGS, DEFAULT_SILENCE_CUT, DEFAULT_COLOR_GRADING } from "./editor";
import { type SilenceGap } from "@/lib/audio-analysis";

export type VideoPhase = "processing" | "ready";

export interface ProcessingStep {
  label: string;
  done: boolean;
  active: boolean;
}

export interface SanityCheckResult {
  sync_score: number;
  cut_score: number;
  content_score: number;
  overall_score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  summary: string;
}

export interface TrimRegion {
  id: string;
  start: number;
  end: number;
}

export interface VideoProject {
  id: string;
  file: File;
  url: string;
  phase: VideoPhase;
  transcript: TranscriptWord[];
  silences: SilenceGap[];
  rawAmplitudes: number[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  subtitleStyle: SubtitleStyle;
  speaker: SpeakerSettings;
  silenceCut: SilenceCutSettings;
  colorGrading: ColorGradingSettings;
  isExporting: boolean;
  exportProgress: string;
  progress: number;
  currentStep: string;
  steps: ProcessingStep[];
  sanityCheck?: SanityCheckResult;
  calibrationReasoning?: string;
  trimRegions: TrimRegion[];
}

export function createVideoProject(file: File): VideoProject {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    phase: "processing",
    transcript: [],
    silences: [],
    rawAmplitudes: [],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE },
    speaker: { ...DEFAULT_SPEAKER_SETTINGS },
    silenceCut: { ...DEFAULT_SILENCE_CUT },
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    isExporting: false,
    exportProgress: "",
    progress: 0,
    currentStep: "Audio wird analysiert...",
    steps: [
      { label: "Audio analysieren", done: false, active: true },
      { label: "KI-Kalibrierung", done: false, active: false },
      { label: "KI-Transkription", done: false, active: false },
      { label: "Qualitätsprüfung", done: false, active: false },
    ],
    trimRegions: [],
  };
}
