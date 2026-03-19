import { useState, useCallback, useEffect, useRef } from "react";
import { TranscriptWord } from "@/types/editor";
import { Pencil, Save, BookOpen, X } from "lucide-react";

interface TranscriptEditorProps {
  transcript: TranscriptWord[];
  currentTime: number;
  onTranscriptChange: (words: TranscriptWord[]) => void;
}

// Corrections dictionary — persisted in localStorage
const CORRECTIONS_KEY = "apexclip_corrections";

function loadCorrections(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCorrections(corrections: Record<string, string>) {
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corrections));
}

export function applyCorrections(words: TranscriptWord[]): TranscriptWord[] {
  const corrections = loadCorrections();
  if (Object.keys(corrections).length === 0) return words;
  return words.map((w) => {
    const lower = w.text.toLowerCase();
    for (const [from, to] of Object.entries(corrections)) {
      if (lower === from.toLowerCase()) {
        return { ...w, text: to };
      }
    }
    return w;
  });
}

const TranscriptEditor = ({ transcript, currentTime, onTranscriptChange }: TranscriptEditorProps) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [corrections, setCorrections] = useState<Record<string, string>>(loadCorrections);
  const [showDict, setShowDict] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active word
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentTime]);

  const handleEdit = useCallback((idx: number) => {
    setEditingIdx(idx);
    setEditValue(transcript[idx].text);
  }, [transcript]);

  const handleSave = useCallback(() => {
    if (editingIdx === null) return;
    const oldText = transcript[editingIdx].text;
    const newText = editValue.trim();
    if (!newText || newText === oldText) {
      setEditingIdx(null);
      return;
    }

    // Save correction to dictionary
    const updated = { ...corrections, [oldText.toLowerCase()]: newText };
    setCorrections(updated);
    saveCorrections(updated);

    // Apply to transcript
    const newTranscript = transcript.map((w, i) => {
      if (i === editingIdx) return { ...w, text: newText };
      // Also apply this correction to other instances
      if (w.text.toLowerCase() === oldText.toLowerCase()) return { ...w, text: newText };
      return w;
    });
    onTranscriptChange(newTranscript);
    setEditingIdx(null);
  }, [editingIdx, editValue, transcript, corrections, onTranscriptChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditingIdx(null);
  }, [handleSave]);

  const removeCorrection = useCallback((key: string) => {
    const updated = { ...corrections };
    delete updated[key];
    setCorrections(updated);
    saveCorrections(updated);
  }, [corrections]);

  // Find active word index
  const activeIdx = transcript.findIndex(
    (w) => currentTime >= w.start - 0.05 && currentTime < w.end + 0.15
  );

  return (
    <div className="glass-elevated rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
            <Pencil className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">Transkript</span>
          <span className="text-[9px] text-muted-foreground">{transcript.length} Wörter</span>
        </div>
        <button
          onClick={() => setShowDict(!showDict)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all ${
            showDict ? "bg-primary/15 text-primary" : "glass-item text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-3 w-3" />
          {Object.keys(corrections).length > 0 && (
            <span className="tabular-nums">{Object.keys(corrections).length}</span>
          )}
        </button>
      </div>

      {/* Corrections Dictionary */}
      {showDict && Object.keys(corrections).length > 0 && (
        <div className="mb-2.5 p-2 rounded-xl bg-muted/30 space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Korrekturen</span>
          {Object.entries(corrections).map(([from, to]) => (
            <div key={from} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground line-through">{from}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-foreground">{to}</span>
              <button
                onClick={() => removeCorrection(from)}
                className="ml-auto text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Word list */}
      <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
        <div className="flex flex-wrap gap-1">
          {transcript.map((word, i) => {
            const isActive = i === activeIdx;
            const isEditing = i === editingIdx;

            if (isEditing) {
              return (
                <div key={`${word.start}-${i}`} className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="w-20 px-1.5 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-[11px] font-semibold text-foreground outline-none"
                  />
                  <button onClick={handleSave} className="text-primary hover:text-primary/80">
                    <Save className="h-3 w-3" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={`${word.start}-${i}`}
                ref={isActive ? activeRef : undefined}
                onClick={() => handleEdit(i)}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/20 text-primary ring-1 ring-primary/30 scale-105"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {word.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TranscriptEditor;
