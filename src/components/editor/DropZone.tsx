import { useCallback, useState } from "react";
import { Upload, Film, Zap } from "lucide-react";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

const DropZone = ({ onFileSelect }: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|webm|avi)$/i))) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" />
            AI-POWERED
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
            Reel Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload → Auto-Cut → Subtitles → Thumbnail → Export
          </p>
        </div>

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-all duration-300 ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/30 glass"
          }`}
        >
          <input
            type="file"
            accept="video/*,.mp4,.mov,.webm,.avi"
            onChange={handleInputChange}
            className="hidden"
          />
          <div
            className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
              isDragOver
                ? "bg-primary/15 text-primary scale-110"
                : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
            }`}
          >
            {isDragOver ? <Film className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
          </div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            {isDragOver ? "Drop to upload" : "Drop your raw footage here"}
          </p>
          <p className="text-xs text-muted-foreground">MP4, MOV, WebM • Max 4K</p>
        </label>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Silence Detection", desc: "AI-powered pause removal" },
            { label: "Auto Subtitles", desc: "Whisper transcription" },
            { label: "Thumbnail Gen", desc: "Frame capture & export" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-xl p-4">
              <p className="text-xs font-semibold text-foreground">{f.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DropZone;
