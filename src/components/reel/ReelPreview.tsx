import { useRef, useEffect, useCallback } from "react";
import { TranscriptWord, SubtitleStyle, SpeakerSettings } from "@/types/editor";
import { Play, Pause, RotateCcw, X, RefreshCw } from "lucide-react";
import SubtitleOverlay from "@/components/editor/SubtitleOverlay";

interface ReelPreviewProps {
  videoUrl: string;
  transcript: TranscriptWord[];
  subtitleStyle: SubtitleStyle;
  speaker: SpeakerSettings;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  silences: { start: number; end: number }[];
  onTimeUpdate: (t: number) => void;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onDurationChange: (d: number) => void;
  onReset: () => void;
  onSwapVideo: () => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const ReelPreview = ({
  videoUrl, transcript, subtitleStyle, speaker,
  currentTime, duration, isPlaying, silences,
  onTimeUpdate, onPlayPause, onSeek, onDurationChange,
  onReset, onSwapVideo,
}: ReelPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  // Skip over silence gaps during playback
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused) {
        const t = v.currentTime;
        // Check if current time is inside a silence gap — if so, skip to end
        for (const s of silences) {
          if (t >= s.start && t < s.end) {
            v.currentTime = s.end;
            break;
          }
        }
        onTimeUpdate(v.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onTimeUpdate, silences]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onDur = () => onDurationChange(v.duration);
    v.addEventListener("loadedmetadata", onDur);
    return () => v.removeEventListener("loadedmetadata", onDur);
  }, [onDurationChange]);

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
    <div className="flex h-full items-center justify-center py-4 px-6 flex-shrink-0">
      <div
        className="relative overflow-hidden rounded-[1.5rem] bg-black h-full"
        style={{ aspectRatio: "9/16", maxHeight: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        {/* Top action buttons */}
        <div className="absolute top-2.5 right-2.5 z-20 flex gap-1.5">
          <button onClick={onSwapVideo} title="Anderes Video"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 transition hover:bg-black/60 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button onClick={onReset} title="Video entfernen"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 transition hover:bg-red-500/80 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

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
        />

        <SubtitleOverlay transcript={transcript} currentTime={currentTime} style={subtitleStyle} />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div
            className="relative mb-2.5 h-1 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * (duration || 1));
            }}
          >
            {duration > 0 && silences.map((s, i) => (
              <div
                key={i}
                className="absolute top-0 h-full bg-red-500/50 rounded-full"
                style={{
                  left: `${(s.start / duration) * 100}%`,
                  width: `${((s.end - s.start) / duration) * 100}%`,
                }}
              />
            ))}
            <div className="absolute top-0 h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onPlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/30"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <button onClick={() => seekTo(0)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition hover:bg-white/30"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <span className="ml-auto text-[10px] tabular-nums text-white/70 font-medium">
              {fmt(currentTime)} / {fmt(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelPreview;
