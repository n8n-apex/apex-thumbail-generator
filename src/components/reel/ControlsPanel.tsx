import {
  SubtitleStyle, SubtitlePreset, SubtitleFont, SubtitleBackground, SpeakerSettings, SilenceCutSettings,
  TranscriptWord, ColorGradingSettings, SUBTITLE_PRESETS, SUBTITLE_FONTS,
} from "@/types/editor";
import { SanityCheckResult } from "@/types/video-project";
import { Type, Palette, Move, User, Download, Maximize, Clock, Plus, RefreshCw, RectangleHorizontal, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

function parseProgressPercent(progress: string): number {
  const match = progress.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}
import SilenceCutPanel from "./SilenceCutPanel";
import ThumbnailPanel from "./ThumbnailPanel";
import TranscriptEditor from "./TranscriptEditor";
import ColorGradingPanel from "./ColorGradingPanel";

interface ControlsPanelProps {
  style: SubtitleStyle;
  speaker: SpeakerSettings;
  silenceCut: SilenceCutSettings;
  onStyleChange: (s: SubtitleStyle) => void;
  onSpeakerChange: (s: SpeakerSettings) => void;
  onSilenceCutChange: (s: SilenceCutSettings) => void;
  onColorGradingChange: (s: ColorGradingSettings) => void;
  onTranscriptChange: (words: TranscriptWord[]) => void;
  onExport: () => void;
  onAddMore: () => void;
  onRegenerate: () => void;
  videoRef?: HTMLVideoElement | null;
  transcript?: TranscriptWord[];
  currentTime: number;
  colorGrading: ColorGradingSettings;
  isExporting: boolean;
  exportProgress: string;
  silenceCount: number;
  timeSaved: number;
  duration: number;
  sanityCheck?: SanityCheckResult;
  calibrationReasoning?: string;
}

const ACCENT_COLORS = [
  "#FFFFFF", "#FFCC00", "#34D399", "#F87171", "#3B82F6", "#EC4899",
];

const ControlsPanel = ({
  style, speaker, silenceCut, colorGrading, onStyleChange, onSpeakerChange, onSilenceCutChange,
  onColorGradingChange, onTranscriptChange, onExport, onAddMore, onRegenerate, videoRef, transcript,
  currentTime, isExporting, exportProgress, silenceCount, timeSaved, duration, sanityCheck, calibrationReasoning,
}: ControlsPanelProps) => {
  const upd = (p: Partial<SubtitleStyle>) => onStyleChange({ ...style, ...p });
  const updSpk = (p: Partial<SpeakerSettings>) => onSpeakerChange({ ...speaker, ...p });

  return (
    <div className="flex flex-col h-full overflow-y-auto py-3 px-3 sm:py-4 sm:pr-4 sm:pl-2 w-full sm:w-[340px] lg:w-[380px] sm:flex-shrink-0">
      <div className="space-y-3 sm:space-y-3.5 lg:space-y-4 flex-1">
        {/* Quality Score Badge */}
        {sanityCheck && (
          <div className={`rounded-2xl p-3 flex items-center gap-2.5 ${
            sanityCheck.passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"
          }`}>
            {sanityCheck.passed 
              ? <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-foreground">
                  {sanityCheck.overall_score >= 80 ? "Export-bereit" : "Score zu niedrig"}
                </span>
                <span className={`text-[10px] font-bold tabular-nums ${
                  sanityCheck.overall_score >= 80 ? "text-muted-foreground" : "text-destructive"
                }`}>
                  {sanityCheck.overall_score}/100
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{sanityCheck.summary}</p>
              {calibrationReasoning && (
                <p className="text-[8px] text-muted-foreground/60 mt-1 leading-tight">{calibrationReasoning}</p>
              )}
            </div>
            {sanityCheck.overall_score < 80 && (
              <button
                onClick={onRegenerate}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-semibold transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Neu
              </button>
            )}
          </div>
        )}


        {/* Silence Cutting */}
        <SilenceCutPanel
          settings={silenceCut}
          onChange={onSilenceCutChange}
          silenceCount={silenceCount}
          timeSaved={timeSaved}
          duration={duration}
        />
        {/* Speaker Centering */}
        <div className="glass-elevated rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
              <User className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground">Sprecher</span>
          </div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] text-muted-foreground">Zentrieren & Tracking</span>
            <button
              onClick={() => updSpk({ centerSpeaker: !speaker.centerSpeaker })}
              className={`relative h-6 w-10 rounded-full transition-all ${
                speaker.centerSpeaker ? "bg-primary shadow-md shadow-primary/25" : "glass-item"
              }`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                speaker.centerSpeaker ? "left-[22px]" : "left-1"
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
              <input type="range" min={0.5} max={2} step={0.1} value={speaker.zoom}
                onChange={(e) => updSpk({ zoom: parseFloat(e.target.value) })}
                className="w-full h-1" />
            </div>
          )}
        </div>

        {/* Subtitle Style Presets */}
        <div className="glass-elevated rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
              <Type className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground">Untertitel-Stil</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_PRESETS) as SubtitlePreset[]).map((preset) => {
              const isActive = style.preset === preset;
              return (
                <button key={preset} onClick={() => upd({ preset })}
                  className={`rounded-xl p-2 sm:p-2.5 text-center transition-all ${
                    isActive ? "bg-primary/15 ring-2 ring-primary/30 shadow-sm" : "glass-item"
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
        <div className="glass-elevated rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
              <Type className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground">Schriftart</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUBTITLE_FONTS) as SubtitleFont[]).map((font) => {
              const cfg = SUBTITLE_FONTS[font];
              const isActive = style.font === font;
              return (
                <button key={font} onClick={() => upd({ font })}
                  className={`rounded-xl p-2 sm:p-2.5 transition-all ${
                    isActive ? "bg-primary/15 ring-2 ring-primary/30" : "glass-item"
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

        {/* Color + Size + Box + Timing */}
        <div className="glass-elevated rounded-2xl p-3.5 space-y-3">
          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <Palette className="h-3 w-3" /> Farbe
            </span>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button key={c} onClick={() => upd({ accentColor: c })}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    style.accentColor === c ? "border-foreground/30 scale-110 shadow-lg" : "border-border shadow-sm hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: c,
                    boxShadow: c === "#FFFFFF"
                      ? `inset 0 0 0 1px rgba(0,0,0,0.1)${style.accentColor === c ? ', 0 0 12px rgba(0,0,0,0.1)' : ''}`
                      : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">Größe</span>
              <span className="text-[10px] tabular-nums font-bold">{style.fontSize}px</span>
            </div>
            <input type="range" min={28} max={140} value={style.fontSize}
              onChange={(e) => upd({ fontSize: Number(e.target.value) })}
              className="w-full h-1" />
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <RectangleHorizontal className="h-3 w-3" /> Textbox
            </span>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Breite</span>
                  <span className="text-[10px] tabular-nums font-bold">{style.boxWidth ?? 85}%</span>
                </div>
                <input type="range" min={30} max={100} value={style.boxWidth ?? 85}
                  onChange={(e) => upd({ boxWidth: Number(e.target.value) })}
                  className="w-full h-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Zeilen</span>
                  <span className="text-[10px] tabular-nums font-bold">{style.boxHeight ?? 2}</span>
                </div>
                <input type="range" min={1} max={6} step={1} value={style.boxHeight ?? 2}
                  onChange={(e) => upd({ boxHeight: Number(e.target.value) })}
                  className="w-full h-1" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-medium mb-1.5 block">Hintergrund</span>
                <div className="flex gap-1.5">
                  {([["none", "Ohne"], ["black", "Schwarz"], ["white", "Weiß"]] as [SubtitleBackground, string][]).map(([val, label]) => {
                    const isActive = (style.backgroundBox ?? "none") === val;
                    return (
                      <button key={val} onClick={() => upd({ backgroundBox: val })}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                          isActive ? "bg-primary/15 ring-1 ring-primary/30 text-foreground" : "glass-item text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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
              className="w-full h-1" />
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <Move className="h-3 w-3" /> Position
            </span>
            <div className="grid grid-cols-3 gap-1">
              {([
                { label: "Oben", x: 50, y: 15 },
                { label: "Mitte", x: 50, y: 50 },
                { label: "Unten", x: 50, y: 75 },
              ] as const).map((p) => {
                const isActive = style.positionY === p.y && style.positionX === p.x;
                return (
                  <button key={p.label} onClick={() => upd({ positionX: p.x, positionY: p.y })}
                    className={`rounded-xl py-1.5 text-[10px] font-bold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "glass-item text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 opacity-60">Oder direkt im Video ziehen</p>
          </div>
        </div>

        {/* Regenerate transcript */}
        <button onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 rounded-2xl glass-item py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Transkript neu generieren
        </button>

        {/* Transcript Editor */}
        {transcript && transcript.length > 0 && (
          <TranscriptEditor
            transcript={transcript}
            currentTime={currentTime}
            onTranscriptChange={onTranscriptChange}
            onRequestRegenerate={onRegenerate}
          />
        )}

        {/* Color Grading */}
        <ColorGradingPanel settings={colorGrading} onChange={onColorGradingChange} />

        {/* Thumbnail Generator */}
        <ThumbnailPanel videoRef={videoRef} transcript={transcript} />
      </div>

      {/* Bottom actions */}
      <div className="pt-3 sm:pt-4 mt-auto space-y-2">
        <button onClick={onAddMore}
          className="w-full flex items-center justify-center gap-2 rounded-2xl glass-item py-2.5 text-xs font-bold text-secondary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Weitere Videos hinzufügen
        </button>
        <button onClick={onExport} disabled={isExporting}
          className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl glass-button-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-80"
        >
          {isExporting && (
            <div
              className="absolute inset-0 bg-primary/30 transition-all duration-300 ease-out"
              style={{ width: `${parseProgressPercent(exportProgress)}%` }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? exportProgress || "Wird exportiert..." : "Clip exportieren"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ControlsPanel;
