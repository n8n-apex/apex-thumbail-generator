import { useCallback, useRef } from "react";
import { Upload, ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
}

export default function UploadZone({ onFiles }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onFiles(files);
    },
    [onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFiles(Array.from(e.target.files));
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFiles]
  );

  return (
    <div
      className="flex-1 flex items-center justify-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div
        className="glass-elevated rounded-3xl p-12 text-center cursor-pointer hover:scale-[1.02] transition-transform max-w-lg mx-auto"
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl glass-button-primary flex items-center justify-center">
          <ImageIcon className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Bilder hochladen
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Drag & Drop deine Bilder hier oder klicke zum Auswählen.
          JPG, PNG, WebP und mehr werden unterstützt.
        </p>
        <div className="inline-flex items-center gap-2 glass-button-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold">
          <Upload className="h-4 w-4" />
          Dateien auswählen
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
