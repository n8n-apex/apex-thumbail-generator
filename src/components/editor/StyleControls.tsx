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
  { color: "#FFCC00", label: "Yellow" },
  { color: "#34D399", label: "Green" },
  { color: "#F87171", label: "Red" },
  { color: "#3B82F6", label: "Blue" },
  { color: "#EC4899", label: "Pink" },
  { color: "#1E1E1E", label: "Black" },
];

const PresetPreview = ({ preset, accent, isActive }: { preset: SubtitlePreset; accent: string; isActive: boolean }) => {
  const styles: Record<SubtitlePreset, React.CSSProperties> = {
    hormozi: { fontWeight: 900, fontSize: 9, color: "#222", textShadow: "none" },
    karaoke: { fontWeight: 800, fontSize: 9, color: "#FFF", backgroundColor: accent, borderRadius: 4, padding: "1px 4px" },
    neon: { fontWeight: 700, fontSize: 9, color: accent, textShadow: `0 0 6px ${accent}80` },
    minimal: { fontWeight: 500, fontSize: 8, color: "rgba(0,0,0,0.5)" },
    boxed: { fontWeight: 800, fontSize: 8, color: "#FFF", backgroundColor: accent, borderRadius: 5, padding: "2px 5px" },
    outline: { fontWeight: 900, fontSize: 9, color: "transparent", WebkitTextStroke: "1px #333" },
  };

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 cursor-pointer transition-all ${
        isActive
          ? "bg-primary/10 ring-2 ring-primary/30 shadow-sm"
          : "bg-background hover:bg-secondary/80"
      }`}
    >
      <div className="flex h-8 items-center justify-center">
        <span style={styles[preset]}>WORD</span>
      </div>
      <span className="text-[9px] font-semibold text-muted-foreground">
        {SUBTITLE_PRESETS[preset].label}
      </span>
    </div>
  );
};

const StyleControls = ({
  style, onChange, removeSilences, onToggleSilences,
  thumbnailUrl, onExport, isExporting, exportProgress,
}: StyleControlsProps) => {
  const update = (patch: Partial<SubtitleStyle>) => onChange({ ...style, ...patch });

  return (
    <div className="flex h-full w-sidebar-w flex-col border-l border-border/60 glass">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Controls</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Silence Toggle */}
        <div className="glass-subtle rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Remove Silences</span>
            <button
              onClick={() => onToggleSilences(!removeSilences)}
              className={`relative h-6 w-10 rounded-full transition-colors ${
                removeSilences ? "bg-primary shadow-sm shadow-primary/30" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  removeSilences ? "left-[22px]" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Subtitle Presets */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Type className="h-3 w-3" /> Style
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_PRESETS) as SubtitlePreset[]).map((preset) => (
              <div key={preset} onClick={() => update({ preset })}>
                <PresetPreview preset={preset} accent={style.accentColor} isActive={style.preset === preset} />
              </div>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Palette className="h-3 w-3" /> Color
          </label>
          <div className="flex gap-2 glass-subtle rounded-xl p-3">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.color}
                onClick={() => update({ accentColor: c.color })}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  style.accentColor === c.color
                    ? "border-foreground/30 scale-110 shadow-md"
                    : "border-white/80 shadow-sm hover:scale-105"
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="glass-subtle rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Size</span>
            <span className="text-xs tabular-nums text-foreground font-semibold">{style.fontSize}px</span>
          </div>
          <input
            type="range" min={28} max={64} value={style.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="w-full accent-primary h-1"
          />
        </div>

        {/* Position */}
        <div className="glass-subtle rounded-xl p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Move className="h-3 w-3" /> Position
          </span>
          <div className="grid grid-cols-3 gap-1">
            {(["top", "center", "bottom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => update({ position: p })}
                className={`rounded-lg px-2 py-2 text-[10px] font-semibold transition-all ${
                  style.position === p
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thumbnail</label>
            <div className="mt-2 overflow-hidden rounded-xl shadow-md">
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full" />
            </div>
            <a
              href={thumbnailUrl}
              download="thumbnail.png"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          </div>
        )}

        {/* Export */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50"
        >
          {isExporting ? exportProgress : "Export Reel"}
        </button>
      </div>
    </div>
  );
};

export default StyleControls;
