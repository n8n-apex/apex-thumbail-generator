import { useRef, useEffect, useCallback } from "react";
import { TranscriptWord, SubtitleStyle, SpeakerSettings } from "@/types/editor";
import { Play, Pause, RotateCcw } from "lucide-react";
import SubtitleOverlay from "@/components/editor/SubtitleOverlay";

interface ReelPreviewProps {
  videoUrl: string;
  transcript: TranscriptWord[];
  subtitleStyle: SubtitleStyle;
  speaker: SpeakerSettings;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (t: number) => void;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onDurationChange: (d: number) => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const ReelPreview = ({
  videoUrl, transcript, subtitleStyle, speaker,
  currentTime, duration, isPlaying,
  onTimeUpdate, onPlayPause, onSeek, onDurationChange,
}: ReelPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTU = () => onTimeUpdate(v.currentTime);
    const onDur = () => onDurationChange(v.duration);
    v.addEventListener("timeupdate", onTU);
    v.addEventListener("loadedmetadata", onDur);
    return () => { v.removeEventListener("timeupdate", onTU); v.removeEventListener("loadedmetadata", onDur); };
  }, [onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying]);

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current;
    if (v) { v.currentTime = t; onSeek(t); }
  }, [onSeek]);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div
        className="relative w-[340px] overflow-hidden rounded-[2rem] bg-black"
        style={{ aspectRatio: "9/16", boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
      >
        {/* Video with speaker centering */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 h-full w-full transition-transform duration-500"
          style={{
            objectFit: "cover",
            transform: speaker.centerSpeaker ? `scale(${speaker.zoom})` : "scale(1)",
            objectPosition: speaker.centerSpeaker ? "center 30%" : "center center",
          }}
          playsInline
          muted
        />

        {/* Subtitle overlay */}
        <SubtitleOverlay transcript={transcript} currentTime={currentTime} style={subtitleStyle} />

        {/* Bottom controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar */}
          <div
            className="mb-3 h-1 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seekTo(ratio * (duration || 1));
            }}
          >
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onPlayPause}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/30"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button onClick={() => seekTo(0)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <span className="ml-auto text-[11px] tabular-nums text-white/70 font-medium">
              {fmt(currentTime)} / {fmt(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelPreview;
