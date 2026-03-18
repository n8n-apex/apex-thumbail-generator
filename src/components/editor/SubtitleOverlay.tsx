import { useMemo } from "react";
import { TranscriptWord, SubtitleStyle, SubtitlePreset, SUBTITLE_FONTS } from "@/types/editor";

interface SubtitleOverlayProps {
  transcript: TranscriptWord[];
  currentTime: number;
  style: SubtitleStyle;
}

/**
 * Group transcript into phrase chunks (3-5 words) based on natural pauses.
 * Show the current phrase, highlight the active word within it.
 */
function getCurrentPhrase(transcript: TranscriptWord[], currentTime: number) {
  if (transcript.length === 0) return { words: [], activeWordIdx: -1 };

  // Find active word with tolerance
  let activeIdx = -1;
  for (let i = 0; i < transcript.length; i++) {
    const w = transcript[i];
    if (currentTime >= w.start - 0.05 && currentTime < w.end + 0.1) {
      activeIdx = i;
      break;
    }
  }

  // If no exact match, find the nearest upcoming word
  if (activeIdx === -1) {
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start > currentTime) {
        // Check if we're in the gap before this word (show previous phrase still)
        if (i > 0 && currentTime < transcript[i].start && currentTime > transcript[i - 1].end) {
          // In a gap - if small gap, show previous word context
          if (transcript[i].start - currentTime < 0.3) {
            activeIdx = i;
          } else {
            return { words: [], activeWordIdx: -1 };
          }
        }
        break;
      }
    }
    if (activeIdx === -1) return { words: [], activeWordIdx: -1 };
  }

  // Build phrase: group words into chunks of ~4 words, aligned by natural pauses
  const phraseSize = 4;
  const phraseStart = Math.floor(activeIdx / phraseSize) * phraseSize;
  const phraseEnd = Math.min(phraseStart + phraseSize, transcript.length);
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
        {words.map((word, i) => (
          <WordSpan
            key={`${word.start}-${word.text}`}
            word={word.text}
            isActive={i === activeWordIdx}
            isPast={i < activeWordIdx}
            preset={style.preset}
            accentColor={style.accentColor}
            scale={scale}
            fontWeight={fontConfig.weight}
          />
        ))}
      </div>
    </div>
  );
};

interface WordSpanProps {
  word: string;
  isActive: boolean;
  isPast: boolean;
  preset: SubtitlePreset;
  accentColor: string;
  scale: number;
  fontWeight: number;
}

const WordSpan = ({ word, isActive, isPast, preset, accentColor, scale, fontWeight }: WordSpanProps) => {
  const size = 15 * scale;
  const s = getStyle(preset, isActive, isPast, accentColor, size, fontWeight);

  return (
    <span
      className="inline-block transition-all duration-75 ease-out"
      style={{
        ...s,
        transform: isActive ? "scale(1.08)" : "scale(1)",
      }}
    >
      {word.toUpperCase()}
    </span>
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
