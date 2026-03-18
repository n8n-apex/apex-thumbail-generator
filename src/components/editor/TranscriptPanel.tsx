import { TranscriptWord, SilenceGap } from "@/types/editor";
import { FileText } from "lucide-react";
import { useRef, useEffect } from "react";

interface TranscriptPanelProps {
  transcript: TranscriptWord[];
  silences: SilenceGap[];
  currentTime: number;
  onWordClick: (time: number) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

const TranscriptPanel = ({ transcript, silences, currentTime, onWordClick }: TranscriptPanelProps) => {
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentTime]);

  const isInSilence = (time: number) =>
    silences.some((s) => time >= s.start && time <= s.end);

  const isActiveWord = (word: TranscriptWord) =>
    currentTime >= word.start && currentTime < word.end;

  const lines: TranscriptWord[][] = [];
  for (let i = 0; i < transcript.length; i += 6) {
    lines.push(transcript.slice(i, i + 6));
  }

  return (
    <div className="flex h-full w-sidebar-w flex-col border-r border-border/60 glass">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Transcript</span>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground font-medium">
          {transcript.length} words
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {lines.map((line, lineIdx) => {
            const lineStart = line[0].start;
            const hasSilenceBefore =
              lineIdx > 0 && isInSilence(lines[lineIdx - 1][lines[lineIdx - 1].length - 1].end + 0.1);

            return (
              <div key={lineIdx}>
                {hasSilenceBefore && (
                  <div className="my-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-destructive/15" />
                    <span className="text-[9px] font-semibold text-destructive/50 tracking-wider">PAUSE</span>
                    <div className="h-px flex-1 bg-destructive/15" />
                  </div>
                )}
                <div className="mb-1">
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">
                    {formatTime(lineStart)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {line.map((word, wordIdx) => {
                    const active = isActiveWord(word);
                    return (
                      <span
                        key={`${lineIdx}-${wordIdx}`}
                        ref={active ? activeRef : null}
                        onClick={() => onWordClick(word.start)}
                        className={`cursor-pointer rounded-md px-1.5 py-0.5 text-sm transition-all ${
                          active
                            ? "bg-primary/15 text-primary font-semibold shadow-sm"
                            : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TranscriptPanel;
