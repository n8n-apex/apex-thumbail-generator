export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
  editedUrl?: string;
  isProcessing: boolean;
  error?: string;
}

export interface CropPreset {
  label: string;
  width: number;
  height: number;
  icon: string;
}

export const SOCIAL_PRESETS: CropPreset[] = [
  { label: "Instagram Post", width: 1080, height: 1080, icon: "📸" },
  { label: "Instagram Story", width: 1080, height: 1920, icon: "📱" },
  { label: "TikTok", width: 1080, height: 1920, icon: "🎵" },
  { label: "LinkedIn Post", width: 1200, height: 627, icon: "💼" },
  { label: "Facebook Cover", width: 820, height: 312, icon: "📘" },
  { label: "YouTube Thumbnail", width: 1280, height: 720, icon: "▶️" },
  { label: "Twitter/X Post", width: 1200, height: 675, icon: "🐦" },
  { label: "Pinterest", width: 1000, height: 1500, icon: "📌" },
];

export type AIEditAction = 
  | "remove-background"
  | "enhance"
  | "custom-prompt";

export interface EditorState {
  images: ImageFile[];
  selectedIds: string[];
  activeId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  activeTool: "select" | "crop" | "ai-edit" | "enhance" | "bg-remove";
  cropPreset: CropPreset | null;
  customPrompt: string;
}
