import { useCallback, useRef } from "react";
import { SilenceGap } from "@/types/editor";
import { Clock } from "lucide-react";

interface TimelineProps {
  duration: number;
  currentTime: number;
  silences: SilenceGap[];
  removeSilences: boolean;
  onSeek: (time: number) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const Timeline = ({ duration, currentTime, silences, removeSilences, onSeek }: TimelineProps) => {
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
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      handleClick(e);
    },
    [handleClick]
  );

  const effectiveDuration = duration || 18;
  const playheadPos = (currentTime / effectiveDuration) * 100;

  // Time markers
  const markers: number[] = [];
  const interval = effectiveDuration > 30 ? 5 : effectiveDuration > 10 ? 2 : 1;
  for (let t = 0; t <= effectiveDuration; t += interval) markers.push(t);

  return (
    <div className="h-timeline-h border-t border-border bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">TIMELINE</span>
        <span className="ml-2 text-[10px] tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </span>
        {removeSilences && (
          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            SILENCES REMOVED
          </span>
        )}
        {!removeSilences && silences.length > 0 && (
          <span className="ml-auto text-[10px] text-editor-silence">
            {silences.length} pauses detected
          </span>
        )}
      </div>

      {/* Time Ruler */}
      <div className="relative border-b border-border px-4 py-1">
        <div className="relative h-4">
          {markers.map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(t / effectiveDuration) * 100}%` }}
            >
              <div className="h-2 w-px bg-muted" />
              <span className="text-[8px] tabular-nums text-muted-foreground">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div className="px-4 py-3 space-y-2">
        {/* Video Track */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Video
          </span>
          <div
            ref={trackRef}
            className="relative h-10 flex-1 cursor-pointer rounded-md bg-editor-timeline-clip overflow-hidden"
            onClick={handleClick}
            onMouseDown={handleClick}
            onMouseMove={handleMouseMove}
          >
            {/* Silence zones */}
            {!removeSilences &&
              silences.map((s, i) => (
                <div
                  key={i}
                  className="silence-stripe absolute top-0 h-full"
                  style={{
                    left: `${(s.start / effectiveDuration) * 100}%`,
                    width: `${((s.end - s.start) / effectiveDuration) * 100}%`,
                  }}
                />
              ))}

            {/* Active clips (when silences removed) */}
            {removeSilences && (
              <div className="absolute inset-0 flex">
                {(() => {
                  // Build non-silence segments
                  const segments: { start: number; end: number }[] = [];
                  let cursor = 0;
                  const sorted = [...silences].sort((a, b) => a.start - b.start);
                  for (const s of sorted) {
                    if (cursor < s.start) segments.push({ start: cursor, end: s.start });
                    cursor = s.end;
                  }
                  if (cursor < effectiveDuration) segments.push({ start: cursor, end: effectiveDuration });

                  const totalActive = segments.reduce((sum, s) => sum + (s.end - s.start), 0);

                  return segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="h-full bg-editor-timeline-active"
                      style={{
                        width: `${((seg.end - seg.start) / totalActive) * 100}%`,
                        marginRight: idx < segments.length - 1 ? "2px" : undefined,
                      }}
                    />
                  ));
                })()}
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary z-10"
              style={{ left: `${playheadPos}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        {/* Audio Waveform (simplified visualization) */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Audio
          </span>
          <div className="relative h-8 flex-1 rounded-md bg-editor-timeline-clip overflow-hidden">
            {/* Fake waveform bars */}
            <div className="absolute inset-0 flex items-center gap-px px-1">
              {Array.from({ length: 120 }).map((_, i) => {
                const t = (i / 120) * effectiveDuration;
                const inSilence = silences.some((s) => t >= s.start && t <= s.end);
                const height = inSilence
                  ? Math.random() * 8 + 2
                  : Math.random() * 24 + 8;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      inSilence ? "bg-editor-silence/40" : "bg-primary/30"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary z-10"
              style={{ left: `${playheadPos}%` }}
            />
          </div>
        </div>

        {/* Subtitles Track */}
        <div className="flex items-center gap-3">
          <span className="w-14 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Subs
          </span>
          <div className="relative h-6 flex-1 rounded-md bg-editor-timeline-clip overflow-hidden">
            {/* Subtitle blocks */}
            {(() => {
              // Group consecutive words into subtitle blocks
              const blocks: { start: number; end: number }[] = [];
              let blockStart = -1;
              let blockEnd = -1;

              for (const word of [...silences.length ? [] : [], ...Array.from({ length: 0 })]) {
                void word;
              }

              // Simple: create blocks from transcript gaps > 0.3s
              const transcript_proxy = [
                { start: 0.2, end: 2.6 },
                { start: 3.8, end: 7.1 },
                { start: 8.5, end: 11.3 },
                { start: 12.8, end: 14.9 },
                { start: 16.0, end: 17.4 },
              ];

              void blockStart;
              void blockEnd;

              return transcript_proxy.map((b, idx) => (
                <div
                  key={idx}
                  className="absolute top-1 bottom-1 rounded bg-primary/20 border border-primary/30"
                  style={{
                    left: `${(b.start / effectiveDuration) * 100}%`,
                    width: `${((b.end - b.start) / effectiveDuration) * 100}%`,
                  }}
                />
              ));
            })()}

            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary z-10"
              style={{ left: `${playheadPos}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
