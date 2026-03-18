import { useMemo } from "react";
import { TranscriptWord, SubtitleStyle, SubtitlePreset, SUBTITLE_FONTS } from "@/types/editor";

interface SubtitleOverlayProps {
  transcript: TranscriptWord[];
  currentTime: number;
  style: SubtitleStyle;
}

/**
 * Find current word and build a display phrase around it.
 * Uses gap-filling: extends word boundaries to cover gaps between words
 * so there's no "dead zone" where no word is active.
 */
function getCurrentPhrase(transcript: TranscriptWord[], currentTime: number) {
  if (transcript.length === 0) return { words: [], activeWordIdx: -1 };

  // Gap-fill: extend each word's effective range to cover gaps
  // Word N's effective end = start of word N+1 (if gap < 0.5s)
  let activeIdx = -1;
  for (let i = 0; i < transcript.length; i++) {
    const w = transcript[i];
    const effectiveStart = i === 0 ? w.start - 0.1 : w.start;
    const effectiveEnd = i < transcript.length - 1
      ? (transcript[i + 1].start - w.end < 0.5 ? transcript[i + 1].start : w.end + 0.15)
      : w.end + 0.3;

    if (currentTime >= effectiveStart && currentTime < effectiveEnd) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx === -1) return { words: [], activeWordIdx: -1 };

  // Build phrase: group into chunks of ~4, aligned to chunk boundaries
  const phraseSize = 4;
  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);

  // Don't show phrase if we're in a long silence gap before next chunk
  if (activeIdx === phraseEnd - 1) {
    const nextWord = transcript[phraseEnd];
    if (nextWord && currentTime > transcript[activeIdx].end + 0.2 && currentTime < nextWord.start - 0.2) {
      return { words: [], activeWordIdx: -1 };
    }
  }

  const words = transcript.slice(phraseStart, phraseEnd);
  const localActiveIdx = activeIdx - phraseStart;

  return { words, activeWordIdx: localActiveIdx };
}

const SubtitleOverlay = ({ transcript, currentTime, style }: SubtitleOverlayProps) => {
  const { words, activeWordIdx } = useMemo(
    () => getCurrentPhrase(transcript, currentTime),
    [transcript, currentTime]
  );

  if (words.length === 0) return null;

  const fontConfig = SUBTITLE_FONTS[style.font];
  const posClass =
    style.position === "top" ? "top-[12%]"
    : style.position === "center" ? "top-1/2 -translate-y-1/2"
    : "bottom-[14%]";

  const scale = style.fontSize / 44;

  return (
    <div className={`absolute left-3 right-3 flex justify-center ${posClass} pointer-events-none`}>
      <div
        className="flex flex-wrap justify-center gap-x-1.5 gap-y-1"
        style={{ maxWidth: "95%", fontFamily: fontConfig.family }}
      >
        {words.map((word, i) => {
          const isActive = i === activeWordIdx;
          const isPast = i < activeWordIdx;
          const size = 15 * scale;
          const s = getStyle(style.preset, isActive, isPast, style.accentColor, size, fontConfig.weight);

          return (
            <span
              key={`${word.start}-${word.text}`}
              className="inline-block transition-all duration-75 ease-out"
              style={{
                ...s,
                transform: isActive ? "scale(1.08)" : "scale(1)",
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
  switch (preset) {
    case "bold-pop":
      return {
        fontSize: size, fontWeight: fw,
        color: active ? accent : past ? "rgba(255,255,255,0.7)" : "#FFFFFF",
        textShadow: "0 2px 10px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.9)",
        letterSpacing: "-0.03em", lineHeight: 1.1, padding: "1px 3px",
      };
    case "highlight":
      return {
        fontSize: size, fontWeight: fw,
        color: active ? "#000" : past ? "rgba(255,255,255,0.5)" : "#FFF",
        backgroundColor: active ? accent : "transparent",
        borderRadius: "6px", padding: "3px 8px",
        textShadow: active ? "none" : "0 2px 10px rgba(0,0,0,0.8)", lineHeight: 1.25,
      };
    case "glow":
      return {
        fontSize: size, fontWeight: fw,
        color: active ? accent : past ? "rgba(255,255,255,0.5)" : "#FFFFFF",
        textShadow: active
          ? `0 0 12px ${accent}, 0 0 24px ${accent}, 0 0 48px ${accent}60`
          : "0 2px 10px rgba(0,0,0,0.7)",
        letterSpacing: "0.01em", lineHeight: 1.2, padding: "1px 3px",
      };
    case "clean":
      return {
        fontSize: size * 0.9, fontWeight: fw,
        color: active ? "#FFFFFF" : past ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.55)",
        textShadow: "0 1px 6px rgba(0,0,0,0.5)", lineHeight: 1.3, padding: "1px 3px",
      };
    case "boxed":
      return {
        fontSize: size * 0.9, fontWeight: fw,
        color: active ? "#000" : "#FFF",
        backgroundColor: active ? accent : "rgba(0,0,0,0.6)",
        borderRadius: "8px", padding: "4px 10px", margin: "2px", lineHeight: 1.2,
      };
    case "stroke":
      return {
        fontSize: size * 1.05, fontWeight: fw,
        color: active ? accent : "transparent",
        WebkitTextStroke: active ? "0px" : "2px #FFFFFF",
        textShadow: active ? `0 0 16px ${accent}60` : "0 2px 8px rgba(0,0,0,0.4)",
        letterSpacing: "-0.02em", lineHeight: 1.1, padding: "1px 3px",
      };
    default:
      return {};
  }
}

export default SubtitleOverlay;
