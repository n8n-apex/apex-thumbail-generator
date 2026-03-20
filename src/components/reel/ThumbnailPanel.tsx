import { useState, useRef, useCallback, useEffect } from "react";
import { Image, Sparkles, Download, RefreshCw, Type, Focus, Wand2 } from "lucide-react";
import { TranscriptWord } from "@/types/editor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThumbnailPanelProps {
  videoRef?: HTMLVideoElement | null;
  transcript?: TranscriptWord[];
}

const FOCUS_OPTIONS = [
  { label: "Gesicht", value: "face" },
  { label: "Mitte", value: "center" },
  { label: "Produkt", value: "product" },
  { label: "Text", value: "text" },
];

const ThumbnailPanel = ({ videoRef, transcript }: ThumbnailPanelProps) => {
  const [prompt, setPrompt] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [focusType, setFocusType] = useState("face");
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoSuggestedRef = useRef(false);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.videoWidth;
    canvas.height = videoRef.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, [videoRef]);

  const suggestFromTranscript = useCallback(async () => {
    if (!transcript || transcript.length === 0) {
      toast.error("Kein Transkript vorhanden");
      return;
    }

    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: { action: "suggest", transcript },
      });

      if (error) throw error;

      const suggestion = data?.suggestion;
      if (suggestion) {
        setPrompt(suggestion.prompt || "");
        setOverlayText(suggestion.overlayText || "");
        if (suggestion.focusType) setFocusType(suggestion.focusType);
        toast.success("KI-Vorschlag geladen!");
      } else {
        throw new Error(data?.error || "Kein Vorschlag erhalten");
      }
    } catch (e: any) {
      console.error("Suggest error:", e);
      toast.error(e.message || "Vorschlag fehlgeschlagen");
    } finally {
      setSuggesting(false);
    }
  }, [transcript]);

  useEffect(() => {
    if (!transcript || transcript.length === 0) return;
    if (autoSuggestedRef.current) return;
    if (prompt.trim() || overlayText.trim()) return;

    autoSuggestedRef.current = true;
    void suggestFromTranscript();
  }, [transcript, prompt, overlayText, suggestFromTranscript]);

  const generateThumbnail = useCallback(async () => {
    if (!prompt.trim() && !overlayText.trim()) {
      toast.error("Bitte Beschreibung oder Text eingeben");
      return;
    }

    setGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const frameImage = captureFrame();

      const focusPrompt = {
        face: "Focus on the person's face with dramatic close-up, shallow depth of field blurring the background.",
        center: "Centered composition with balanced framing.",
        product: "Focus on the main object/product with bokeh background.",
        text: "Composition that leaves space for text overlays, clean background areas.",
      }[focusType] || "";

      const fullPrompt = `${prompt}. ${focusPrompt}`;

      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: { prompt: fullPrompt, frameImage, overlayText: overlayText.trim() || undefined },
      });

      if (controller.signal.aborted) {
        toast.error("Thumbnail-Generierung hat zu lange gedauert (>45s). Versuche es mit einem kürzeren Prompt.");
        return;
      }

      if (error) throw error;
      if (data?.imageUrl) {
        setThumbnailUrl(data.imageUrl);
        toast.success("Thumbnail generiert!");
      } else {
        throw new Error(data?.error || "Keine Bilddaten erhalten");
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || controller.signal.aborted) {
        toast.error("Timeout: Thumbnail-Generierung abgebrochen. Versuche einen kürzeren Prompt.");
      } else {
        console.error("Thumbnail error:", e);
        toast.error(e.message || "Thumbnail-Generierung fehlgeschlagen");
      }
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  }, [prompt, overlayText, focusType, captureFrame]);

  const downloadThumbnail = useCallback(() => {
    if (!thumbnailUrl) return;
    const a = document.createElement("a");
    a.href = thumbnailUrl;
    a.download = `thumbnail_${Date.now()}.png`;
    a.click();
  }, [thumbnailUrl]);

  const hasTranscript = transcript && transcript.length > 0;

  return (
    <div className="glass-elevated rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15">
            <Image className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">KI-Thumbnail</span>
        </div>
        {hasTranscript && (
          <button
            onClick={suggestFromTranscript}
            disabled={suggesting}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {suggesting ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            {suggesting ? "Analysiert..." : "KI-Vorschlag"}
          </button>
        )}
      </div>

      {/* Prompt input */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Beschreibe dein Thumbnail... oder klicke 'KI-Vorschlag' für automatische Analyse"
          className="w-full rounded-xl glass-item p-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
          rows={2}
        />
      </div>

      {/* Overlay text */}
      <div>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          <Type className="h-3 w-3" /> Glass-Text Overlay
        </span>
        <input
          value={overlayText}
          onChange={(e) => setOverlayText(e.target.value)}
          placeholder="z.B. 'TOP 5 TIPPS'"
          className="w-full rounded-xl glass-item px-2.5 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Focus type */}
      <div>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          <Focus className="h-3 w-3" /> Fokus
        </span>
        <div className="grid grid-cols-2 gap-1">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFocusType(opt.value)}
              className={`rounded-xl py-1.5 px-2 text-[10px] font-bold transition-all ${
                focusType === opt.value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "glass-item text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generateThumbnail}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 rounded-xl glass-button-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
      >
        {generating ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Generiert...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Thumbnail generieren
          </>
        )}
      </button>

      {/* Preview + Download */}
      {thumbnailUrl && (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-border/30">
            <img src={thumbnailUrl} alt="Generated thumbnail" className="w-full h-auto" />
          </div>
          <button
            onClick={downloadThumbnail}
            className="w-full flex items-center justify-center gap-2 rounded-xl glass-item py-2 text-[11px] font-bold text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Thumbnail herunterladen
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ThumbnailPanel;
