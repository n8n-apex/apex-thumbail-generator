import { useState, useRef, useCallback, useEffect } from "react";
import { CropPreset } from "@/types/image-editor";
import { Check, X } from "lucide-react";

interface CropOverlayProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  preset: CropPreset;
  onConfirm: (offsetX: number, offsetY: number) => void;
  onCancel: () => void;
}

export default function CropOverlay({
  imageUrl,
  originalWidth,
  originalHeight,
  preset,
  onConfirm,
  onCancel,
}: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Calculate display sizes: fit the crop frame into the container
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // The crop frame fits inside container with padding
  const padding = 40;
  const maxFrameW = containerSize.w - padding * 2;
  const maxFrameH = containerSize.h - padding * 2;
  const frameScale = Math.min(maxFrameW / preset.width, maxFrameH / preset.height);
  const frameW = preset.width * frameScale;
  const frameH = preset.height * frameScale;

  // The image must cover the crop frame — scale so it's at least as big as the frame
  const srcRatio = originalWidth / originalHeight;
  const dstRatio = preset.width / preset.height;
  let imgW: number, imgH: number;
  if (srcRatio > dstRatio) {
    // Image is wider than needed → height matches, width overflows
    imgH = frameH;
    imgW = frameH * srcRatio;
  } else {
    // Image is taller than needed → width matches, height overflows
    imgW = frameW;
    imgH = frameW / srcRatio;
  }

  // Clamp offset so image always covers the frame
  const maxOffsetX = Math.max(0, (imgW - frameW) / 2);
  const maxOffsetY = Math.max(0, (imgH - frameH) / 2);

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    }),
    [maxOffsetX, maxOffsetY]
  );

  // Reset offset when preset changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [preset.label]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy));
    },
    [dragging, clamp]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleConfirm = useCallback(() => {
    // Convert display offset back to original image pixel offset
    // offset is in display pixels. The image display size is imgW x imgH mapped to originalWidth x originalHeight
    const scaleToOriginal = originalWidth / imgW;
    // Center of crop in image display coords: center of frame = center of image + offset
    // The crop source top-left in display coords: (imgW/2 - frameW/2) - offset.x
    const srcDisplayX = (imgW - frameW) / 2 - offset.x;
    const srcDisplayY = (imgH - frameH) / 2 - offset.y;
    // Convert to original pixels
    const srcX = srcDisplayX * scaleToOriginal;
    const srcY = srcDisplayY * (originalHeight / imgH);
    onConfirm(srcX, srcY);
  }, [offset, imgW, imgH, frameW, frameH, originalWidth, originalHeight, onConfirm]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
    >
      {/* Crop frame container */}
      <div
        className="relative overflow-hidden border-2 border-primary rounded-lg shadow-2xl"
        style={{ width: frameW, height: frameH, cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt="Crop preview"
          className="absolute select-none pointer-events-none"
          style={{
            width: imgW,
            height: imgH,
            left: (frameW - imgW) / 2 + offset.x,
            top: (frameH - imgH) / 2 + offset.y,
          }}
          draggable={false}
        />

        {/* Rule of thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
        </div>
      </div>

      {/* Preset label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-dark rounded-lg px-3 py-1.5 text-[11px] text-white/80 font-medium">
        {preset.icon} {preset.label} — {preset.width}×{preset.height}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5" />
          Abbrechen
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-button-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          onClick={handleConfirm}
        >
          <Check className="h-3.5 w-3.5" />
          Zuschneiden
        </button>
      </div>

      {/* Drag hint */}
      {(maxOffsetX > 0 || maxOffsetY > 0) && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-medium">
          Bild verschieben zum Positionieren
        </div>
      )}
    </div>
  );
}
