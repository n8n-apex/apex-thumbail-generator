import { SubtitleStyle, SubtitlePreset, SUBTITLE_PRESETS } from "@/types/editor";
import { Type, Palette, Move, Sparkles, Download } from "lucide-react";

interface StyleControlsProps {
  style: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  removeSilences: boolean;
  onToggleSilences: (v: boolean) => void;
  thumbnailUrl: string | null;
  onExport: () => void;
  isExporting: boolean;
  exportProgress: string;
}

const ACCENT_COLORS = [
  { color: "#FFFF00", label: "Yellow" },
  { color: "#00FF88", label: "Green" },
  { color: "#FF6B6B", label: "Red" },
  { color: "#60A5FA", label: "Blue" },
  { color: "#F472B6", label: "Pink" },
  { color: "#FFFFFF", label: "White" },
];

/** Mini preview of how the preset looks */
const PresetPreview = ({ preset, accent, isActive }: { preset: SubtitlePreset; accent: string; isActive: boolean }) => {
  const styles: Record<SubtitlePreset, React.CSSProperties> = {
    hormozi: {
      fontWeight: 900, fontSize: 9, color: "#FFF",
      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
    },
    karaoke: {
      fontWeight: 800, fontSize: 9, color: "#000",
      backgroundColor: accent, borderRadius: 3, padding: "1px 3px",
    },
    neon: {
      fontWeight: 700, fontSize: 9, color: accent,
      textShadow: `0 0 6px ${accent}, 0 0 12px ${accent}60`,
    },
    minimal: {
      fontWeight: 500, fontSize: 8, color: "rgba(255,255,255,0.8)",
    },
    boxed: {
      fontWeight: 800, fontSize: 8, color: "#000",
      backgroundColor: accent, borderRadius: 4, padding: "1px 4px",
    },
    outline: {
      fontWeight: 900, fontSize: 9, color: "transparent",
      WebkitTextStroke: "1px #FFF",
    },
  };

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 cursor-pointer transition-all ${
        isActive
          ? "bg-primary/15 ring-1 ring-primary"
          : "bg-background hover:bg-editor-surface-hover"
      }`}
    >
      <div className="flex h-8 items-center justify-center">
        <span style={styles[preset]}>WORD</span>
      </div>
      <span className="text-[9px] font-medium text-muted-foreground">
        {SUBTITLE_PRESETS[preset].label}
      </span>
    </div>
  );
};

const StyleControls = ({
  style,
  onChange,
  removeSilences,
  onToggleSilences,
  thumbnailUrl,
  onExport,
  isExporting,
  exportProgress,
}: StyleControlsProps) => {
  const update = (patch: Partial<SubtitleStyle>) =>
    onChange({ ...style, ...patch });

  return (
    <div className="flex h-full w-sidebar-w flex-col border-l border-border bg-editor-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Controls</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Silence Toggle */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Processing
          </label>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-background p-3">
            <span className="text-xs text-foreground">Remove Silences</span>
            <button
              onClick={() => onToggleSilences(!removeSilences)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                removeSilences ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                  removeSilences ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Subtitle Preset Picker */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Type className="h-3 w-3" /> Subtitle Style
          </label>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_PRESETS) as SubtitlePreset[]).map((preset) => (
              <div key={preset} onClick={() => update({ preset })}>
                <PresetPreview
                  preset={preset}
                  accent={style.accentColor}
                  isActive={style.preset === preset}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Palette className="h-3 w-3" /> Accent Color
          </label>
          <div className="mt-2 flex gap-2 rounded-lg bg-background p-3">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.color}
                onClick={() => update({ accentColor: c.color })}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  style.accentColor === c.color
                    ? "border-foreground scale-110 shadow-lg"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Size</span>
              <span className="text-xs tabular-nums text-foreground">{style.fontSize}px</span>
            </div>
            <input
              type="range"
              min={28}
              max={64}
              value={style.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary h-1"
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <div className="rounded-lg bg-background p-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Move className="h-3 w-3" /> Position
            </span>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(["top", "center", "bottom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => update({ position: p })}
                  className={`rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${
                    style.position === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Thumbnail
            </label>
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full" />
            </div>
            <a
              href={thumbnailUrl}
              download="thumbnail.png"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-muted py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              <Download className="h-3 w-3" />
              Download Thumbnail
            </a>
          </div>
        )}

        {/* Export */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isExporting ? exportProgress : "Export Reel"}
        </button>
      </div>
    </div>
  );
};

export default StyleControls;
