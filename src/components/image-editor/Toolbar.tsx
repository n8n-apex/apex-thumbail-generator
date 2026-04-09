import {
  MousePointer2,
  Crop,
  Sparkles,
  Wand2,
  Eraser,
  Upload,
  Download,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditorState } from "@/types/image-editor";

interface ToolbarProps {
  activeTool: EditorState["activeTool"];
  onToolChange: (tool: EditorState["activeTool"]) => void;
  onUpload: () => void;
  onDownload: () => void;
  onReset: () => void;
  hasImages: boolean;
  hasActiveImage: boolean;
}

const tools = [
  { id: "select" as const, icon: MousePointer2, label: "Auswählen" },
  { id: "crop" as const, icon: Crop, label: "Zuschneiden" },
  { id: "ai-edit" as const, icon: Wand2, label: "AI Bearbeiten" },
  { id: "enhance" as const, icon: Sparkles, label: "AI Verbessern" },
  { id: "bg-remove" as const, icon: Eraser, label: "Hintergrund entfernen" },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  onUpload,
  onDownload,
  onReset,
  hasImages,
  hasActiveImage,
}: ToolbarProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 px-1.5 glass-elevated rounded-2xl">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={onUpload}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Bilder hochladen</TooltipContent>
      </Tooltip>

      <div className="w-6 h-px bg-border my-1" />

      {tools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-xl transition-all ${
                activeTool === tool.id
                  ? "glass-button-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
              disabled={!hasImages}
              onClick={() => onToolChange(tool.id)}
            >
              <tool.icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{tool.label}</TooltipContent>
        </Tooltip>
      ))}

      <div className="w-6 h-px bg-border my-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            disabled={!hasActiveImage}
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zurücksetzen</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            disabled={!hasImages}
            onClick={onDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Alle herunterladen</TooltipContent>
      </Tooltip>
    </div>
  );
}
