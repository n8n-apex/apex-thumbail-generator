import { SilenceCutSettings } from "@/types/editor";
import { Scissors, Volume2, Clock, Shield } from "lucide-react";

interface SilenceCutPanelProps {
  settings: SilenceCutSettings;
  onChange: (s: SilenceCutSettings) => void;
  silenceCount: number;
  timeSaved: number;
  duration: number;
}

const SilenceCutPanel = ({ settings, onChange, silenceCount, timeSaved, duration }: SilenceCutPanelProps) => {
  const upd = (p: Partial<SilenceCutSettings>) => onChange({ ...settings, ...p });

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
              type="range" min={5} max={80} step={1}
              value={settings.threshold * 1000}
              onChange={(e) => upd({ threshold: Number(e.target.value) / 1000 })}
              className="w-full h-1"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-muted-foreground">Aggressiv</span>
              <span className="text-[9px] text-muted-foreground">Sanft</span>
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
              type="range" min={100} max={2000} step={50}
              value={settings.minDuration * 1000}
              onChange={(e) => upd({ minDuration: Number(e.target.value) / 1000 })}
              className="w-full h-1"
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
              type="range" min={0} max={300} step={10}
              value={settings.padding * 1000}
              onChange={(e) => upd({ padding: Number(e.target.value) / 1000 })}
              className="w-full h-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SilenceCutPanel;
