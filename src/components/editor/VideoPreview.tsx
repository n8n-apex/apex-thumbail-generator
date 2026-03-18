import { useRef, useEffect, useCallback } from "react";
import { TranscriptWord, SubtitleStyle } from "@/types/editor";
import { Play, Pause, SkipBack, Camera } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string | null;
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  transcript: TranscriptWord[];
  subtitleStyle: SubtitleStyle;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onCaptureThumbnail: () => void;
  onDurationChange: (duration: number) => void;
}

const formatTimestamp = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const VideoPreview = ({
  videoUrl,
  currentTime,
  isPlaying,
  duration,
  transcript,
  subtitleStyle,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  onCaptureThumbnail,
  onDurationChange,
}: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate(video.currentTime);
    const handleDuration = () => onDurationChange(video.duration);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleDuration);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleDuration);
    };
  }, [onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.play().catch(() => {});
    else video.pause();
  }, [isPlaying]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = time;
        onSeek(time);
      }
    },
    [onSeek]
  );

  // Current subtitle word
  const currentWords = transcript.filter(
    (w) => currentTime >= w.start && currentTime < w.end + 0.3
  );
  const currentSubtitle = currentWords.map((w) => w.text).join(" ");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background p-6">
      {/* Video Container - 9:16 aspect */}
      <div className="relative w-full max-w-[320px]">
        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            aspectRatio: "9/16",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-editor-surface">
              <div className="text-center">
                <div className="mb-2 text-4xl">🎬</div>
                <p className="text-xs text-muted-foreground">Preview</p>
              </div>
            </div>
          )}

          {/* Subtitle Overlay */}
          {currentSubtitle && (
            <div
              className={`absolute left-4 right-4 flex justify-center ${
                subtitleStyle.position === "top"
                  ? "top-12"
                  : subtitleStyle.position === "center"
                  ? "top-1/2 -translate-y-1/2"
                  : "bottom-16"
              }`}
            >
              <span
                className="inline-block rounded px-3 py-1.5 text-center leading-tight"
                style={{
                  fontSize: `${subtitleStyle.fontSize / 3}px`,
                  fontWeight: subtitleStyle.fontWeight,
                  color: subtitleStyle.color,
                  backgroundColor: subtitleStyle.backgroundColor,
                  textTransform: subtitleStyle.textTransform,
                  textWrap: "balance",
                }}
              >
                {currentSubtitle}
              </span>
            </div>
          )}
        </div>

        {/* Controls under video */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => seekTo(0)}
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <span className="ml-2 text-xs tabular-nums text-muted-foreground">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration || 0)}
          </span>
          <button
            onClick={onCaptureThumbnail}
            className="ml-auto flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Camera className="h-3 w-3" />
            Capture
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
