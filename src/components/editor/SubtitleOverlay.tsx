import { useMemo } from "react";
import { TranscriptWord, SubtitleStyle, SubtitlePreset, SUBTITLE_FONTS } from "@/types/editor";

interface SubtitleOverlayProps {
  transcript: TranscriptWord[];
  currentTime: number;
  style: SubtitleStyle;
}

function getCurrentPhrase(transcript: TranscriptWord[], currentTime: number, timeOffset: number) {
  if (transcript.length === 0) return { words: [], activeWordIdx: -1 };

  // Apply time offset - shift the effective time forward to compensate for AI delay
  const t = currentTime - (timeOffset ?? 0);

  let activeIdx = -1;
  for (let i = 0; i < transcript.length; i++) {
    const w = transcript[i];
    const effectiveEnd = i < transcript.length - 1
      ? (transcript[i + 1].start - w.end < 0.5 ? transcript[i + 1].start : w.end + 0.15)
      : w.end + 0.3;

    if (t >= w.start - 0.05 && t < effectiveEnd) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx === -1) return { words: [], activeWordIdx: -1 };

  const phraseSize = 4;
  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);

  const words = transcript.slice(phraseStart, phraseEnd);
  const localActiveIdx = activeIdx - phraseStart;

  return { words, activeWordIdx: localActiveIdx };
}

const SubtitleOverlay = ({ transcript, currentTime, style }: SubtitleOverlayProps) => {
  const { words, activeWordIdx } = useMemo(
    () => getCurrentPhrase(transcript, currentTime, style.timeOffset),
    [transcript, currentTime, style.timeOffset]
  );

  if (words.length === 0) return null;

  const fontConfig = SUBTITLE_FONTS[style.font];
  const posClass =
    style.position === "top" ? "top-[12%]"
    : style.position === "center" ? "top-1/2 -translate-y-1/2"
    : "bottom-[14%]";

  const scale = style.fontSize / 44;

  return (
    <div className={`absolute left-2 right-2 flex justify-center ${posClass} pointer-events-none`}>
      <div
        className="flex flex-wrap justify-center gap-x-[5px] gap-y-[3px]"
        style={{ maxWidth: "96%", fontFamily: fontConfig.family }}
      >
        {words.map((word, i) => {
          const isActive = i === activeWordIdx;
          const isPast = i < activeWordIdx;
          const size = 15 * scale;
          const s = getStyle(style.preset, isActive, isPast, style.accentColor, size, fontConfig.weight);

          return (
            <span
              key={`${word.start}-${word.text}`}
              className="inline-block will-change-transform"
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
