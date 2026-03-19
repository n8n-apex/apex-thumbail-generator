import { useRef, useEffect, useCallback, useState } from "react";
import { TranscriptWord, SubtitleStyle, SpeakerSettings } from "@/types/editor";
import { Play, Pause, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import SubtitleOverlay from "@/components/editor/SubtitleOverlay";
import { useFaceTracking } from "@/hooks/use-face-tracking";

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
  onRemove: () => void;
  // Multi-video navigation
  totalVideos: number;
  currentIndex: number;
  onNavigate: (direction: -1 | 1) => void;
  fileName: string;
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
  onRemove, totalVideos, currentIndex, onNavigate, fileName,
}: ReelPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch swipe support
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaX.current) > 60) {
      if (touchDeltaX.current > 0 && currentIndex > 0) {
        setSlideDirection("right");
        setTimeout(() => { onNavigate(-1); setSlideDirection(null); }, 250);
      } else if (touchDeltaX.current < 0 && currentIndex < totalVideos - 1) {
        setSlideDirection("left");
        setTimeout(() => { onNavigate(1); setSlideDirection(null); }, 250);
      }
    }
    touchDeltaX.current = 0;
  }, [currentIndex, totalVideos, onNavigate]);

  // Skip over silence gaps during playback — throttle state updates
  const lastUpdateRef = useRef(0);
  const skippingRef = useRef(false);
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused) {
        const t = v.currentTime;

        // Check if we're inside a silence gap
        if (!skippingRef.current) {
          for (const s of silences) {
            if (t >= s.start && t < s.end) {
              skippingRef.current = true;
              v.currentTime = s.end;
              // Resume playback after seek completes
              const onSeeked = () => {
                skippingRef.current = false;
                v.removeEventListener("seeked", onSeeked);
                v.play().catch(() => {});
              };
              v.addEventListener("seeked", onSeeked);
              break;
            }
          }
        }

        // Throttle state updates to ~15fps to avoid render storm
        const now = performance.now();
        if (now - lastUpdateRef.current > 66) {
          lastUpdateRef.current = now;
          onTimeUpdate(v.currentTime);
        }
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

  const slideClass = slideDirection === "left"
    ? "animate-slide-out-left"
    : slideDirection === "right"
    ? "animate-slide-out-right"
    : "animate-fade-in";

  return (
    <div
      ref={containerRef}
      className="relative flex h-full items-center justify-center py-1 px-1 sm:py-2 sm:px-3 flex-shrink-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation arrows — desktop only */}
      {totalVideos > 1 && currentIndex > 0 && (
        <button
          onClick={() => {
            setSlideDirection("right");
            setTimeout(() => { onNavigate(-1); setSlideDirection(null); }, 250);
          }}
          className="absolute left-1 sm:left-2 z-30 flex h-8 w-8 items-center justify-center rounded-full glass text-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {totalVideos > 1 && currentIndex < totalVideos - 1 && (
        <button
          onClick={() => {
            setSlideDirection("left");
            setTimeout(() => { onNavigate(1); setSlideDirection(null); }, 250);
          }}
          className="absolute right-1 sm:right-2 z-30 flex h-8 w-8 items-center justify-center rounded-full glass text-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        className={`relative overflow-hidden rounded-[1.5rem] bg-background h-full ${slideClass}`}
        style={{ aspectRatio: "9/16", maxHeight: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2.5">
          {/* Video counter */}
          {totalVideos > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalVideos }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-1.5">
            <button onClick={onRemove} title="Video entfernen"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 transition hover:bg-red-500/80 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
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

        <SubtitleOverlay
          transcript={transcript}
          currentTime={currentTime}
          style={subtitleStyle}
          silences={silences}
          onPositionChange={(x, y) => {
            // Bubble up position change — handled via onTimeUpdate parent pattern
            const event = new CustomEvent("subtitle-position", { detail: { x, y } });
            window.dispatchEvent(event);
          }}
        />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* File name */}
          <p className="text-[9px] text-white/50 truncate mb-1.5 font-medium">{fileName}</p>

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
