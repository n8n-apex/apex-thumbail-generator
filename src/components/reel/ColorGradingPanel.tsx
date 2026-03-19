import { ColorGradingSettings, DEFAULT_COLOR_GRADING } from "@/types/editor";
import { Sun, Contrast, Droplets, Thermometer, Sparkles, RotateCcw, Eclipse } from "lucide-react";

interface ColorGradingPanelProps {
  settings: ColorGradingSettings;
  onChange: (s: ColorGradingSettings) => void;
}

const SLIDERS: {
  key: keyof ColorGradingSettings;
  label: string;
  icon: typeof Sun;
  min: number;
  max: number;
}[] = [
  { key: "brightness", label: "Helligkeit", icon: Sun, min: -100, max: 100 },
  { key: "contrast", label: "Kontrast", icon: Contrast, min: -100, max: 100 },
  { key: "saturation", label: "Sättigung", icon: Droplets, min: -100, max: 100 },
  { key: "warmth", label: "Wärme", icon: Thermometer, min: -100, max: 100 },
  { key: "fade", label: "Fade", icon: Eclipse, min: 0, max: 100 },
  { key: "vignette", label: "Vignette", icon: Sparkles, min: 0, max: 100 },
];

/** Convert our settings to a CSS filter string + overlay styles for live preview */
export function colorGradingToCSS(s: ColorGradingSettings): string {
  const filters: string[] = [];

  // Brightness: 0→1.0, -100→0.5, +100→1.5 (tighter range for natural look)
  if (s.brightness !== 0) {
    filters.push(`brightness(${1 + s.brightness / 200})`);
  }

  // Contrast: 0→1.0, -100→0.5, +100→1.6
  if (s.contrast !== 0) {
    filters.push(`contrast(${1 + s.contrast / 167})`);
  }

  // Saturation: 0→1.0, -100→0.0, +100→1.8
  if (s.saturation !== 0) {
    filters.push(`saturate(${Math.max(0, 1 + s.saturation / 125)})`);
  }

  // Warmth: warm = sepia + slight hue shift, cool = hue-rotate toward blue
  if (s.warmth > 0) {
    const sepia = s.warmth / 250; // subtle sepia 0-0.4
    const hue = s.warmth / 10; // slight warm hue 0-10deg
    filters.push(`sepia(${sepia}) hue-rotate(${hue}deg)`);
  } else if (s.warmth < 0) {
    // Cool tones via hue-rotate toward blue
    filters.push(`hue-rotate(${s.warmth / 3}deg)`);
    // Slight saturation boost for cool tones
    filters.push(`saturate(${1 + Math.abs(s.warmth) / 500})`);
  }

  // Fade (lifted blacks) — reduce contrast slightly + add brightness
  if (s.fade > 0) {
    const fadeFactor = s.fade / 200; // 0-0.5
    filters.push(`brightness(${1 + fadeFactor * 0.3}) contrast(${1 - fadeFactor * 0.4})`);
  }

  return filters.length > 0 ? filters.join(" ") : "none";
}

/** Generate vignette overlay CSS for the video container */
export function colorGradingVignetteCSS(s: ColorGradingSettings): React.CSSProperties | null {
  if (s.vignette <= 0) return null;
  const intensity = s.vignette / 100;
  return {
    position: "absolute" as const,
    inset: 0,
    pointerEvents: "none" as const,
    background: `radial-gradient(ellipse at center, transparent ${60 - intensity * 30}%, rgba(0,0,0,${intensity * 0.7}) 100%)`,
    zIndex: 5,
  };
}

/** Convert settings to FFmpeg eq filter string for export */
export function colorGradingToFFmpeg(s: ColorGradingSettings): string | null {
  const parts: string[] = [];
  if (s.brightness !== 0) parts.push(`brightness=${(s.brightness / 100) * 0.25}`);
  if (s.contrast !== 0) parts.push(`contrast=${1 + s.contrast / 125}`);
  if (s.saturation !== 0) parts.push(`saturation=${Math.max(0, 1 + s.saturation / 125)}`);
  if (s.warmth > 0) parts.push(`gamma_r=${1 + s.warmth / 400}:gamma_b=${1 - s.warmth / 500}`);
  if (s.warmth < 0) parts.push(`gamma_b=${1 + Math.abs(s.warmth) / 400}:gamma_r=${1 - Math.abs(s.warmth) / 500}`);
  if (parts.length === 0) return null;
  return `eq=${parts.join(":")}`;
}

const PRESETS: { label: string; emoji: string; settings: Partial<ColorGradingSettings> }[] = [
  { label: "Cinematic", emoji: "🎬", settings: { brightness: 3, contrast: 18, saturation: -10, warmth: 12, fade: 8, vignette: 25 } },
  { label: "Warm Glow", emoji: "☀️", settings: { brightness: 6, contrast: 8, saturation: 8, warmth: 28, fade: 5, vignette: 10 } },
  { label: "Cool Tone", emoji: "❄️", settings: { brightness: 2, contrast: 12, saturation: -8, warmth: -22, fade: 0, vignette: 15 } },
  { label: "Vibrant", emoji: "🌈", settings: { brightness: 4, contrast: 12, saturation: 30, warmth: 5, fade: 0, vignette: 5 } },
  { label: "Moody", emoji: "🌙", settings: { brightness: -10, contrast: 22, saturation: -18, warmth: 8, fade: 12, vignette: 40 } },
  { label: "Film", emoji: "🎞️", settings: { brightness: -2, contrast: 10, saturation: -5, warmth: 6, fade: 15, vignette: 20 } },
];

const ColorGradingPanel = ({ settings, onChange }: ColorGradingPanelProps) => {
  const upd = (key: keyof ColorGradingSettings, value: number) =>
    onChange({ ...settings, [key]: value });

  const isDefault = Object.entries(settings).every(
    ([k, v]) => v === DEFAULT_COLOR_GRADING[k as keyof ColorGradingSettings]
  );

  return (
    <div className="glass-elevated rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">Color Grading</span>
        </div>
        {!isDefault && (
          <button
            onClick={() => onChange({ ...DEFAULT_COLOR_GRADING })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg glass-item text-[9px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange({ ...DEFAULT_COLOR_GRADING, ...preset.settings })}
            className="rounded-xl p-2 text-center transition-all glass-item hover:bg-primary/10"
          >
            <span className="text-sm">{preset.emoji}</span>
            <span className="block mt-0.5 text-[8px] font-semibold text-muted-foreground">
              {preset.label}
            </span>
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-2.5">
        {SLIDERS.map(({ key, label, icon: Icon, min, max }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Icon className="h-3 w-3" /> {label}
              </span>
              <span className="text-[10px] tabular-nums font-bold">
                {settings[key] > 0 ? "+" : ""}{settings[key]}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={settings[key]}
              onChange={(e) => upd(key, Number(e.target.value))}
              className="w-full h-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorGradingPanel;
