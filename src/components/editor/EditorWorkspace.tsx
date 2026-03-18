import { TranscriptWord, SilenceGap, SubtitleStyle } from "@/types/editor";
import TranscriptPanel from "./TranscriptPanel";
import VideoPreview from "./VideoPreview";
import StyleControls from "./StyleControls";
import Timeline from "./Timeline";

interface EditorWorkspaceProps {
  videoUrl: string | null;
  videoFile: File | null;
  transcript: TranscriptWord[];
  silences: SilenceGap[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  removeSilences: boolean;
  subtitleStyle: SubtitleStyle;
  thumbnailUrl: string | null;
  amplitudes: number[];
  isExporting: boolean;
  exportProgress: string;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onCaptureThumbnail: () => void;
  onDurationChange: (d: number) => void;
  onStyleChange: (s: SubtitleStyle) => void;
  onToggleSilences: (v: boolean) => void;
  onExport: () => void;
}

const EditorWorkspace = (props: EditorWorkspaceProps) => {
  return (
    <div className="flex h-screen flex-col mesh-gradient">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-2.5 glass">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">Reel Editor</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
            {props.transcript.length} words • {props.silences.length} pauses
          </span>
          {props.isExporting && (
            <span className="text-[10px] text-primary font-semibold animate-pulse">{props.exportProgress}</span>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex min-h-0 flex-1">
        <TranscriptPanel
          transcript={props.transcript}
          silences={props.silences}
          currentTime={props.currentTime}
          onWordClick={props.onSeek}
        />
        <VideoPreview
          videoUrl={props.videoUrl}
          currentTime={props.currentTime}
          isPlaying={props.isPlaying}
          duration={props.duration}
          transcript={props.transcript}
          subtitleStyle={props.subtitleStyle}
          onTimeUpdate={props.onTimeUpdate}
          onPlayPause={props.onPlayPause}
          onSeek={props.onSeek}
          onCaptureThumbnail={props.onCaptureThumbnail}
          onDurationChange={props.onDurationChange}
        />
        <StyleControls
          style={props.subtitleStyle}
          onChange={props.onStyleChange}
          removeSilences={props.removeSilences}
          onToggleSilences={props.onToggleSilences}
          thumbnailUrl={props.thumbnailUrl}
          onExport={props.onExport}
          isExporting={props.isExporting}
          exportProgress={props.exportProgress}
        />
      </div>

      {/* Timeline */}
      <Timeline
        duration={props.duration || 18}
        currentTime={props.currentTime}
        silences={props.silences}
        removeSilences={props.removeSilences}
        amplitudes={props.amplitudes}
        onSeek={props.onSeek}
      />
    </div>
  );
};

export default EditorWorkspace;
