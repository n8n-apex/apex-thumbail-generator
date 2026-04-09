import { ImageAdjustments, ImageFile } from "@/types/image-editor";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, Sun, Contrast, Droplets, Focus, Thermometer, Aperture } from "lucide-react";

interface AdjustPanelProps {
  activeImage: ImageFile | null;
  onAdjust: (key: keyof ImageAdjustments, value: number) => void;
  onReset: () => void;
  onApply: () => void;
}

const SLIDERS: {
  key: keyof ImageAdjustments;
  label: string;
  icon: typeof Sun;
  min: number;
  max: number;
  default: number;
  unit: string;
}[] = [
  { key: "brightness", label: "Helligkeit", icon: Sun, min: 0, max: 200, default: 100, unit: "%" },
  { key: "contrast", label: "Kontrast", icon: Contrast, min: 0, max: 200, default: 100, unit: "%" },
  { key: "saturation", label: "Sättigung", icon: Droplets, min: 0, max: 200, default: 100, unit: "%" },
  { key: "exposure", label: "Belichtung", icon: Aperture, min: -100, max: 100, default: 0, unit: "" },
  { key: "temperature", label: "Temperatur", icon: Thermometer, min: -100, max: 100, default: 0, unit: "" },
  { key: "sharpness", label: "Schärfe", icon: Focus, min: 0, max: 200, default: 100, unit: "%" },
];

export default function AdjustPanel({ activeImage, onAdjust, onReset, onApply }: AdjustPanelProps) {
  if (!activeImage) {
    return (
      <div className="w-72 flex flex-col gap-3 p-4 glass-elevated rounded-2xl shadow-xl">
        <h2 className="text-sm font-bold text-foreground">Anpassen</h2>
        <p className="text-xs text-muted-foreground text-center py-6">Wähle ein Bild aus</p>
      </div>
    );
  }

  const adj = activeImage.adjustments;
  const hasChanges = SLIDERS.some((s) => adj[s.key] !== s.default);

  return (
    <div className="w-72 flex flex-col gap-3 p-4 glass-elevated rounded-2xl overflow-y-auto max-h-[calc(100vh-140px)] shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Anpassen</h2>
        {hasChanges && (
          <button
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3 inline mr-1" />
            Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {SLIDERS.map((s) => {
          const Icon = s.icon;
          const value = adj[s.key];
          const displayValue = s.default === 100 ? `${value}%` : value > 0 ? `+${value}` : `${value}`;
          return (
            <div key={s.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-foreground">{s.label}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-10 text-right">
                  {displayValue}
                </span>
              </div>
              <Slider
                min={s.min}
                max={s.max}
                step={1}
                value={[value]}
                onValueChange={([v]) => onAdjust(s.key, v)}
                className="cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <Button
          className="w-full gap-2 rounded-xl text-xs h-9 glass-button-primary text-primary-foreground mt-2"
          onClick={onApply}
        >
          <Check className="h-3.5 w-3.5" />
          Anpassungen anwenden
        </Button>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Vorschau in Echtzeit — Klicke "Anwenden" um die Änderungen ins Bild zu brennen
      </p>
    </div>
  );
}
