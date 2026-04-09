import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_PRESETS, CropPreset, ImageFile } from "@/types/image-editor";
import { EditorState } from "@/types/image-editor";
import {
  Sparkles,
  Eraser,
  Wand2,
  Crop,
  Download,
  CheckSquare,
  Send,
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
    <div className="w-72 flex flex-col gap-4 p-4 glass-elevated rounded-2xl overflow-y-auto max-h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Eigenschaften</h2>
        {selectedCount > 1 && (
          <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {selectedCount} ausgewählt
          </span>
        )}
      </div>

      {/* Batch toggle */}
      {selectedCount > 0 && (
        <div className="flex gap-2">
          <Button
            variant={batchMode ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs rounded-xl"
            onClick={() => {
              setBatchMode(!batchMode);
              if (!batchMode) onSelectAll();
            }}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            Batch-Modus
          </Button>
        </div>
      )}

      {/* AI Edit Panel */}
      {(activeTool === "ai-edit" || activeTool === "enhance" || activeTool === "bg-remove") && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            AI Aktionen
          </h3>

          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl text-xs h-9"
            onClick={() => onAiEdit("enhance")}
            disabled={!activeImage}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Auto-Verbesserung
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl text-xs h-9"
            onClick={() => onAiEdit("remove-background")}
            disabled={!activeImage}
          >
            <Eraser className="h-3.5 w-3.5 text-purple-500" />
            Hintergrund entfernen
          </Button>

          <div className="space-y-2">
            <Textarea
              placeholder="Beschreibe was die AI tun soll... z.B. 'Mache den Himmel blauer' oder 'Füge einen warmen Filter hinzu'"
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              className="min-h-[80px] text-xs rounded-xl resize-none"
            />
            <Button
              className="w-full gap-2 rounded-xl text-xs h-9 glass-button-primary text-primary-foreground"
              onClick={() => onAiEdit("custom-prompt")}
              disabled={!activeImage || !customPrompt.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              AI Bearbeiten
            </Button>
          </div>
        </div>
      )}

      {/* Crop Panel */}
      {activeTool === "crop" && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Social Media Formate
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {SOCIAL_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                className="w-full justify-start gap-2 rounded-xl text-xs h-9"
                onClick={() => (batchMode ? onBatchCrop(preset) : onCrop(preset))}
                disabled={!activeImage}
              >
                <span>{preset.icon}</span>
                <span className="flex-1 text-left">{preset.label}</span>
                <span className="text-muted-foreground text-[10px]">
                  {preset.width}×{preset.height}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Select tool info */}
      {activeTool === "select" && activeImage && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bild-Info
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Dateiname</span>
              <span className="font-medium text-foreground truncate max-w-[140px]">
                {activeImage.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Größe</span>
              <span className="font-medium text-foreground">
                {activeImage.width} × {activeImage.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="font-medium text-foreground">
                {activeImage.editedUrl ? "Bearbeitet" : "Original"}
              </span>
            </div>
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
        <p className="text-xs text-muted-foreground text-center py-8">
          Wähle ein Bild aus um es zu bearbeiten
        </p>
      )}
    </div>
  );
}
