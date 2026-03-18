import { SubtitleStyle } from "@/types/editor";
import { Type, Palette, Move, Sparkles } from "lucide-react";

interface StyleControlsProps {
  style: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  removeSilences: boolean;
  onToggleSilences: (v: boolean) => void;
  thumbnailUrl: string | null;
}

const StyleControls = ({
  style,
  onChange,
  removeSilences,
  onToggleSilences,
  thumbnailUrl,
}: StyleControlsProps) => {
  const update = (patch: Partial<SubtitleStyle>) =>
    onChange({ ...style, ...patch });

  return (
    <div className="flex h-full w-sidebar-w flex-col border-l border-border bg-editor-surface">
      {/* Header */}
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

        {/* Subtitle Style */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Type className="h-3 w-3" /> Subtitles
          </label>

          <div className="mt-2 space-y-3">
            {/* Font Size */}
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Size</span>
                <span className="text-xs tabular-nums text-foreground">{style.fontSize}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={72}
                value={style.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="w-full accent-primary h-1"
              />
            </div>

            {/* Font Weight */}
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Weight</span>
                <span className="text-xs tabular-nums text-foreground">{style.fontWeight}</span>
              </div>
              <input
                type="range"
                min={400}
                max={900}
                step={100}
                value={style.fontWeight}
                onChange={(e) => update({ fontWeight: Number(e.target.value) })}
                className="w-full accent-primary h-1"
              />
            </div>

            {/* Text Transform */}
            <div className="rounded-lg bg-background p-3">
              <span className="text-xs text-muted-foreground">Transform</span>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {(["none", "uppercase", "capitalize"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ textTransform: t })}
                    className={`rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      style.textTransform === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "none" ? "Normal" : t === "uppercase" ? "UPPER" : "Title"}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
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

            {/* Color */}
            <div className="rounded-lg bg-background p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Palette className="h-3 w-3" /> Color
              </span>
              <div className="mt-2 flex gap-2">
                {["#FFFFFF", "#FFFF00", "#00FF88", "#FF6B6B", "#60A5FA"].map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ color: c })}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      style.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Preview */}
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
              className="mt-2 flex w-full items-center justify-center rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Download Thumbnail
            </a>
          </div>
        )}

        {/* Export */}
        <button className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          Export Reel
        </button>
      </div>
    </div>
  );
};

export default StyleControls;
