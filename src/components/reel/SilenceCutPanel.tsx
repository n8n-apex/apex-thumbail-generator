import { SilenceCutSettings } from "@/types/editor";
import { Scissors, Volume2, Clock, Shield, Zap, Gauge, Feather, Info } from "lucide-react";
import { useState } from "react";

interface SilenceCutPanelProps {
  settings: SilenceCutSettings;
  onChange: (s: SilenceCutSettings) => void;
  silenceCount: number;
  timeSaved: number;
  duration: number;
  calibrationReasoning?: string;
}

type CutPreset = "aggressive" | "balanced" | "gentle";

const PRESETS: Record<CutPreset, { label: string; icon: typeof Zap; desc: string; settings: Omit<SilenceCutSettings, "enabled"> }> = {
  aggressive: {
    label: "Aggressiv",
    icon: Zap,
    desc: "Kurze Pausen, schneller Schnitt",
    settings: { threshold: 0.025, minDuration: 0.2, padding: 0.05 },
  },
  balanced: {
    label: "Ausgewogen",
    icon: Gauge,
    desc: "Natürlicher Redefluss",
    settings: { threshold: 0.015, minDuration: 0.4, padding: 0.1 },
  },
  gentle: {
    label: "Sanft",
    icon: Feather,
    desc: "Nur lange Pausen entfernen",
    settings: { threshold: 0.008, minDuration: 0.8, padding: 0.15 },
  },
};

function detectActivePreset(s: SilenceCutSettings): CutPreset | null {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const p = preset.settings;
    if (
      Math.abs(s.threshold - p.threshold) < 0.002 &&
      Math.abs(s.minDuration - p.minDuration) < 0.05 &&
      Math.abs(s.padding - p.padding) < 0.02
    ) {
      return key as CutPreset;
    }
  }
  return null;
}

const SilenceCutPanel = ({ settings, onChange, silenceCount, timeSaved, duration, calibrationReasoning }: SilenceCutPanelProps) => {
  const upd = (p: Partial<SilenceCutSettings>) => onChange({ ...settings, ...p });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activePreset = detectActivePreset(settings);

  return (
    <div className="glass-elevated rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
            <Scissors className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">Pausen schneiden</span>
        </div>
        <button
          onClick={() => upd({ enabled: !settings.enabled })}
          className={`relative h-6 w-10 rounded-full transition-all ${
            settings.enabled ? "bg-primary shadow-md shadow-primary/25" : "glass-item"
          }`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            settings.enabled ? "left-[22px]" : "left-1"
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex gap-2">
            {[
              { value: silenceCount, label: "Pausen" },
              { value: `${timeSaved.toFixed(1)}s`, label: "Gespart" },
              { value: duration > 0 ? `${(duration - timeSaved).toFixed(1)}s` : "0s", label: "Ergebnis" },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 rounded-xl glass-item p-2.5 text-center">
                <span className="block text-lg font-bold text-primary tabular-nums">{stat.value}</span>
                <span className="text-[9px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(PRESETS) as CutPreset[]).map((key) => {
              const preset = PRESETS[key];
              const Icon = preset.icon;
              const isActive = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => onChange({ ...settings, ...preset.settings })}
                  className={`rounded-xl p-2 text-center transition-all ${
                    isActive ? "bg-primary/15 ring-2 ring-primary/30 shadow-sm" : "glass-item hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`block text-[9px] font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toggle advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            {showAdvanced ? "Weniger Optionen" : "Feinabstimmung"}
            <span className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}>▾</span>
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              {/* Sensitivity / Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> Empfindlichkeit
                  </span>
                  <span className="text-[11px] tabular-nums font-bold">
                    {Math.round(settings.threshold * 1000)}
                  </span>
                </div>
                <input
                  type="range" min={3} max={60} step={1}
                  value={settings.threshold * 1000}
                  onChange={(e) => upd({ threshold: Number(e.target.value) / 1000 })}
                  className="w-full h-1.5 accent-primary"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-muted-foreground">Mehr schneiden</span>
                  <span className="text-[9px] text-muted-foreground">Weniger schneiden</span>
                </div>
              </div>

              {/* Min Duration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Min. Pausenlänge
                  </span>
                  <span className="text-[11px] tabular-nums font-bold">{(settings.minDuration * 1000).toFixed(0)}ms</span>
                </div>
                <input
                  type="range" min={100} max={2000} step={25}
                  value={settings.minDuration * 1000}
                  onChange={(e) => upd({ minDuration: Number(e.target.value) / 1000 })}
                  className="w-full h-1.5 accent-primary"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-muted-foreground">100ms</span>
                  <span className="text-[9px] text-muted-foreground">2000ms</span>
                </div>
              </div>

              {/* Padding */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Schutz-Padding
                  </span>
                  <span className="text-[11px] tabular-nums font-bold">{(settings.padding * 1000).toFixed(0)}ms</span>
                </div>
                <input
                  type="range" min={0} max={300} step={5}
                  value={settings.padding * 1000}
                  onChange={(e) => upd({ padding: Number(e.target.value) / 1000 })}
                  className="w-full h-1.5 accent-primary"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-muted-foreground">Kein Schutz</span>
                  <span className="text-[9px] text-muted-foreground">Viel Schutz</span>
                </div>
              </div>
            </div>
          )}

          {/* Calibration info */}
          {calibrationReasoning && (
            <div className="rounded-xl bg-muted/30 p-2.5 flex items-start gap-2">
              <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-[9px] text-muted-foreground leading-relaxed">{calibrationReasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SilenceCutPanel;
