export interface ImageAdjustments {
  brightness: number;   // 0-200, default 100
  contrast: number;     // 0-200, default 100
  saturation: number;   // 0-200, default 100
  sharpness: number;    // 0-200, default 100 (unsharp mask via CSS)
  temperature: number;  // -100 to 100, default 0
  exposure: number;     // -100 to 100, default 0
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 100,
  temperature: 0,
  exposure: 0,
};

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  editedUrl?: string;
  hasBgRemoved: boolean;
  isProcessing: boolean;
  error?: string;
  adjustments: ImageAdjustments;
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
  activeTool: "select" | "crop" | "ai-edit" | "adjust";
  cropPreset: CropPreset | null;
  customPrompt: string;
}

/** Build a CSS filter string from adjustments */
export function adjustmentsToCssFilter(adj: ImageAdjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness / 100})`);
  if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast / 100})`);
  if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation / 100})`);
  if (adj.exposure !== 0) {
    // Exposure mapped as extra brightness
    const expFactor = 1 + adj.exposure / 200;
    parts.push(`brightness(${expFactor})`);
  }
  // Temperature: warm = sepia + hue-rotate, cool = hue-rotate opposite
  if (adj.temperature > 0) {
    parts.push(`sepia(${adj.temperature / 200})`);
    parts.push(`hue-rotate(-10deg)`);
  } else if (adj.temperature < 0) {
    parts.push(`sepia(${Math.abs(adj.temperature) / 200})`);
    parts.push(`hue-rotate(190deg)`);
  }
  return parts.length > 0 ? parts.join(" ") : "none";
}
