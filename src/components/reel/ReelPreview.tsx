import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { TranscriptWord, SubtitleStyle, SpeakerSettings, ColorGradingSettings } from "@/types/editor";
import { Play, Pause, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import SubtitleOverlay from "@/components/editor/SubtitleOverlay";
import { useFaceTracking } from "@/hooks/use-face-tracking";
import { colorGradingToCSS, colorGradingVignetteCSS } from "./ColorGradingPanel";

interface ReelPreviewProps {
  videoUrl: string;
  transcript: TranscriptWord[];
  subtitleStyle: SubtitleStyle;
  speaker: SpeakerSettings;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  silences: { start: number; end: number }[];
  colorGrading?: ColorGradingSettings;
  onTimeUpdate: (t: number) => void;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onDurationChange: (d: number) => void;
  onRemove: () => void;
  totalVideos: number;
  currentIndex: number;
  onNavigate: (direction: -1 | 1) => void;
  fileName: string;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const ReelPreview = ({
  videoUrl, transcript, subtitleStyle, speaker,
  currentTime, duration, isPlaying, silences, colorGrading,
  onTimeUpdate, onPlayPause, onSeek, onDurationChange,
  onRemove, totalVideos, currentIndex, onNavigate, fileName, onVideoRef,
}: ReelPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const facePos = useFaceTracking(videoRef, speaker.centerSpeaker);
  const gradingCSS = useMemo(() => colorGrading ? colorGradingToCSS(colorGrading) : "", [colorGrading]);
  const vignetteStyle = useMemo(() => colorGrading ? colorGradingVignetteCSS(colorGrading) : null, [colorGrading]);

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

  // Skip over silence gaps during playback — simple non-blocking approach
  const lastUpdateRef = useRef(0);
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused && !v.seeking) {
        const t = v.currentTime;

        // Jump past silence gaps instantly
        for (const s of silences) {
          if (t >= s.start && t < s.end - 0.01) {
            v.currentTime = s.end;
            break;
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

  // Auto-skip initial silence: jump to first speech when video loads
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    onVideoRef?.(v);
    const onDur = () => {
      onDurationChange(v.duration);
      // Skip to first speech if there's a leading silence
      if (silences.length > 0 && silences[0].start < 0.1) {
        const skipTo = silences[0].end;
        v.currentTime = skipTo;
        onTimeUpdate(skipTo);
      }
    };
    v.addEventListener("loadedmetadata", onDur);
    return () => {
      v.removeEventListener("loadedmetadata", onDur);
      onVideoRef?.(null);
    };
  }, [onDurationChange, onVideoRef, silences, onTimeUpdate]);

  useEffect(() => {
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.play().catch(() => {});
      if (bg) { bg.currentTime = v.currentTime; bg.play().catch(() => {}); }
    } else {
      v.pause();
      bg?.pause();
    }
  }, [isPlaying]);

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (v) { v.currentTime = t; onSeek(t); }
    if (bg) { bg.currentTime = t; }
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
      className="relative flex items-center justify-center py-2 px-2 sm:py-2 sm:px-3 flex-1 min-w-0 min-h-[70vh] sm:min-h-0 sm:h-full"
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
          className="absolute left-1 sm:left-2 z-30 flex h-8 w-8 items-center justify-center rounded-full glass-elevated text-foreground/70 hover:text-foreground transition-colors"
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
          className="absolute right-1 sm:right-2 z-30 flex h-8 w-8 items-center justify-center rounded-full glass-elevated text-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        className={`relative overflow-hidden rounded-[2rem] bg-foreground ${slideClass}`}
        style={{ aspectRatio: "9/16", height: "100%", maxHeight: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.1)" }}
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
              className="flex h-7 w-7 items-center justify-center rounded-full glass-dark text-white/80 transition hover:bg-destructive/80 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Blurred background video — visible when zoomed out or repositioned */}
        <video
          ref={bgVideoRef}
          src={videoUrl}
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ objectFit: "cover", filter: `blur(20px) brightness(0.5) ${gradingCSS}`, transform: "scale(1.1)" }}
          playsInline
          muted
          aria-hidden
        />

        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: "cover",
            transform: speaker.centerSpeaker ? `scale(${speaker.zoom})` : "scale(1)",
            objectPosition: speaker.centerSpeaker
              ? `${facePos.x}% ${facePos.y}%`
              : "center center",
            transition: "transform 0.5s ease, object-position 0.3s ease-out",
            filter: gradingCSS || undefined,
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
            className="relative mb-2.5 h-1.5 w-full cursor-pointer rounded-full bg-white/15 overflow-hidden backdrop-blur-sm"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * (duration || 1));
            }}
          >
            {duration > 0 && silences.map((s, i) => (
              <div
                key={i}
                className="absolute top-0 h-full bg-destructive/40 rounded-full"
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
              className="flex h-8 w-8 items-center justify-center rounded-full glass-dark text-white transition hover:bg-white/20"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <button onClick={() => seekTo(0)}
              className="flex h-8 w-8 items-center justify-center rounded-full glass-dark text-white transition hover:bg-white/20"
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
