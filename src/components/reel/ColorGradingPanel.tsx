import { ColorGradingSettings, DEFAULT_COLOR_GRADING } from "@/types/editor";
import { Sun, Contrast, Droplets, Thermometer, Sparkles, RotateCcw } from "lucide-react";

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
  unit?: string;
}[] = [
  { key: "brightness", label: "Helligkeit", icon: Sun, min: -100, max: 100 },
  { key: "contrast", label: "Kontrast", icon: Contrast, min: -100, max: 100 },
  { key: "saturation", label: "Sättigung", icon: Droplets, min: -100, max: 100 },
  { key: "warmth", label: "Wärme", icon: Thermometer, min: -100, max: 100 },
  { key: "fade", label: "Fade", icon: Sparkles, min: 0, max: 100 },
];

/** Convert our settings to a CSS filter string for live preview */
export function colorGradingToCSS(s: ColorGradingSettings): string {
  const filters: string[] = [];
  // brightness: 0 = 1.0, -100 = 0.3, +100 = 1.7
  filters.push(`brightness(${1 + s.brightness / 143})`);
  // contrast: 0 = 1.0, -100 = 0.4, +100 = 1.8
  filters.push(`contrast(${1 + s.contrast / 125})`);
  // saturation: 0 = 1.0, -100 = 0.0, +100 = 2.0
  filters.push(`saturate(${1 + s.saturation / 100})`);
  // warmth via sepia + hue-rotate trick
  if (s.warmth > 0) {
    filters.push(`sepia(${s.warmth / 200})`);
  } else if (s.warmth < 0) {
    filters.push(`hue-rotate(${s.warmth / 5}deg)`);
  }
  return filters.join(" ");
}

/** Convert settings to FFmpeg eq filter string for export */
export function colorGradingToFFmpeg(s: ColorGradingSettings): string | null {
  const parts: string[] = [];
  if (s.brightness !== 0) parts.push(`brightness=${(s.brightness / 100) * 0.3}`);
  if (s.contrast !== 0) parts.push(`contrast=${1 + s.contrast / 100}`);
  if (s.saturation !== 0) parts.push(`saturation=${1 + s.saturation / 100}`);
  // warmth approximation via color temperature (gamma adjustment)
  if (s.warmth > 0) parts.push(`gamma_r=${1 + s.warmth / 300}:gamma_b=${1 - s.warmth / 400}`);
  if (s.warmth < 0) parts.push(`gamma_b=${1 + Math.abs(s.warmth) / 300}:gamma_r=${1 - Math.abs(s.warmth) / 400}`);
  if (parts.length === 0) return null;
  return `eq=${parts.join(":")}`;
}

const PRESETS: { label: string; emoji: string; settings: Partial<ColorGradingSettings> }[] = [
  { label: "Cinematic", emoji: "🎬", settings: { brightness: 5, contrast: 20, saturation: -15, warmth: 15, fade: 10 } },
  { label: "Warm Glow", emoji: "☀️", settings: { brightness: 10, contrast: 10, saturation: 10, warmth: 35, fade: 5 } },
  { label: "Cool Tone", emoji: "❄️", settings: { brightness: 0, contrast: 15, saturation: -10, warmth: -30, fade: 0 } },
  { label: "Vibrant", emoji: "🌈", settings: { brightness: 5, contrast: 15, saturation: 40, warmth: 5, fade: 0 } },
  { label: "Moody", emoji: "🌙", settings: { brightness: -15, contrast: 25, saturation: -25, warmth: 10, fade: 15 } },
  { label: "Clean", emoji: "✨", settings: { brightness: 8, contrast: 5, saturation: 5, warmth: 0, fade: 0 } },
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
