import {
  SubtitleStyle, SubtitlePreset, SubtitleFont, SpeakerSettings, SilenceCutSettings,
  SUBTITLE_PRESETS, SUBTITLE_FONTS,
} from "@/types/editor";
import { Type, Palette, Move, User, Download, Maximize, Clock, Plus } from "lucide-react";
import SilenceCutPanel from "./SilenceCutPanel";

interface ControlsPanelProps {
  style: SubtitleStyle;
  speaker: SpeakerSettings;
  silenceCut: SilenceCutSettings;
  onStyleChange: (s: SubtitleStyle) => void;
  onSpeakerChange: (s: SpeakerSettings) => void;
  onSilenceCutChange: (s: SilenceCutSettings) => void;
  onExport: () => void;
  onAddMore: () => void;
  isExporting: boolean;
  exportProgress: string;
  silenceCount: number;
  timeSaved: number;
  duration: number;
}

const ACCENT_COLORS = [
  "#FFCC00", "#34D399", "#F87171", "#3B82F6", "#EC4899", "#FFFFFF",
];

const ControlsPanel = ({
  style, speaker, silenceCut, onStyleChange, onSpeakerChange, onSilenceCutChange,
  onExport, onAddMore, isExporting, exportProgress, silenceCount, timeSaved, duration,
}: ControlsPanelProps) => {
  const upd = (p: Partial<SubtitleStyle>) => onStyleChange({ ...style, ...p });
  const updSpk = (p: Partial<SpeakerSettings>) => onSpeakerChange({ ...speaker, ...p });

  return (
    <div className="flex flex-col h-full overflow-y-auto py-3 px-3 sm:py-4 sm:pr-4 sm:pl-2 w-full sm:w-[340px] sm:flex-shrink-0">
      <div className="space-y-3 sm:space-y-4 flex-1">
        {/* Silence Cutting */}
        <SilenceCutPanel
          settings={silenceCut}
          onChange={onSilenceCutChange}
          silenceCount={silenceCount}
          timeSaved={timeSaved}
          duration={duration}
        />
        {/* Speaker Centering */}
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <User className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Speaker</span>
          </div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] text-muted-foreground">Center & Stabilize</span>
            <button
              onClick={() => updSpk({ centerSpeaker: !speaker.centerSpeaker })}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                speaker.centerSpeaker ? "bg-primary shadow-sm shadow-primary/20" : "bg-border"
              }`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                speaker.centerSpeaker ? "left-[18px]" : "left-0.5"
              }`} />
            </button>
          </div>
          {speaker.centerSpeaker && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Maximize className="h-3 w-3" /> Zoom
                </span>
                <span className="text-[10px] tabular-nums font-semibold">{speaker.zoom.toFixed(1)}x</span>
              </div>
              <input type="range" min={1} max={2} step={0.1} value={speaker.zoom}
                onChange={(e) => updSpk({ zoom: parseFloat(e.target.value) })}
                className="w-full accent-primary h-1" />
            </div>
          )}
        </div>

        {/* Subtitle Style Presets */}
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <Type className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Subtitle Style</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_PRESETS) as SubtitlePreset[]).map((preset) => {
              const isActive = style.preset === preset;
              return (
                <button key={preset} onClick={() => upd({ preset })}
                  className={`rounded-xl p-2 sm:p-2.5 text-center transition-all ${
                    isActive ? "bg-primary/10 ring-2 ring-primary/30 shadow-sm" : "bg-secondary/60 hover:bg-secondary"
                  }`}
                >
                  <span className="text-sm">{SUBTITLE_PRESETS[preset].emoji}</span>
                  <span className="block mt-1 text-[8px] font-semibold text-muted-foreground">
                    {SUBTITLE_PRESETS[preset].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Picker */}
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <Type className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Font</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_FONTS) as SubtitleFont[]).map((font) => {
              const cfg = SUBTITLE_FONTS[font];
              const isActive = style.font === font;
              return (
                <button key={font} onClick={() => upd({ font })}
                  className={`rounded-xl p-2 sm:p-2.5 transition-all ${
                    isActive ? "bg-primary/10 ring-2 ring-primary/30" : "bg-secondary/60 hover:bg-secondary"
                  }`}
                >
                  <span style={{ fontFamily: cfg.family, fontWeight: cfg.weight, fontSize: 13 }} className="text-foreground">
                    Aa
                  </span>
                  <span className="block mt-0.5 text-[8px] font-semibold text-muted-foreground">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color + Size + Position + Timing */}
        <div className="glass rounded-2xl p-3.5 space-y-3">
          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <Palette className="h-3 w-3" /> Color
            </span>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button key={c} onClick={() => upd({ accentColor: c })}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    style.accentColor === c ? "border-foreground/30 scale-110 shadow-lg" : "border-white/60 shadow-sm hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">Size</span>
              <span className="text-[10px] tabular-nums font-bold">{style.fontSize}px</span>
            </div>
            <input type="range" min={28} max={96} value={style.fontSize}
              onChange={(e) => upd({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary h-1" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timing
              </span>
              <span className="text-[10px] tabular-nums font-bold">{(style.timeOffset * 1000).toFixed(0)}ms</span>
            </div>
            <input type="range" min={-500} max={200} value={style.timeOffset * 1000}
              onChange={(e) => upd({ timeOffset: Number(e.target.value) / 1000 })}
              className="w-full accent-primary h-1" />
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <Move className="h-3 w-3" /> Position
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(["top", "center", "bottom"] as const).map((p) => (
                <button key={p} onClick={() => upd({ position: p })}
                  className={`rounded-lg py-1.5 text-[10px] font-bold transition-all ${
                    style.position === p
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="pt-3 sm:pt-4 mt-auto space-y-2">
        <button onClick={onAddMore}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          <Plus className="h-3.5 w-3.5" />
          Add More Videos
        </button>
        <button onClick={onExport} disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? exportProgress : "Export Clip"}
        </button>
      </div>
    </div>
  );
};

export default ControlsPanel;
