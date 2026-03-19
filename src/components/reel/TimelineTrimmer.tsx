import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { TrimRegion } from "@/types/video-project";
import { Scissors, Trash2, GripVertical } from "lucide-react";

interface TimelineTrimmerProps {
  duration: number;
  currentTime: number;
  trimRegions: TrimRegion[];
  silences: { start: number; end: number }[];
  rawAmplitudes: number[];
  onTrimRegionsChange: (regions: TrimRegion[]) => void;
  onSeek: (t: number) => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
};

const TimelineTrimmer = ({
  duration, currentTime, trimRegions = [], silences = [], rawAmplitudes = [],
  onTrimRegionsChange, onSeek,
}: TimelineTrimmerProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ regionId: string; edge: "start" | "end" } | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  // Waveform visualization (downsampled)
  const waveformBars = useMemo(() => {
    if (rawAmplitudes.length === 0) return [];
    const barCount = 120;
    const samplesPerBar = Math.max(1, Math.floor(rawAmplitudes.length / barCount));
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, rawAmplitudes.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        if (rawAmplitudes[j] > max) max = rawAmplitudes[j];
      }
      bars.push(max);
    }
    // Normalize
    const peak = Math.max(...bars, 0.01);
    return bars.map((b) => b / peak);
  }, [rawAmplitudes]);

  const getTimeFromX = useCallback((clientX: number) => {
    if (!trackRef.current || !duration) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  // Handle drag
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const time = getTimeFromX(clientX);
      
      onTrimRegionsChange(
        trimRegions.map((r) => {
          if (r.id !== dragging.regionId) return r;
          if (dragging.edge === "start") {
            return { ...r, start: Math.min(time, r.end - 0.1) };
          } else {
            return { ...r, end: Math.max(time, r.start + 0.1) };
          }
        })
      );
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, trimRegions, onTrimRegionsChange, getTimeFromX]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    const time = getTimeFromX(e.clientX);
    onSeek(time);
  }, [dragging, getTimeFromX, onSeek]);

  const handleTrackHover = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromX(e.clientX);
    setHoveredTime(time);
  }, [getTimeFromX]);

  const handleSplit = useCallback(() => {
    if (!duration || currentTime <= 0 || currentTime >= duration) return;
    
    // Check if we're inside an existing trim region — split it
    const insideRegion = trimRegions.find(
      (r) => currentTime > r.start + 0.05 && currentTime < r.end - 0.05
    );
    
    if (insideRegion) {
      const newRegions = trimRegions.flatMap((r) => {
        if (r.id !== insideRegion.id) return [r];
        return [
          { id: crypto.randomUUID(), start: r.start, end: currentTime },
          { id: crypto.randomUUID(), start: currentTime, end: r.end },
        ];
      });
      onTrimRegionsChange(newRegions);
    } else {
      // Create a new cut region around the playhead (0.5s around it)
      const cutStart = Math.max(0, currentTime - 0.25);
      const cutEnd = Math.min(duration, currentTime + 0.25);
      onTrimRegionsChange([
        ...trimRegions,
        { id: crypto.randomUUID(), start: cutStart, end: cutEnd },
      ]);
    }
  }, [currentTime, duration, trimRegions, onTrimRegionsChange]);

  const removeRegion = useCallback((id: string) => {
    onTrimRegionsChange(trimRegions.filter((r) => r.id !== id));
  }, [trimRegions, onTrimRegionsChange]);

  if (!duration) return null;

  const playheadPct = (currentTime / duration) * 100;

  return (
    <div className="glass-elevated rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
          <Scissors className="h-3 w-3 text-primary" />
        </div>
        <span className="text-xs font-bold text-foreground">Timeline & Schnitt</span>
        <button
          onClick={handleSplit}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg glass-item text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          title="An Playhead-Position splitten"
        >
          <Scissors className="h-3 w-3" />
          Split
        </button>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-14 rounded-xl bg-muted/30 cursor-crosshair overflow-hidden select-none"
        onClick={handleTrackClick}
        onMouseMove={handleTrackHover}
        onMouseLeave={() => setHoveredTime(null)}
      >
        {/* Waveform */}
        <div className="absolute inset-0 flex items-end px-px gap-px pointer-events-none">
          {waveformBars.map((amplitude, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/20 rounded-t-sm min-w-0"
              style={{ height: `${Math.max(4, amplitude * 85)}%` }}
            />
          ))}
        </div>

        {/* Silence regions */}
        {silences.map((s, i) => (
          <div
            key={`sil-${i}`}
            className="absolute top-0 h-full bg-destructive/15 pointer-events-none"
            style={{
              left: `${(s.start / duration) * 100}%`,
              width: `${((s.end - s.start) / duration) * 100}%`,
            }}
          />
        ))}

        {/* Trim/cut regions */}
        {trimRegions.map((region) => (
          <div
            key={region.id}
            className="absolute top-0 h-full group"
            style={{
              left: `${(region.start / duration) * 100}%`,
              width: `${((region.end - region.start) / duration) * 100}%`,
            }}
          >
            {/* Cut overlay */}
            <div className="absolute inset-0 bg-destructive/25 border-y-2 border-destructive/40" />
            
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); removeRegion(region.id); }}
              className="absolute top-0.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>

            {/* Left handle */}
            <div
              className="absolute left-0 top-0 h-full w-2 cursor-col-resize z-10 flex items-center justify-center hover:bg-destructive/40 transition-colors"
              onMouseDown={(e) => { e.stopPropagation(); setDragging({ regionId: region.id, edge: "start" }); }}
              onTouchStart={(e) => { e.stopPropagation(); setDragging({ regionId: region.id, edge: "start" }); }}
            >
              <GripVertical className="h-3 w-3 text-destructive" />
            </div>

            {/* Right handle */}
            <div
              className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 flex items-center justify-center hover:bg-destructive/40 transition-colors"
              onMouseDown={(e) => { e.stopPropagation(); setDragging({ regionId: region.id, edge: "end" }); }}
              onTouchStart={(e) => { e.stopPropagation(); setDragging({ regionId: region.id, edge: "end" }); }}
            >
              <GripVertical className="h-3 w-3 text-destructive" />
            </div>
          </div>
        ))}

        {/* Hover indicator */}
        {hoveredTime !== null && !dragging && (
          <div
            className="absolute top-0 h-full w-px bg-foreground/20 pointer-events-none"
            style={{ left: `${(hoveredTime / duration) * 100}%` }}
          />
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-primary z-20 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-md shadow-primary/30" />
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] tabular-nums text-muted-foreground">{fmt(currentTime)}</span>
        <span className="text-[9px] tabular-nums text-muted-foreground">{fmt(duration)}</span>
      </div>

      {/* Region list */}
      {trimRegions.length > 0 && (
        <div className="mt-2 space-y-1">
          {trimRegions.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 text-[10px] rounded-lg glass-item px-2 py-1.5">
              <span className="text-destructive font-bold">✂</span>
              <span className="text-muted-foreground">
                Schnitt {i + 1}: {fmt(r.start)} — {fmt(r.end)}
              </span>
              <span className="text-muted-foreground/60 ml-auto">
                {(r.end - r.start).toFixed(1)}s
              </span>
              <button
                onClick={() => removeRegion(r.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineTrimmer;
