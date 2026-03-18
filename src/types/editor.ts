export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SilenceGap {
  start: number;
  end: number;
}

export type SubtitlePreset = "hormozi" | "karaoke" | "neon" | "minimal" | "boxed" | "outline";

export interface SubtitleStyle {
  preset: SubtitlePreset;
  fontSize: number;
  position: "bottom" | "center" | "top";
  accentColor: string;
}

export const SUBTITLE_PRESETS: Record<SubtitlePreset, { label: string; description: string }> = {
  hormozi: { label: "Hormozi", description: "Bold word-by-word highlight" },
  karaoke: { label: "Karaoke", description: "Color sweep per word" },
  neon: { label: "Neon", description: "Glowing text, no background" },
  minimal: { label: "Minimal", description: "Clean, subtle" },
  boxed: { label: "Boxed", description: "Each word in a pill" },
  outline: { label: "Outline", description: "Thick stroke, no fill" },
};

export interface EditorState {
  phase: "dropzone" | "analyzing" | "editing";
  videoFile: File | null;
  videoUrl: string | null;
  transcript: TranscriptWord[];
  silences: SilenceGap[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  removeSilences: boolean;
  subtitleStyle: SubtitleStyle;
  thumbnailUrl: string | null;
}

export const MOCK_TRANSCRIPT: TranscriptWord[] = [
  { text: "Hey", start: 0.2, end: 0.5, confidence: 0.98 },
  { text: "Leute,", start: 0.5, end: 0.9, confidence: 0.97 },
  { text: "willkommen", start: 0.9, end: 1.4, confidence: 0.99 },
  { text: "zurück", start: 1.4, end: 1.7, confidence: 0.98 },
  { text: "auf", start: 1.7, end: 1.85, confidence: 0.99 },
  { text: "meinem", start: 1.85, end: 2.1, confidence: 0.97 },
  { text: "Kanal.", start: 2.1, end: 2.6, confidence: 0.98 },
  { text: "Heute", start: 3.8, end: 4.1, confidence: 0.99 },
  { text: "zeige", start: 4.1, end: 4.4, confidence: 0.97 },
  { text: "ich", start: 4.4, end: 4.5, confidence: 0.99 },
  { text: "euch", start: 4.5, end: 4.7, confidence: 0.98 },
  { text: "wie", start: 4.7, end: 4.9, confidence: 0.98 },
  { text: "ihr", start: 4.9, end: 5.0, confidence: 0.97 },
  { text: "eure", start: 5.0, end: 5.2, confidence: 0.99 },
  { text: "Reels", start: 5.2, end: 5.6, confidence: 0.96 },
  { text: "automatisch", start: 5.6, end: 6.2, confidence: 0.98 },
  { text: "schneiden", start: 6.2, end: 6.7, confidence: 0.99 },
  { text: "könnt.", start: 6.7, end: 7.1, confidence: 0.97 },
  { text: "Das", start: 8.5, end: 8.7, confidence: 0.99 },
  { text: "Tool", start: 8.7, end: 8.9, confidence: 0.98 },
  { text: "erkennt", start: 8.9, end: 9.3, confidence: 0.97 },
  { text: "Pausen", start: 9.3, end: 9.8, confidence: 0.99 },
  { text: "und", start: 9.8, end: 9.95, confidence: 0.99 },
  { text: "entfernt", start: 9.95, end: 10.4, confidence: 0.98 },
  { text: "sie", start: 10.4, end: 10.6, confidence: 0.99 },
  { text: "automatisch.", start: 10.6, end: 11.3, confidence: 0.97 },
  { text: "Außerdem", start: 12.8, end: 13.3, confidence: 0.98 },
  { text: "werden", start: 13.3, end: 13.6, confidence: 0.99 },
  { text: "Untertitel", start: 13.6, end: 14.2, confidence: 0.97 },
  { text: "hinzugefügt.", start: 14.2, end: 14.9, confidence: 0.98 },
  { text: "Schaut", start: 16.0, end: 16.3, confidence: 0.99 },
  { text: "euch", start: 16.3, end: 16.5, confidence: 0.98 },
  { text: "das", start: 16.5, end: 16.65, confidence: 0.99 },
  { text: "Ergebnis", start: 16.65, end: 17.1, confidence: 0.97 },
  { text: "an!", start: 17.1, end: 17.4, confidence: 0.98 },
];

export const MOCK_SILENCES: SilenceGap[] = [
  { start: 2.6, end: 3.8 },
  { start: 7.1, end: 8.5 },
  { start: 11.3, end: 12.8 },
  { start: 14.9, end: 16.0 },
];

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  preset: "hormozi",
  fontSize: 42,
  position: "bottom",
  accentColor: "#FFFF00",
};
