import { useCallback, useState } from "react";
import { Upload, Zap, Plus } from "lucide-react";

interface UploadScreenProps {
  onFilesSelect: (files: File[]) => void;
  compact?: boolean;
}

const UploadScreen = ({ onFilesSelect, compact }: UploadScreenProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const extractVideoFiles = (fileList: FileList) =>
    Array.from(fileList).filter(
      (f) => f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|webm|avi)$/i)
    );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = extractVideoFiles(e.dataTransfer.files);
    if (files.length > 0) onFilesSelect(files);
  }, [onFilesSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = extractVideoFiles(e.target.files);
      if (files.length > 0) onFilesSelect(files);
    }
  }, [onFilesSelect]);

  if (compact) {
    return (
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300 h-full ${
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/60 hover:border-primary/40 glass"
        }`}
      >
        <input type="file" accept="video/*,.mp4,.mov,.webm,.avi" multiple onChange={handleInputChange} className="hidden" />
        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">Add more</p>
      </label>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center mesh-gradient overflow-hidden">
      <div className="w-full max-w-md text-center px-6">
        <div className="mb-3">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[10px] font-bold tracking-wider text-primary uppercase">
            <Zap className="h-3 w-3" />
            Auto-Untertitel & Pausen-Schnitt
          </div>
          <h1 className="mb-1.5 text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-none">
            apex<span className="text-primary">Clip</span>.ai
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Videos ablegen — automatische Untertitel, Speaker-Zentrierung & Pausen-Entfernung.
          </p>
        </div>

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 transition-all duration-300 ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
              : "border-border/80 hover:border-primary/40 glass"
          }`}
        >
          <input type="file" accept="video/*,.mp4,.mov,.webm,.avi" multiple onChange={handleInputChange} className="hidden" />
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            isDragOver ? "bg-primary/15 text-primary scale-110" : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
          }`}>
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {isDragOver ? "Loslassen!" : "Videos hier ablegen"}
          </p>
          <p className="text-[11px] text-muted-foreground">MP4, MOV, WebM — mehrere Dateien möglich</p>
        </label>

        <div className="mt-4 flex justify-center gap-5 text-[10px] text-muted-foreground">
          <span>✦ Auto Subtitles</span>
          <span>✦ Silence Cut</span>
          <span>✦ Speaker Centering</span>
        </div>

        <div className="mt-4">
          <a
            href="https://apex-consulting.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
          >
            Powered by <span className="font-semibold text-muted-foreground/80">APEX AI Tech</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;
