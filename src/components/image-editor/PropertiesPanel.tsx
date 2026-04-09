import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_PRESETS, CropPreset, ImageFile } from "@/types/image-editor";
import { EditorState } from "@/types/image-editor";
import {
  Sparkles,
  Eraser,
  Download,
  CheckSquare,
  Send,
  Info,
} from "lucide-react";

interface PropertiesPanelProps {
  activeTool: EditorState["activeTool"];
  activeImage: ImageFile | null;
  selectedCount: number;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onAiEdit: (action: string) => void;
  onCrop: (preset: CropPreset) => void;
  onBatchCrop: (preset: CropPreset) => void;
  onDownload: () => void;
  onSelectAll: () => void;
}

export default function PropertiesPanel({
  activeTool,
  activeImage,
  selectedCount,
  customPrompt,
  onCustomPromptChange,
  onAiEdit,
  onCrop,
  onBatchCrop,
  onDownload,
  onSelectAll,
}: PropertiesPanelProps) {
  const [batchMode, setBatchMode] = useState(false);

  return (
    <div className="w-72 flex flex-col gap-3 p-4 glass-elevated rounded-2xl overflow-y-auto max-h-[calc(100vh-140px)] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          {activeTool === "crop" && "Zuschneiden"}
          {(activeTool === "ai-edit" || activeTool === "enhance" || activeTool === "bg-remove") && "AI Werkzeuge"}
          {activeTool === "select" && "Eigenschaften"}
        </h2>
        {selectedCount > 1 && (
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {selectedCount} Bilder
          </span>
        )}
      </div>

      {/* Batch toggle */}
      {selectedCount > 0 && (activeTool === "crop" || activeTool === "ai-edit" || activeTool === "enhance" || activeTool === "bg-remove") && (
        <Button
          variant={batchMode ? "default" : "outline"}
          size="sm"
          className="text-xs rounded-xl h-8"
          onClick={() => {
            setBatchMode(!batchMode);
            if (!batchMode) onSelectAll();
          }}
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          {batchMode ? "Batch aktiv" : "Batch-Modus"}
        </Button>
      )}

      {/* AI Edit Panel */}
      {(activeTool === "ai-edit" || activeTool === "enhance" || activeTool === "bg-remove") && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex-col gap-1.5 h-auto py-3 rounded-xl text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => onAiEdit("enhance")}
              disabled={!activeImage || activeImage.isProcessing}
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              Verbessern
            </Button>

            <Button
              variant="outline"
              className="flex-col gap-1.5 h-auto py-3 rounded-xl text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => onAiEdit("remove-background")}
              disabled={!activeImage || activeImage.isProcessing}
            >
              <Eraser className="h-5 w-5 text-purple-500" />
              BG entfernen
            </Button>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Beschreibe was die AI tun soll...&#10;z.B. 'Mache den Himmel blauer'"
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              className="min-h-[72px] text-xs rounded-xl resize-none border-border/50 focus:border-primary/50"
            />
            <Button
              className="w-full gap-2 rounded-xl text-xs h-9 glass-button-primary text-primary-foreground"
              onClick={() => onAiEdit("custom-prompt")}
              disabled={!activeImage || !customPrompt.trim() || activeImage.isProcessing}
            >
              <Send className="h-3.5 w-3.5" />
              AI Bearbeiten
            </Button>
          </div>

          {activeImage?.hasBgRemoved && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <Info className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-green-700">
                Hintergrund entfernt — Download als transparentes PNG
              </p>
            </div>
          )}
        </div>
      )}

      {/* Crop Panel */}
      {activeTool === "crop" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1">
            {SOCIAL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent/80 transition-all text-left group disabled:opacity-40"
                onClick={() => (batchMode ? onBatchCrop(preset) : onCrop(preset))}
                disabled={!activeImage}
              >
                <span className="text-base">{preset.icon}</span>
                <span className="flex-1">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors tabular-nums">
                  {preset.width}×{preset.height}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Select tool info */}
      {activeTool === "select" && activeImage && (
        <div className="space-y-3">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Dateiname</span>
              <span className="font-medium text-foreground truncate max-w-[140px]">
                {activeImage.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Original</span>
              <span className="font-medium text-foreground tabular-nums">
                {activeImage.originalWidth} × {activeImage.originalHeight}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Aktuell</span>
              <span className="font-medium text-foreground tabular-nums">
                {activeImage.width} × {activeImage.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className={`font-medium ${activeImage.editedUrl ? "text-green-600" : "text-foreground"}`}>
                {activeImage.editedUrl ? "✓ Bearbeitet" : "Original"}
              </span>
            </div>
            {activeImage.hasBgRemoved && (
              <div className="flex justify-between">
                <span>Format</span>
                <span className="font-medium text-green-600">PNG (transparent)</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl text-xs h-9"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5" />
            Herunterladen
          </Button>
        </div>
      )}

      {!activeImage && (
        <p className="text-xs text-muted-foreground text-center py-6">
          Wähle ein Bild aus
        </p>
      )}
    </div>
  );
}
