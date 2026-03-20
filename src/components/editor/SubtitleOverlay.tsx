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
const WORDS_PER_LINE = 3;

interface LineWord {
  word: TranscriptWord;
  idx: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getTimingWindow(transcript: TranscriptWord[], idx: number) {
  const current = transcript[idx];
  const prev = idx > 0 ? transcript[idx - 1] : null;
  const next = idx < transcript.length - 1 ? transcript[idx + 1] : null;

  const duration = Math.max(0.06, current.end - current.start);
  const leftGap = prev ? Math.max(0, current.start - prev.end) : duration;
  const rightGap = next ? Math.max(0, next.start - current.end) : duration;
  const pace = clamp((duration + leftGap + rightGap) / 3, 0.08, 0.34);

  return {
    preRoll: clamp(pace * 0.55, 0.03, 0.16),
    hold: clamp(pace * 0.6, 0.08, 0.22),
  };
}

function findActiveWordIndex(transcript: TranscriptWord[], t: number): number {
  if (transcript.length === 0) return -1;

  let lo = 0;
  let hi = transcript.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const word = transcript[mid];

    if (t < word.start) {
      hi = mid - 1;
    } else if (t > word.end) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  const anchor = clamp(lo, 0, transcript.length - 1);
  let bestIdx = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = Math.max(0, anchor - 2); i <= Math.min(transcript.length - 1, anchor + 2); i++) {
    const word = transcript[i];
    const window = getTimingWindow(transcript, i);
    const inWindow = t >= word.start - window.preRoll && t <= word.end + window.hold;
    if (!inWindow) continue;

    const center = (word.start + word.end) / 2;
    const inWord = t >= word.start && t <= word.end;
    const confidencePenalty = (1 - clamp(word.confidence ?? 1, 0, 1)) * 0.03;
    const score = Math.abs(t - center) - (inWord ? 0.08 : 0) + confidencePenalty;

    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx !== -1) return bestIdx;

  const prev = lo - 1;
  const next = lo;

  if (prev >= 0) {
    const hold = getTimingWindow(transcript, prev).hold;
    if (t >= transcript[prev].start && t - transcript[prev].end <= hold) {
      return prev;
    }
  }

  if (next < transcript.length) {
    const preRoll = getTimingWindow(transcript, next).preRoll;
    if (transcript[next].start - t <= preRoll) {
      return next;
    }
  }

  return -1;
}

function getCurrentPhrase(
  transcript: TranscriptWord[],
  currentTime: number,
  timeOffset: number,
  maxLines: number,
  silences?: { start: number; end: number }[],
) {
  if (transcript.length === 0) return { words: [], activeWordIdx: -1 };

  const t = currentTime - (timeOffset ?? 0);

  if (silences) {
    for (const s of silences) {
      if (t >= s.start && t < s.end) {
        return { words: [], activeWordIdx: -1 };
      }
    }
  }

  const phraseSize = WORDS_PER_LINE * Math.max(1, maxLines);
  const activeIdx = findActiveWordIndex(transcript, t);

  if (activeIdx === -1) {
    if (t < transcript[0].start && transcript[0].start - t <= 0.85) {
      return {
        words: transcript.slice(0, Math.min(phraseSize, transcript.length)),
        activeWordIdx: -1,
      };
    }

    const last = transcript[transcript.length - 1];
    if (t > last.end + 0.35) {
      return { words: [], activeWordIdx: -1 };
    }

    return { words: [], activeWordIdx: -1 };
  }

  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);
  const words = transcript.slice(phraseStart, phraseEnd);

  return {
    words,
    activeWordIdx: activeIdx - phraseStart,
  };
}

function buildSubtitleLines(words: TranscriptWord[], maxLines: number): LineWord[][] {
  const lines: LineWord[][] = [];
  const lineCount = Math.max(1, maxLines);

  let cursor = 0;
  for (let line = 0; line < lineCount && cursor < words.length; line++) {
    const chunk = words.slice(cursor, cursor + WORDS_PER_LINE).map((word, localIdx) => ({
      word,
      idx: cursor + localIdx,
    }));
    lines.push(chunk);
    cursor += WORDS_PER_LINE;
  }

  return lines;
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

  const fontConfig = SUBTITLE_FONTS[style.font] ?? SUBTITLE_FONTS.montserrat;
  const scale = style.fontSize / 44;
  const boxWidth = style.boxWidth ?? 85;
  const maxLines = style.boxHeight ?? 2;
  const bgBox = style.backgroundBox ?? "none";
  const lines = useMemo(() => buildSubtitleLines(words, maxLines), [words, maxLines]);

  if (words.length === 0) return null;

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
          maxWidth: "96%",
          transform: "translate(-50%, -50%)",
          pointerEvents: onPositionChange ? "auto" : "none",
          overflow: "visible",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="flex flex-col items-center gap-y-[3px]"
          style={{
            width: "100%",
            fontFamily: fontConfig.family,
            fontStyle: fontConfig.italic ? "italic" : "normal",
            overflow: "visible",
            padding: `${Math.max(3, 5 * scale)}px ${bgBox !== "none" ? Math.max(8, 12 * scale) : 0}px`,
            backgroundColor: bgBox === "black" ? "rgba(0,0,0,0.82)" : bgBox === "white" ? "rgba(255,255,255,0.92)" : "transparent",
            borderRadius: bgBox !== "none" ? `${Math.max(6, 10 * scale)}px` : undefined,
          }}
        >
          {lines.map((line, lineIdx) => (
            <div key={`line-${lineIdx}`} className="flex w-full justify-center gap-x-[5px] flex-wrap">
              {line.map(({ word, idx }) => {
                const isActive = idx === activeWordIdx;
                const isPast = idx < activeWordIdx;
                const size = 15 * scale;
                const s = getStyle(style.preset, isActive, isPast, style.accentColor, size, fontConfig.weight, bgBox);
                const anim = getAnimation(style.preset, isActive);

                return (
                  <span
                    key={`${word.start}-${word.text}-${idx}`}
                    className="inline-block will-change-transform select-none"
                    style={{
                      ...s,
                      ...anim,
                      overflowWrap: "break-word",
                    }}
                  >
                    {word.text.toUpperCase()}
                  </span>
                );
              })}
            </div>
          ))}
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
  bgBox: string = "none",
): React.CSSProperties {
  const base = { fontSize: size, fontWeight: fw, lineHeight: 1.15, padding: "2px 4px" };

  // When background box is active, adapt text colors
  const onDark = bgBox === "black";
  const onLight = bgBox === "white";

  switch (preset) {
    case "karaoke":
      return {
        ...base,
        color: active ? accent : past
          ? (onLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.45)")
          : (onLight ? "#000" : "#FFFFFF"),
        textShadow: onLight ? "none" : `0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.95)`,
        letterSpacing: "-0.02em",
      };
    case "pop":
      return {
        ...base,
        color: active ? "#000" : past
          ? (onLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)")
          : (onLight ? "#000" : "#FFF"),
        backgroundColor: active ? accent : "transparent",
        borderRadius: "8px",
        padding: "4px 10px",
        textShadow: active ? "none" : (onLight ? "none" : "0 2px 12px rgba(0,0,0,0.85)"),
      };
    case "neon":
      return {
        ...base,
        color: active
          ? (onLight ? "#000" : "#FFF")
          : past
            ? (onLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)")
            : (onLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)"),
        textShadow: active
          ? (onLight
            ? `0 0 8px ${accent}60, 0 0 20px ${accent}40`
            : `0 0 8px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}90, 0 0 80px ${accent}40`)
          : (onLight ? "none" : "0 2px 8px rgba(0,0,0,0.6)"),
        letterSpacing: "0.02em",
      };
    case "minimal":
      return {
        ...base,
        fontSize: size * 0.88,
        color: active
          ? (onLight ? "#000" : "#FFFFFF")
          : past
            ? (onLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)")
            : (onLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)"),
        textShadow: onLight ? "none" : "0 1px 4px rgba(0,0,0,0.4)",
        letterSpacing: "0.04em",
      };
    case "block":
      return {
        ...base,
        fontSize: size * 0.92,
        color: active ? "#000" : (onLight ? "#000" : "#FFF"),
        backgroundColor: active ? accent : (onLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.65)"),
        borderRadius: "6px",
        padding: "5px 12px",
        margin: "2px",
      };
    case "outline":
      return {
        ...base,
        fontSize: size * 1.05,
        color: active ? accent : "transparent",
        WebkitTextStroke: active ? "0px" : `2px ${onLight ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)"}`,
        textShadow: active ? `0 0 20px ${accent}70` : "none",
        letterSpacing: "-0.01em",
      };
    default:
      return {};
  }
}

/** TikTok/Instagram viral animation styles per preset */
function getAnimation(preset: SubtitlePreset, active: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    transition: "all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  if (!active) {
    return { ...base, transform: "scale(1) translateY(0)" };
  }

  switch (preset) {
    case "karaoke":
      // TikTok bounce-in: scale up + slight lift
      return { ...base, transform: "scale(1.18) translateY(-2px)", transition: "all 0.08s cubic-bezier(0.34, 1.56, 0.64, 1)" };
    case "pop":
      // Instagram punch: fast scale with spring
      return { ...base, transform: "scale(1.22) translateY(-1px)", transition: "all 0.06s cubic-bezier(0.22, 1.2, 0.36, 1)" };
    case "neon":
      // Glow pulse: subtle scale + Y shift for floating feel
      return { ...base, transform: "scale(1.1) translateY(-3px)", transition: "all 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)" };
    case "minimal":
      // Clean fade-scale, no bounce
      return { ...base, transform: "scale(1.05)", transition: "all 0.15s ease-out" };
    case "block":
      // Hard snap: instant scale, no easing
      return { ...base, transform: "scale(1.15)", transition: "all 0.04s linear" };
    case "outline":
      // Elastic pop: big spring overshoot
      return { ...base, transform: "scale(1.25) translateY(-2px)", transition: "all 0.1s cubic-bezier(0.68, -0.55, 0.27, 1.55)" };
    default:
      return { ...base, transform: "scale(1.12)" };
  }
}

export default SubtitleOverlay;
