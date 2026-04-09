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
  horizontal?: boolean;
}

const tools = [
  { id: "select" as const, icon: MousePointer2, label: "Auswählen", color: "" },
  { id: "crop" as const, icon: Crop, label: "Zuschneiden", color: "" },
  { id: "ai-edit" as const, icon: Wand2, label: "AI Werkzeuge", color: "" },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  onUpload,
  onDownload,
  onReset,
  hasImages,
  hasActiveImage,
  horizontal = false,
}: ToolbarProps) {
  const containerClass = horizontal
    ? "flex items-center gap-1"
    : "flex flex-col items-center gap-1 py-3 px-1.5 glass-elevated rounded-2xl relative z-20";

  const separatorClass = horizontal
    ? "w-px h-6 bg-border/50 mx-0.5"
    : "w-6 h-px bg-border/50 my-1";

  return (
    <div className={containerClass}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            onClick={onUpload}
          >
            <Upload className="h-[18px] w-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={horizontal ? "bottom" : "right"}>Bilder hochladen</TooltipContent>
      </Tooltip>

      <div className={separatorClass} />

      {tools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-10 w-10 rounded-xl shrink-0 transition-all ${
                activeTool === tool.id
                  ? "glass-button-primary text-primary-foreground shadow-lg"
                  : "hover:bg-accent"
              }`}
              disabled={!hasImages}
              onClick={() => onToolChange(tool.id)}
            >
              <tool.icon className="h-[18px] w-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={horizontal ? "bottom" : "right"}>{tool.label}</TooltipContent>
        </Tooltip>
      ))}

      <div className={separatorClass} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            disabled={!hasActiveImage}
            onClick={onReset}
          >
            <RotateCcw className="h-[18px] w-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={horizontal ? "bottom" : "right"}>Zurücksetzen</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            disabled={!hasImages}
            onClick={onDownload}
          >
            <Download className="h-[18px] w-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={horizontal ? "bottom" : "right"}>Alle herunterladen</TooltipContent>
      </Tooltip>
    </div>
  );
}
