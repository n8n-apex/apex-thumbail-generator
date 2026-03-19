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
    <div className="flex h-full w-full items-center justify-center mesh-gradient">
      <div className="w-full max-w-md text-center px-6">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[10px] font-bold tracking-wider text-primary uppercase">
            <Zap className="h-3 w-3" />
            Auto Subtitles & Silence Cut
          </div>
          <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground leading-none">
            Reel<span className="text-primary">.</span>ai
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Drop your video — get modern subtitles, speaker centering & automatic silence removal.
          </p>
        </div>

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-14 transition-all duration-300 ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
              : "border-border/80 hover:border-primary/40 glass"
          }`}
        >
          <input type="file" accept="video/*,.mp4,.mov,.webm,.avi" onChange={handleInputChange} className="hidden" />
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
            isDragOver ? "bg-primary/15 text-primary scale-110" : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
          }`}>
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {isDragOver ? "Drop it!" : "Drop your raw reel"}
          </p>
          <p className="text-[11px] text-muted-foreground">MP4, MOV, WebM</p>
        </label>

        <div className="mt-6 flex justify-center gap-5 text-[10px] text-muted-foreground">
          <span>✦ Auto Subtitles</span>
          <span>✦ Silence Cut</span>
          <span>✦ Speaker Centering</span>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;
