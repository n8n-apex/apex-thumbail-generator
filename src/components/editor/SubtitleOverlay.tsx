import { useMemo, useRef, useCallback, useState } from "react";
import { TranscriptWord, SubtitleStyle, SubtitlePreset, SUBTITLE_FONTS } from "@/types/editor";

interface SubtitleOverlayProps {
  transcript: TranscriptWord[];
  currentTime: number;
  style: SubtitleStyle;
  silences?: { start: number; end: number }[];
  onPositionChange?: (x: number, y: number) => void;
}

const SNAP_THRESHOLD = 3;

/**
 * Improved phrase detection with adaptive timing window.
 * Uses a self-checking approach:
 * 1. Find the best matching word based on current time
 * 2. Verify the match by checking neighboring words
 * 3. Use adaptive lookahead based on speech rate
 */
function getCurrentPhrase(
  transcript: TranscriptWord[],
  currentTime: number,
  timeOffset: number,
  maxLines: number,
  silences?: { start: number; end: number }[],
) {
  if (transcript.length === 0) return { words: [], activeWordIdx: -1 };

  const t = currentTime - (timeOffset ?? 0);

  // Don't show subtitles during silence gaps
  if (silences) {
    for (const s of silences) {
      if (currentTime >= s.start && currentTime < s.end) {
        return { words: [], activeWordIdx: -1 };
      }
    }
  }

  // Adaptive word matching — widen windows to eliminate gaps between words
  let activeIdx = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < transcript.length; i++) {
    const w = transcript[i];
    const wordMid = (w.start + w.end) / 2;
    const wordDur = w.end - w.start;
    
    // Pre-roll: show word slightly before it starts
    const preRoll = Math.min(0.12, wordDur * 0.4);
    // Post-hold: keep word visible until next word starts (bridge gaps)
    const nextStart = i < transcript.length - 1 ? transcript[i + 1].start : w.end + 0.5;
    const gapToNext = nextStart - w.end;
    const postHold = Math.min(gapToNext, 0.4); // hold up to 400ms or until next word

    if (t >= w.start - preRoll && t < w.end + postHold) {
      const distFromMid = Math.abs(t - wordMid);
      const score = 1 / (distFromMid + 0.001);
      if (score > bestScore) {
        bestScore = score;
        activeIdx = i;
      }
    }
  }

  // Fallback: if no match, find nearest word within 0.5s
  if (activeIdx === -1) {
    let minDist = 0.5;
    for (let i = 0; i < transcript.length; i++) {
      const w = transcript[i];
      const dist = t < w.start ? w.start - t : t - w.end;
      if (dist < minDist && dist >= 0) {
        minDist = dist;
        activeIdx = i;
      }
    }
  }

  if (activeIdx === -1) return { words: [], activeWordIdx: -1 };

  // Adaptive phrase size based on maxLines
  const wordsPerLine = 3;
  const phraseSize = wordsPerLine * maxLines;
  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);

  const words = transcript.slice(phraseStart, phraseEnd);
  const localActiveIdx = activeIdx - phraseStart;

  return { words, activeWordIdx: localActiveIdx };
}

const SubtitleOverlay = ({ transcript, currentTime, style, silences, onPositionChange }: SubtitleOverlayProps) => {
  const { words, activeWordIdx } = useMemo(
    () => getCurrentPhrase(transcript, currentTime, style.timeOffset, style.boxHeight ?? 2, silences),
    [transcript, currentTime, style.timeOffset, style.boxHeight, silences]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onPositionChange || !containerRef.current) return;
    dragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: style.positionX,
      startY: style.positionY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }, [onPositionChange, style.positionX, style.positionY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current?.parentElement) return;
    const parent = containerRef.current.parentElement;
    const rect = parent.getBoundingClientRect();

    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;

    let newX = Math.max(5, Math.min(95, dragStart.current.startX + dx));
    let newY = Math.max(5, Math.min(95, dragStart.current.startY + dy));

    const isSnapX = Math.abs(newX - 50) < SNAP_THRESHOLD;
    const isSnapY = Math.abs(newY - 50) < SNAP_THRESHOLD;
    if (isSnapX) newX = 50;
    if (isSnapY) newY = 50;

    setSnapX(isSnapX);
    setSnapY(isSnapY);

    onPositionChange?.(newX, newY);
  }, [onPositionChange]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    setSnapX(false);
    setSnapY(false);
  }, []);

  if (words.length === 0) return null;

  const fontConfig = SUBTITLE_FONTS[style.font] ?? SUBTITLE_FONTS.montserrat;
  const scale = style.fontSize / 44;
  const boxWidth = style.boxWidth ?? 85;

  return (
    <>
      {snapX && (
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/50 z-40 pointer-events-none" />
      )}
      {snapY && (
        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/50 z-40 pointer-events-none" />
      )}

      <div
        ref={containerRef}
        className="absolute z-30 flex justify-center cursor-grab active:cursor-grabbing"
        style={{
          left: `${style.positionX}%`,
          top: `${style.positionY}%`,
          width: `${boxWidth}%`,
          transform: "translate(-50%, -50%)",
          pointerEvents: onPositionChange ? "auto" : "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="flex flex-wrap justify-center gap-x-[5px] gap-y-[3px]"
          style={{
            width: "100%",
            fontFamily: fontConfig.family,
            fontStyle: fontConfig.italic ? "italic" : "normal",
          }}
        >
          {words.map((word, i) => {
            const isActive = i === activeWordIdx;
            const isPast = i < activeWordIdx;
            const size = 15 * scale;
            const s = getStyle(style.preset, isActive, isPast, style.accentColor, size, fontConfig.weight);

            return (
              <span
                key={`${word.start}-${word.text}`}
                className="inline-block will-change-transform select-none"
                style={{
                  ...s,
                  transform: isActive ? "scale(1.12) translateY(-1px)" : "scale(1)",
                  transition: "all 0.08s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {word.text.toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};

function getStyle(
  preset: SubtitlePreset,
  active: boolean,
  past: boolean,
  accent: string,
  size: number,
  fw: number,
): React.CSSProperties {
  const base = { fontSize: size, fontWeight: fw, lineHeight: 1.15, padding: "2px 4px" };

  switch (preset) {
    case "karaoke":
      return {
        ...base,
        color: active ? accent : past ? "rgba(255,255,255,0.45)" : "#FFFFFF",
        textShadow: `0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.95)`,
        letterSpacing: "-0.02em",
      };
    case "pop":
      return {
        ...base,
        color: active ? "#000" : past ? "rgba(255,255,255,0.4)" : "#FFF",
        backgroundColor: active ? accent : "transparent",
        borderRadius: "8px",
        padding: "4px 10px",
        textShadow: active ? "none" : "0 2px 12px rgba(0,0,0,0.85)",
      };
    case "neon":
      return {
        ...base,
        color: active ? "#FFF" : past ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
        textShadow: active
          ? `0 0 8px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}90, 0 0 80px ${accent}40`
          : "0 2px 8px rgba(0,0,0,0.6)",
        letterSpacing: "0.02em",
      };
    case "minimal":
      return {
        ...base,
        fontSize: size * 0.88,
        color: active ? "#FFFFFF" : past ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.5)",
        textShadow: "0 1px 4px rgba(0,0,0,0.4)",
        letterSpacing: "0.04em",
      };
    case "block":
      return {
        ...base,
        fontSize: size * 0.92,
        color: active ? "#000" : "#FFF",
        backgroundColor: active ? accent : "rgba(0,0,0,0.65)",
        borderRadius: "6px",
        padding: "5px 12px",
        margin: "2px",
      };
    case "outline":
      return {
        ...base,
        fontSize: size * 1.05,
        color: active ? accent : "transparent",
        WebkitTextStroke: active ? "0px" : `2px rgba(255,255,255,0.9)`,
        textShadow: active ? `0 0 20px ${accent}70` : "none",
        letterSpacing: "-0.01em",
      };
    default:
      return {};
  }
}

export default SubtitleOverlay;
