import { useRef, useCallback } from "react";
import { ImageFile, CropPreset } from "@/types/image-editor";
import { Loader2, ImageIcon, Download, RotateCcw, ZoomIn, ZoomOut, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CropOverlay from "./CropOverlay";

interface CanvasProps {
  image: ImageFile | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onDownload?: () => void;
  onReset?: () => void;
  cropPreset: CropPreset | null;
  onCropConfirm?: (offsetX: number, offsetY: number) => void;
  onCropCancel?: () => void;
}

export default function Canvas({ image, zoom, onZoomChange, onDownload, onReset, cropPreset, onCropConfirm, onCropCancel }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(zoom + delta);
    },
    [zoom, onZoomChange]
  );

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Lade Bilder hoch um loszulegen</p>
          <p className="text-xs mt-1 opacity-60">Drag & Drop oder klicke auf das Upload-Icon</p>
        </div>
      </div>
    );
  }

  const displayUrl = image.editedUrl ?? image.url;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[hsl(220_10%_12%)] rounded-2xl flex items-center justify-center"
      onWheel={handleWheel}
    >
      {/* Checkerboard pattern for transparency */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
        }}
      />

      <img
        src={displayUrl}
        alt={image.name}
        className="relative max-w-full max-h-full object-contain transition-transform duration-100"
        style={{ transform: `scale(${zoom})` }}
        draggable={false}
      />

      {image.isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-md rounded-2xl overflow-hidden">
          {/* Animated gradient background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "conic-gradient(from var(--ai-angle, 0deg), hsl(var(--primary)), hsl(var(--primary) / 0.2), hsl(195 100% 70%), hsl(var(--primary) / 0.2), hsl(var(--primary)))",
              animation: "ai-rotate 3s linear infinite",
            }}
          />
          {/* Scanning line */}
          <div
            className="absolute left-0 right-0 h-px opacity-60"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
              animation: "ai-scan 2s ease-in-out infinite",
            }}
          />
          {/* Pulsing rings */}
          <div className="absolute w-40 h-40 rounded-full border border-primary/20" style={{ animation: "ai-ring 2s ease-out infinite" }} />
          <div className="absolute w-40 h-40 rounded-full border border-primary/20" style={{ animation: "ai-ring 2s ease-out infinite 0.6s" }} />
          <div className="absolute w-40 h-40 rounded-full border border-primary/20" style={{ animation: "ai-ring 2s ease-out infinite 1.2s" }} />

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-4 z-10">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl glass-button-primary flex items-center justify-center shadow-2xl"
                style={{
                  boxShadow: "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)",
                  animation: "ai-breathe 2s ease-in-out infinite",
                }}
              >
                <Wand2 className="h-8 w-8 text-primary-foreground" style={{ animation: "ai-wand 3s ease-in-out infinite" }} />
              </div>
              {/* Orbiting dots */}
              <div className="absolute inset-[-16px]" style={{ animation: "ai-orbit 4s linear infinite" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
              </div>
              <div className="absolute inset-[-16px]" style={{ animation: "ai-orbit 4s linear infinite reverse", animationDelay: "1s" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/60" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-bold text-foreground tracking-wide">
                APEX AI verarbeitet
              </span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: "ai-dots 1.4s ease-in-out infinite" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: "ai-dots 1.4s ease-in-out infinite 0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: "ai-dots 1.4s ease-in-out infinite 0.4s" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-left: image info */}
      <div className="absolute top-3 left-3 glass-dark rounded-lg px-3 py-1.5 text-[11px] text-white/80 font-medium">
        {image.name}
        {image.hasBgRemoved && (
          <span className="ml-2 text-green-400">● PNG</span>
        )}
      </div>

      {/* Bottom bar: size info + zoom + actions */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="glass-dark rounded-lg px-3 py-1.5 text-[11px] text-white/80 font-medium tabular-nums">
          {image.width} × {image.height}
        </div>

        <div className="flex items-center gap-1">
          <div className="glass-dark rounded-lg flex items-center">
            <button
              className="px-2 py-1.5 text-white/70 hover:text-white transition-colors"
              onClick={() => onZoomChange(zoom - 0.25)}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-white/80 font-medium tabular-nums px-1 min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="px-2 py-1.5 text-white/70 hover:text-white transition-colors"
              onClick={() => onZoomChange(zoom + 0.25)}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {image.editedUrl && onReset && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="glass-dark rounded-lg px-2 py-1.5 text-white/70 hover:text-white transition-colors"
                  onClick={onReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zurücksetzen</TooltipContent>
            </Tooltip>
          )}

          {onDownload && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="glass-dark rounded-lg px-2 py-1.5 text-white/70 hover:text-white transition-colors"
                  onClick={onDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Herunterladen</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Crop overlay */}
      {cropPreset && onCropConfirm && onCropCancel && (
        <CropOverlay
          imageUrl={image.url}
          originalWidth={image.originalWidth}
          originalHeight={image.originalHeight}
          preset={cropPreset}
          onConfirm={onCropConfirm}
          onCancel={onCropCancel}
        />
      )}
    </div>
  );
}
