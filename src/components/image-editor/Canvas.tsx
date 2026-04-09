import { useRef, useCallback } from "react";
import { ImageFile } from "@/types/image-editor";
import { Loader2, ImageIcon } from "lucide-react";

interface CanvasProps {
  image: ImageFile | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function Canvas({ image, zoom, onZoomChange }: CanvasProps) {
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              APEX AI verarbeitet...
            </span>
          </div>
        </div>
      )}

      {/* Image info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="glass-dark rounded-lg px-3 py-1.5 text-[11px] text-white/80 font-medium">
          {image.name}
        </div>
        <div className="glass-dark rounded-lg px-3 py-1.5 text-[11px] text-white/80 font-medium tabular-nums">
          {image.width} × {image.height} · {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
