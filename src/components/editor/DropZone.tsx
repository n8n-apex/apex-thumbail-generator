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
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl">
        {/* Logo / Title */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            AI-POWERED
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Reel Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload → Auto-Cut → Subtitles → Thumbnail → Export
          </p>
        </div>

        {/* Drop Area */}
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-all duration-200 ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted hover:border-muted-foreground/30 hover:bg-editor-surface"
          }`}
        >
          <input
            type="file"
            accept="video/*,.mp4,.mov,.webm,.avi"
            onChange={handleInputChange}
            className="hidden"
          />
          <div
            className={`mb-6 flex h-16 w-16 items-center justify-center rounded-lg transition-colors ${
              isDragOver ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
            }`}
          >
            {isDragOver ? (
              <Film className="h-8 w-8" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>
          <p className="mb-2 text-sm font-medium text-foreground">
            {isDragOver ? "Drop to upload" : "Drop your raw footage here"}
          </p>
          <p className="text-xs text-muted-foreground">
            MP4, MOV, WebM • Max 4K
          </p>
        </label>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Silence Detection", desc: "AI-powered pause removal" },
            { label: "Auto Subtitles", desc: "Whisper transcription" },
            { label: "Thumbnail Gen", desc: "Frame capture & export" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-editor-surface p-4">
              <p className="text-xs font-medium text-foreground">{f.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DropZone;
