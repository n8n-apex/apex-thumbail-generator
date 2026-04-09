import { ImageFile } from "@/types/image-editor";
import { X, Loader2, Check } from "lucide-react";

interface BatchStripProps {
  images: ImageFile[];
  activeId: string | null;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function BatchStrip({
  images,
  activeId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onRemove,
}: BatchStripProps) {
  if (images.length === 0) return null;

  return (
    <div className="glass-elevated rounded-2xl p-2 flex gap-2 overflow-x-auto">
      {images.map((img) => {
        const isActive = img.id === activeId;
        const isSelected = selectedIds.includes(img.id);
        const displayUrl = img.editedUrl ?? img.url;

        return (
          <div
            key={img.id}
            className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden cursor-pointer group transition-all border-2 ${
              isActive
                ? "border-primary shadow-lg shadow-primary/20"
                : isSelected
                ? "border-primary/50"
                : "border-transparent hover:border-border"
            }`}
            onClick={() => onSelect(img.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onToggleSelect(img.id);
            }}
          >
            <img
              src={displayUrl}
              alt={img.name}
              className="w-full h-full object-cover"
              draggable={false}
            />

            {img.isProcessing && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}

            {img.editedUrl && !img.isProcessing && (
              <div className="absolute top-0.5 left-0.5">
                <Check className="h-3.5 w-3.5 text-green-400 drop-shadow" />
              </div>
            )}

            {isSelected && (
              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                <Check className="h-2 w-2 text-primary-foreground" />
              </div>
            )}

            <button
              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive rounded-full p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
            >
              <X className="h-2.5 w-2.5 text-destructive-foreground" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
              <p className="text-[8px] text-white truncate">{img.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
