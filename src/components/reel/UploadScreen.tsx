import { useCallback, useState } from "react";
import { Upload, Zap } from "lucide-react";

interface UploadScreenProps {
  onFileSelect: (file: File) => void;
}

const UploadScreen = ({ onFileSelect }: UploadScreenProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|webm|avi)$/i))) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient p-6">
      <div className="w-full max-w-lg text-center">
        <div className="mb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-[11px] font-bold tracking-wider text-primary uppercase">
            <Zap className="h-3.5 w-3.5" />
            Auto Subtitles
          </div>
          <h1 className="mb-3 text-5xl font-black tracking-tight text-foreground leading-none">
            Reel<span className="text-primary">.</span>ai
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Drop your video — get modern subtitles & speaker centering, automatically.
          </p>
        </div>

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-20 transition-all duration-300 ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
              : "border-border/80 hover:border-primary/40 glass"
          }`}
        >
          <input type="file" accept="video/*,.mp4,.mov,.webm,.avi" onChange={handleInputChange} className="hidden" />
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
            isDragOver ? "bg-primary/15 text-primary scale-110" : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
          }`}>
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {isDragOver ? "Drop it!" : "Drop your raw reel"}
          </p>
          <p className="text-xs text-muted-foreground">MP4, MOV, WebM</p>
        </label>

        <div className="mt-8 flex justify-center gap-6 text-[11px] text-muted-foreground">
          <span>✦ Auto Subtitles</span>
          <span>✦ Speaker Centering</span>
          <span>✦ Modern Fonts</span>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;
