import { useCallback, useRef } from "react";
import { SilenceGap } from "@/types/editor";
import { Clock } from "lucide-react";

interface TimelineProps {
  duration: number;
  currentTime: number;
  silences: SilenceGap[];
  removeSilences: boolean;
  amplitudes: number[];
  onSeek: (time: number) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const Timeline = ({ duration, currentTime, silences, removeSilences, amplitudes, onSeek }: TimelineProps) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => { if (e.buttons === 1) handleClick(e); },
    [handleClick]
  );

  const effectiveDuration = duration || 18;
  const playheadPos = (currentTime / effectiveDuration) * 100;

  const markers: number[] = [];
  const interval = effectiveDuration > 60 ? 10 : effectiveDuration > 30 ? 5 : effectiveDuration > 10 ? 2 : 1;
  for (let t = 0; t <= effectiveDuration; t += interval) markers.push(t);

  const displayBars = 200;
  const sampledAmplitudes: number[] = [];
  if (amplitudes.length > 0) {
    const step = amplitudes.length / displayBars;
    for (let i = 0; i < displayBars; i++) {
      const idx = Math.floor(i * step);
      const end = Math.min(Math.floor((i + 1) * step), amplitudes.length);
      let max = 0;
      for (let j = idx; j < end; j++) { if (amplitudes[j] > max) max = amplitudes[j]; }
      sampledAmplitudes.push(max);
    }
  }

  return (
    <div className="h-timeline-h border-t border-border/60 glass">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">TIMELINE</span>
        <span className="ml-2 text-[10px] tabular-nums text-muted-foreground font-medium">
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </span>
        {removeSilences && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
            SILENCES REMOVED
          </span>
        )}
        {!removeSilences && silences.length > 0 && (
          <span className="ml-auto text-[10px] text-destructive/70 font-medium">
            {silences.length} pauses detected
          </span>
        )}
      </div>

      {/* Time Ruler */}
      <div className="relative border-b border-border/40 px-4 py-1">
        <div className="relative h-4">
          {markers.map((t) => (
            <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: `${(t / effectiveDuration) * 100}%` }}>
              <div className="h-2 w-px bg-border" />
              <span className="text-[8px] tabular-nums text-muted-foreground/60 font-medium">{formatTime(t)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div className="px-4 py-3 space-y-2">
        {/* Video Track */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Video</span>
          <div
            ref={trackRef}
            className="relative h-10 flex-1 cursor-pointer rounded-lg bg-secondary/80 overflow-hidden"
            onClick={handleClick} onMouseDown={handleClick} onMouseMove={handleMouseMove}
          >
            {!removeSilences && silences.map((s, i) => (
              <div key={i} className="silence-stripe absolute top-0 h-full" style={{
                left: `${(s.start / effectiveDuration) * 100}%`,
                width: `${((s.end - s.start) / effectiveDuration) * 100}%`,
              }} />
            ))}
            {removeSilences && (
              <div className="absolute inset-0 flex">
                {(() => {
                  const segments: { start: number; end: number }[] = [];
                  let cursor = 0;
                  const sorted = [...silences].sort((a, b) => a.start - b.start);
                  for (const s of sorted) { if (cursor < s.start) segments.push({ start: cursor, end: s.start }); cursor = s.end; }
                  if (cursor < effectiveDuration) segments.push({ start: cursor, end: effectiveDuration });
                  const totalActive = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
                  return segments.map((seg, idx) => (
                    <div key={idx} className="h-full bg-primary/15 rounded" style={{
                      width: `${((seg.end - seg.start) / totalActive) * 100}%`,
                      marginRight: idx < segments.length - 1 ? "2px" : undefined,
                    }} />
                  ));
                })()}
              </div>
            )}
            <div className="absolute top-0 h-full w-0.5 bg-primary z-10 shadow-sm shadow-primary/30" style={{ left: `${playheadPos}%` }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary shadow-md shadow-primary/30" />
            </div>
          </div>
        </div>

        {/* Audio */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Audio</span>
          <div className="relative h-8 flex-1 rounded-lg bg-secondary/80 overflow-hidden">
            <div className="absolute inset-0 flex items-center gap-px px-0.5">
              {(sampledAmplitudes.length > 0 ? sampledAmplitudes : Array.from({ length: displayBars }, () => 0)).map((amp, i) => {
                const t = (i / displayBars) * effectiveDuration;
                const inSilence = silences.some((s) => t >= s.start && t <= s.end);
                return (
                  <div key={i} className={`flex-1 rounded-full ${inSilence ? "bg-destructive/20" : "bg-primary/25"}`}
                    style={{ height: `${Math.max(2, amp * 28)}px` }} />
                );
              })}
            </div>
            <div className="absolute top-0 h-full w-0.5 bg-primary z-10" style={{ left: `${playheadPos}%` }} />
          </div>
        </div>

        {/* Subs */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Subs</span>
          <div className="relative h-6 flex-1 rounded-lg bg-secondary/80 overflow-hidden">
            <div className="absolute top-0 h-full w-0.5 bg-primary z-10" style={{ left: `${playheadPos}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
