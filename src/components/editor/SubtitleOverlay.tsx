import { useMemo } from "react";
import { TranscriptWord, SubtitleStyle, SubtitlePreset } from "@/types/editor";

interface SubtitleOverlayProps {
  transcript: TranscriptWord[];
  currentTime: number;
  style: SubtitleStyle;
}

/**
 * Get the visible words around currentTime (a window of ~3-5 words)
 */
function getVisibleWords(transcript: TranscriptWord[], currentTime: number) {
  // Find the active word
  const activeIdx = transcript.findIndex(
    (w) => currentTime >= w.start && currentTime < w.end + 0.15
  );
  if (activeIdx === -1) return { words: [], activeWordIdx: -1 };

  // Show a window of words around the active one
  const windowSize = 4;
  const start = Math.max(0, activeIdx - 1);
  const end = Math.min(transcript.length, start + windowSize);
  const words = transcript.slice(start, end);
  const activeWordIdx = activeIdx - start;

  return { words, activeWordIdx };
}

const SubtitleOverlay = ({ transcript, currentTime, style }: SubtitleOverlayProps) => {
  const { words, activeWordIdx } = useMemo(
    () => getVisibleWords(transcript, currentTime),
    [transcript, currentTime]
  );

  if (words.length === 0) return null;

  const posClass =
    style.position === "top"
      ? "top-[12%]"
      : style.position === "center"
      ? "top-1/2 -translate-y-1/2"
      : "bottom-[14%]";

  const scale = style.fontSize / 42; // base scale

  return (
    <div className={`absolute left-3 right-3 flex justify-center ${posClass}`}>
      <div className="flex flex-wrap justify-center gap-x-1 gap-y-0.5" style={{ maxWidth: "95%" }}>
        {words.map((word, i) => (
          <WordSpan
            key={`${word.start}-${word.text}`}
            word={word.text}
            isActive={i === activeWordIdx}
            isPast={i < activeWordIdx}
            preset={style.preset}
            accentColor={style.accentColor}
            scale={scale}
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
}

const WordSpan = ({ word, isActive, isPast, preset, accentColor, scale }: WordSpanProps) => {
  const baseSize = 14 * scale;

  const presetStyles = getPresetStyle(preset, isActive, isPast, accentColor, baseSize);

  return (
    <span
      className="inline-block transition-all duration-150 ease-out"
      style={{
        ...presetStyles,
        transform: isActive ? `scale(${1.05})` : "scale(1)",
      }}
    >
      {word.toUpperCase()}
    </span>
  );
};

function getPresetStyle(
  preset: SubtitlePreset,
  isActive: boolean,
  isPast: boolean,
  accent: string,
  size: number
): React.CSSProperties {
  switch (preset) {
    case "hormozi":
      return {
        fontSize: `${size}px`,
        fontWeight: 900,
        color: isActive ? accent : "#FFFFFF",
        textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        padding: "1px 2px",
      };

    case "karaoke":
      return {
        fontSize: `${size}px`,
        fontWeight: 800,
        color: isActive ? "#000" : isPast ? "rgba(255,255,255,0.5)" : "#FFF",
        backgroundColor: isActive ? accent : "transparent",
        borderRadius: "4px",
        padding: "2px 6px",
        textShadow: isActive ? "none" : "0 2px 8px rgba(0,0,0,0.8)",
        lineHeight: 1.2,
      };

    case "neon":
      return {
        fontSize: `${size}px`,
        fontWeight: 700,
        color: isActive ? accent : "#FFFFFF",
        textShadow: isActive
          ? `0 0 10px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}80`
          : "0 2px 8px rgba(0,0,0,0.8)",
        letterSpacing: "0.02em",
        lineHeight: 1.2,
        padding: "1px 2px",
      };

    case "minimal":
      return {
        fontSize: `${size * 0.85}px`,
        fontWeight: 500,
        color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.6)",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        letterSpacing: "0.01em",
        lineHeight: 1.3,
        padding: "1px 2px",
      };

    case "boxed":
      return {
        fontSize: `${size * 0.9}px`,
        fontWeight: 800,
        color: isActive ? "#000" : "#FFF",
        backgroundColor: isActive ? accent : "rgba(0,0,0,0.7)",
        borderRadius: "6px",
        padding: "3px 8px",
        margin: "2px",
        lineHeight: 1.2,
      };

    case "outline":
      return {
        fontSize: `${size}px`,
        fontWeight: 900,
        color: isActive ? accent : "transparent",
        WebkitTextStroke: isActive ? "0px" : `2px #FFFFFF`,
        textShadow: isActive
          ? `0 0 12px ${accent}80`
          : "0 2px 8px rgba(0,0,0,0.5)",
        letterSpacing: "-0.01em",
        lineHeight: 1.1,
        padding: "1px 2px",
      };

    default:
      return {};
  }
}

export default SubtitleOverlay;
