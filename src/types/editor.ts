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

export type SubtitleFont = "montserrat" | "bebas" | "anton" | "space" | "outfit" | "dela" | "righteous" | "lobster" | "bangers";

export type SubtitlePreset = "karaoke" | "pop" | "neon" | "minimal" | "block" | "outline";

export interface SubtitleStyle {
  preset: SubtitlePreset;
  font: SubtitleFont;
  fontSize: number;
  positionX: number; // 0-100 percentage from left
  positionY: number; // 0-100 percentage from top
  accentColor: string;
  timeOffset: number; // seconds to shift subtitles earlier (negative = earlier)
  boxWidth: number; // percentage of container width (20-100)
  boxHeight: number; // max lines visible (1-6)
}

export interface SpeakerSettings {
  centerSpeaker: boolean;
  zoom: number;
}

export interface SilenceCutSettings {
  enabled: boolean;
  threshold: number; // RMS threshold 0-1, default 0.015
  minDuration: number; // minimum silence length in seconds, default 0.4
  padding: number; // padding in seconds to keep around cuts, default 0.1
}

export const DEFAULT_SILENCE_CUT: SilenceCutSettings = {
  enabled: true,
  threshold: 0.015,
  minDuration: 0.4,
  padding: 0.1,
};

export const SUBTITLE_FONTS: Record<SubtitleFont, { label: string; family: string; weight: number; italic?: boolean }> = {
  montserrat: { label: "Montserrat", family: "'Montserrat'", weight: 900 },
  bebas: { label: "Bebas Neue", family: "'Bebas Neue'", weight: 400 },
  anton: { label: "Anton", family: "'Anton'", weight: 400 },
  space: { label: "Space Grotesk", family: "'Space Grotesk'", weight: 700 },
  outfit: { label: "Outfit", family: "'Outfit'", weight: 800 },
  dela: { label: "Dela Gothic", family: "'Dela Gothic One'", weight: 400 },
  righteous: { label: "Righteous", family: "'Righteous'", weight: 400 },
  lobster: { label: "Lobster", family: "'Lobster'", weight: 400, italic: true },
  bangers: { label: "Bangers", family: "'Bangers'", weight: 400 },
};

export const SUBTITLE_PRESETS: Record<SubtitlePreset, { label: string; emoji: string }> = {
  karaoke: { label: "Karaoke", emoji: "🎤" },
  pop: { label: "Pop", emoji: "💥" },
  neon: { label: "Neon", emoji: "✨" },
  minimal: { label: "Minimal", emoji: "◽" },
  block: { label: "Block", emoji: "🔲" },
  outline: { label: "Outline", emoji: "✏️" },
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  preset: "karaoke",
  font: "montserrat",
  fontSize: 44,
  positionX: 50,
  positionY: 86,
  accentColor: "#FFFFFF",
  timeOffset: -0.15,
  boxWidth: 85,
  boxHeight: 2,
};

export const DEFAULT_SPEAKER_SETTINGS: SpeakerSettings = {
  centerSpeaker: true,
  zoom: 1.2,
};

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
];

export const MOCK_SILENCES: SilenceGap[] = [
  { start: 2.6, end: 3.8 },
  { start: 7.1, end: 8.5 },
];
