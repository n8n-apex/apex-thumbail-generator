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

/** Sample average luminance from bottom 30% of video frame */
function sampleLuminance(video: HTMLVideoElement): number {
  try {
    const canvas = document.createElement("canvas");
    const w = 64, h = 36;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || video.videoWidth === 0) return 0.5;
    ctx.drawImage(video, 0, 0, w, h);
    const bottomY = Math.floor(h * 0.7);
    const data = ctx.getImageData(0, bottomY, w, h - bottomY).data;
    let sum = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    }
    return sum / pixels;
  } catch {
    return 0.5;
  }
}

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

  // Adaptive color based on video luminance
  const [isDarkBg, setIsDarkBg] = useState(true);
  const lumCheckRef = useRef(0);

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

  // Stable refs for the playback loop to avoid re-creating it
  const silencesRef = useRef(silences);
  silencesRef.current = silences;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  // Smooth playback loop — no dependency churn, uses refs
  useEffect(() => {
    let lastReport = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused && !v.seeking) {
        const t = v.currentTime;

        // Jump past silence gaps
        for (const s of silencesRef.current) {
          if (t >= s.start && t < s.end - 0.01) {
            v.currentTime = s.end;
            break;
          }
        }

        // Throttle state updates to ~15fps
        const now = performance.now();
        if (now - lastReport > 66) {
          lastReport = now;
          onTimeUpdateRef.current(v.currentTime);

          // Sample luminance every ~500ms for adaptive controls
          if (now - lumCheckRef.current > 500) {
            lumCheckRef.current = now;
            const lum = sampleLuminance(v);
            setIsDarkBg(lum < 0.45);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Auto-skip initial silence
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    onVideoRef?.(v);
    const onDur = () => {
      onDurationChange(v.duration);
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

  // Adaptive color classes
  const ctrlText = isDarkBg ? "text-white" : "text-black";
  const ctrlTextMuted = isDarkBg ? "text-white/70" : "text-black/60";
  const ctrlTextFaint = isDarkBg ? "text-white/50" : "text-black/40";
  const ctrlBg = isDarkBg ? "glass-dark" : "bg-white/60 backdrop-blur-md";
  const ctrlHover = isDarkBg ? "hover:bg-white/20" : "hover:bg-black/10";
  const progressBg = isDarkBg ? "bg-white/15" : "bg-black/15";
  const progressFill = isDarkBg ? "bg-white" : "bg-black";
  const dotActive = isDarkBg ? "bg-white" : "bg-black";
  const dotInactive = isDarkBg ? "bg-white/40" : "bg-black/30";

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-2 px-2 sm:py-2 sm:px-3 flex-1 min-w-0 min-h-[70vh] sm:min-h-0 sm:h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation arrows */}
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
          {totalVideos > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalVideos }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex ? `w-5 ${dotActive}` : `w-1.5 ${dotInactive}`
                  }`}
                />
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-1.5">
            <button onClick={onRemove} title="Video entfernen"
              className={`flex h-7 w-7 items-center justify-center rounded-full ${ctrlBg} ${ctrlTextMuted} transition hover:bg-destructive/80 hover:text-white`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Blurred background video */}
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

        {vignetteStyle && <div style={vignetteStyle} />}

        <SubtitleOverlay
          transcript={transcript}
          currentTime={currentTime}
          style={subtitleStyle}
          silences={silences}
          onPositionChange={(x, y) => {
            const event = new CustomEvent("subtitle-position", { detail: { x, y } });
            window.dispatchEvent(event);
          }}
        />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className={`text-[9px] ${ctrlTextFaint} truncate mb-1.5 font-medium`}>{fileName}</p>

          <div
            className={`relative mb-2.5 h-1.5 w-full cursor-pointer rounded-full ${progressBg} overflow-hidden backdrop-blur-sm`}
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
            <div className={`absolute top-0 h-full rounded-full ${progressFill} transition-all`} style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onPlayPause}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${ctrlBg} ${ctrlText} transition ${ctrlHover}`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <button onClick={() => seekTo(0)}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${ctrlBg} ${ctrlText} transition ${ctrlHover}`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <span className={`ml-auto text-[10px] tabular-nums ${ctrlTextMuted} font-medium`}>
              {fmt(currentTime)} / {fmt(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelPreview;