import { TranscriptWord, SubtitleStyle, SpeakerSettings, SilenceCutSettings, DEFAULT_SUBTITLE_STYLE, DEFAULT_SPEAKER_SETTINGS, DEFAULT_SILENCE_CUT } from "./editor";
import { type SilenceGap } from "@/lib/audio-analysis";

export type VideoPhase = "processing" | "ready";

export interface ProcessingStep {
  label: string;
  done: boolean;
  active: boolean;
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
  isExporting: boolean;
  exportProgress: string;
  progress: number;
  currentStep: string;
  steps: ProcessingStep[];
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
    isExporting: false,
    exportProgress: "",
    progress: 0,
    currentStep: "Audio wird analysiert...",
    steps: [
      { label: "Audio analysieren", done: false, active: true },
      { label: "Pausen erkennen", done: false, active: false },
      { label: "KI-Transkription", done: false, active: false },
      { label: "Fertig", done: false, active: false },
    ],
  };
}
