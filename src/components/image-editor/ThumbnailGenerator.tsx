import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  Download,
  Sparkles,
  Image as ImageIcon,
  Pencil,
  Clock,
  ChevronDown,
  X,
  Coffee,
  Mic,
  Cpu,
  Type,
  Feather,
  Minus,
  Eye,
  LayoutGrid,
  Frame,
  Zap,
  Boxes,
  Radio,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ImageFile } from "@/types/image-editor";
import { ThumbnailProject } from "@/types/thumbnail-editor";

type VlogStyle = "lifestyle" | "podcast" | "tech";
type TextStyle = "serif" | "modern" | "none";
type PodcastStyle =
  | "clean-cutout"
  | "bold-hero"
  | "punchy-reaction"
  | "tools-showcase"
  | "podcast-frame"
  | "cinematic-portrait";

import podcastPreviewCleanCutout from "@/assets/podcast-style-clean-cutout.jpg";
import podcastPreviewBoldHero from "@/assets/podcast-style-bold-hero.jpg";
import podcastPreviewPunchyReaction from "@/assets/podcast-style-punchy-reaction.jpg";
import podcastPreviewToolsShowcase from "@/assets/podcast-style-tools-showcase.jpg";
import podcastPreviewPodcastFrame from "@/assets/podcast-style-podcast-frame.jpg";
import podcastPreviewCinematicPortrait from "@/assets/podcast-style-cinematic-portrait.jpg";

const VLOG_OPTIONS: { id: VlogStyle; label: string; sub: string; icon: typeof Coffee }[] = [
  { id: "lifestyle", label: "Lifestyle", sub: "Daily Vlog · warm · cozy", icon: Coffee },
  { id: "podcast", label: "Podcast", sub: "Interview · premium · brand", icon: Mic },
  { id: "tech", label: "Tech / Business", sub: "Modern · clean · premium", icon: Cpu },
];

const PODCAST_OPTIONS: { id: PodcastStyle; label: string; sub: string; icon: typeof LayoutGrid; preview: string }[] = [
  { id: "clean-cutout", label: "Clean Cutout", sub: "Editorial · LinkedIn-style · grid bg", icon: LayoutGrid, preview: podcastPreviewCleanCutout },
  { id: "bold-hero", label: "Bold Hero", sub: "Centered · UI frames · keynote", icon: Frame, preview: podcastPreviewBoldHero },
  { id: "punchy-reaction", label: "Punchy Reaction", sub: "Big white type · icon-letter", icon: Zap, preview: podcastPreviewPunchyReaction },
  { id: "tools-showcase", label: "AI Tools Showcase", sub: "Glass app icons · laptop glow", icon: Boxes, preview: podcastPreviewToolsShowcase },
  { id: "podcast-frame", label: "Show Frame", sub: "Brand gradient · italic accent", icon: Radio, preview: podcastPreviewPodcastFrame },
  { id: "cinematic-portrait", label: "Cinematic Portrait", sub: "Vanity Fair · moody · prestige", icon: Feather, preview: podcastPreviewCinematicPortrait },
];

const TEXT_OPTIONS: { id: TextStyle; label: string; sub: string; icon: typeof Type }[] = [
  { id: "serif", label: "Cinematic Serif", sub: "Magazine-cover · filmic", icon: Feather },
  { id: "modern", label: "Modern Clean", sub: "Apple-keynote · sleek", icon: Sparkles },
  { id: "none", label: "Kein Text", sub: "Pure cinematic frame", icon: Minus },
];

export interface GeneratedThumbnail {
  templateId: string;
  imageUrl: string;
  template: {
    id: string;
    title: string;
    description: string;
    category: string;
    style: string;
    width: number;
    height: number;
  };
}

interface ThumbnailGeneratorProps {
  batchImages?: ImageFile[];
  onEditThumbnail: (project: ThumbnailProject) => void;
  generated: GeneratedThumbnail[];
  onGeneratedChange: (updater: (prev: GeneratedThumbnail[]) => GeneratedThumbnail[]) => void;
}

function imageSourceToOptimizedBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxLongEdge = 1400;
      const scale = Math.min(1, maxLongEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Foto konnte nicht vorbereitet werden"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error ?? new Error("Foto konnte nicht gelesen werden"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

const EXPORT_RESOLUTIONS = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "2K", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
];

export default function ThumbnailGenerator({
  batchImages = [],
  onEditThumbnail,
  generated,
  onGeneratedChange,
}: ThumbnailGeneratorProps) {
  const [vlogStyle, setVlogStyle] = useState<VlogStyle>("lifestyle");
  const [textStyle, setTextStyle] = useState<TextStyle>("serif");
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState(false);
  const [titleKeywords, setTitleKeywords] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#00BCFF");
  const [enforceApexCI, setEnforceApexCI] = useState(false);
  const [variants, setVariants] = useState(2);
  const [podcastStyles, setPodcastStyles] = useState<PodcastStyle[]>(["clean-cutout", "podcast-frame"]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedBatchImageId, setSelectedBatchImageId] = useState<string | null>(null);
  const [referenceStyleImage, setReferenceStyleImage] = useState<string | null>(null);
  const [referenceYoutubeUrl, setReferenceYoutubeUrl] = useState("");
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = useCallback(() => {
    setProgress(0);
    setElapsed(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const e = (Date.now() - start) / 1000;
      const p = Math.min(95, (1 - Math.exp(-e / 18)) * 100);
      setElapsed(Math.floor(e));
      setProgress(Math.round(p));
    }, 400);
  }, []);

  const stopProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setProgress(0);
      setElapsed(0);
    }, 600);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    imageSourceToOptimizedBase64(objectUrl)
      .then((optimized) => {
        setUploadedImage(optimized);
        setSelectedBatchImageId(null);
      })
      .catch(() => toast.error("Foto konnte nicht vorbereitet werden"))
      .finally(() => {
        URL.revokeObjectURL(objectUrl);
        e.target.value = "";
      });
  }, []);

  useEffect(() => {
    if (variants > 6) setVariants(6);
    if (variants < 1) setVariants(1);
  }, [variants]);

  const selectBatchImage = useCallback((id: string) => {
    setSelectedBatchImageId((prev) => (prev === id ? null : id));
    setUploadedImage(null);
  }, []);

  const activeImageBase64 = useCallback(async (): Promise<string | undefined> => {
    if (uploadedImage) return uploadedImage;
    if (selectedBatchImageId) {
      const img = batchImages.find((i) => i.id === selectedBatchImageId);
      if (img) {
        const src = img.editedUrl ?? img.url;
        return imageSourceToOptimizedBase64(src);
      }
    }
    return undefined;
  }, [uploadedImage, selectedBatchImageId, batchImages]);

  const togglePodcastStyle = useCallback((id: PodcastStyle) => {
    setPodcastStyles((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 6) {
        toast.info("Maximal 6 Podcast-Stile gleichzeitig");
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    imageSourceToOptimizedBase64(objectUrl)
      .then((optimized) => {
        setReferenceStyleImage(optimized);
        setReferenceYoutubeUrl("");
        toast.success("Referenz-Thumbnail geladen");
      })
      .catch(() => toast.error("Referenz konnte nicht geladen werden"))
      .finally(() => {
        URL.revokeObjectURL(objectUrl);
        e.target.value = "";
      });
  }, []);

  const loadYoutubeReference = useCallback(async () => {
    const url = referenceYoutubeUrl.trim();
    if (!url) return;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    const id = match?.[1];
    if (!id) {
      toast.error("Keine gültige YouTube-URL");
      return;
    }
    setIsLoadingYoutube(true);
    try {
      // Try maxres first, fallback to hq
      const tryUrls = [
        `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      ];
      let base64: string | null = null;
      for (const u of tryUrls) {
        try {
          const b64 = await imageSourceToOptimizedBase64(u);
          base64 = b64;
          break;
        } catch {
          // try next
        }
      }
      if (!base64) throw new Error("Thumbnail nicht gefunden");
      setReferenceStyleImage(base64);
      toast.success("YouTube-Thumbnail als Referenz geladen");
    } catch {
      toast.error("YouTube-Thumbnail konnte nicht geladen werden");
    } finally {
      setIsLoadingYoutube(false);
    }
  }, [referenceYoutubeUrl]);

  const clearReference = useCallback(() => {
    setReferenceStyleImage(null);
    setReferenceYoutubeUrl("");
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    startProgress();
    try {
      const imageBase64 = await activeImageBase64();
      const isPodcast = vlogStyle === "podcast";
      const requestedVariants = Math.min(Math.max(variants, 1), 6);
      const { data, error } = await supabase.functions.invoke("generate-thumbnails", {
        body: {
          action: "generate",
          vlogStyle,
          textStyle,
          title: autoTitle ? undefined : (title.trim().slice(0, 100) || undefined),
          autoTitle: autoTitle && titleKeywords.trim().length > 0,
          titleKeywords: autoTitle ? titleKeywords.trim().slice(0, 300) : undefined,
          sceneDescription: sceneDescription.trim().slice(0, 500) || undefined,
          brandColor: enforceApexCI ? "#00BCFF" : brandColor,
          enforceApexCI,
          imageBase64,
          variants: requestedVariants,
          podcastStyles: isPodcast ? podcastStyles : undefined,
          referenceStyleBase64: referenceStyleImage ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newThumbs: GeneratedThumbnail[] = (data.images as string[]).map((url, idx) => ({
        templateId: `${data.template.id}-${Date.now()}-${idx}`,
        imageUrl: url,
        template: data.template,
      }));
      onGeneratedChange((prev) => [...newThumbs, ...prev]);
        toast.success(`${newThumbs.length} cinematic Thumbnails generiert!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler bei der Generierung");
    } finally {
      stopProgress();
      setIsGenerating(false);
    }
  }, [vlogStyle, textStyle, title, autoTitle, titleKeywords, sceneDescription, brandColor, enforceApexCI, variants, podcastStyles, referenceStyleImage, activeImageBase64, onGeneratedChange, startProgress, stopProgress]);

  const handleDownload = useCallback((thumb: GeneratedThumbnail, targetWidth?: number, targetHeight?: number) => {
    const tw = targetWidth ?? thumb.template.width;
    const th = targetHeight ?? thumb.template.height;
    if (!targetWidth) {
      const a = document.createElement("a");
      a.href = thumb.imageUrl;
      a.download = `vlog_thumbnail_${tw}x${th}.png`;
      a.click();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vlog_thumbnail_${tw}x${th}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = thumb.imageUrl;
  }, []);

  const handleEdit = useCallback(
    (thumb: GeneratedThumbnail) => {
      const project: ThumbnailProject = {
        id: Math.random().toString(36).slice(2, 10),
        name: thumb.template.title,
        width: thumb.template.width,
        height: thumb.template.height,
        backgroundImage: thumb.imageUrl,
        layers: [],
        selectedLayerId: null,
      };
      onEditThumbnail(project);
    },
    [onEditThumbnail]
  );

  const hasSubject = !!uploadedImage || !!selectedBatchImageId;

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Hero / Controls */}
      <div className="glass-elevated rounded-3xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl glass-button-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">APEX Thumbnail Studio</h2>
            <p className="text-[11px] text-muted-foreground">Cinematic Vlog- & Podcast-Thumbnails per AI</p>
          </div>
        </div>

        {/* Vlog Style */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Content-Typ
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VLOG_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = vlogStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setVlogStyle(opt.id)}
                  className={`relative text-left p-3 rounded-2xl border transition-all ${
                    active
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                      : "border-border/50 hover:border-primary/40 bg-background/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className={`text-xs font-bold ${active ? "text-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Podcast sub-styles (multiselect 1-6) */}
        {vlogStyle === "podcast" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Podcast-Stile · Wähle 1–6 (inspiriert von Top-Creators)
              </label>
              <span className="text-[10px] font-bold text-primary tabular-nums">
                {podcastStyles.length} ausgewählt
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PODCAST_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = podcastStyles.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => togglePodcastStyle(opt.id)}
                    className={`group relative text-left rounded-2xl border overflow-hidden transition-all ${
                      active
                        ? "border-primary shadow-md shadow-primary/30 ring-2 ring-primary/40"
                        : "border-border/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="relative aspect-video bg-muted/40 overflow-hidden">
                      <img
                        src={opt.preview}
                        alt={`${opt.label} preview`}
                        loading="lazy"
                        width={896}
                        height={512}
                        className={`w-full h-full object-cover transition-transform ${active ? "scale-105" : "group-hover:scale-105"}`}
                      />
                      <div className={`absolute inset-0 transition-colors ${active ? "bg-primary/10" : "bg-foreground/0 group-hover:bg-foreground/10"}`} />
                      {active && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-background/60 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-[11px] font-bold text-foreground truncate">{opt.label}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{opt.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pro ausgewähltem Stil wird genau 1 Thumbnail in diesem exakten Look generiert.
            </p>
          </div>
        )}

        {/* Custom reference (own thumbnail upload OR YouTube URL) */}
        <div className="space-y-2 rounded-2xl border border-dashed border-border/60 p-3 bg-background/30">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Eigene Referenz (überschreibt Stil-Auswahl)
            </label>
            {referenceStyleImage && (
              <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[10px]" onClick={clearReference}>
                <X className="h-3 w-3 mr-1" /> Entfernen
              </Button>
            )}
          </div>

          {referenceStyleImage ? (
            <div className="flex items-center gap-3">
              <img
                src={referenceStyleImage}
                alt="Style reference"
                className="w-28 h-16 rounded-xl object-cover border border-primary/60 shadow-md shadow-primary/20"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-foreground">Referenz aktiv ✓</div>
                <div className="text-[10px] text-muted-foreground">
                  Die AI emuliert Komposition, Typografie & Farb-Grade dieser Vorlage. Dein Gesicht bleibt 1:1.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-accent/50 hover:border-primary/40 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Eigenes Thumbnail hochladen
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={referenceYoutubeUrl}
                  onChange={(e) => setReferenceYoutubeUrl(e.target.value)}
                  placeholder="YouTube-Link einfügen…"
                  className="text-xs rounded-xl h-10 flex-1"
                  disabled={isLoadingYoutube}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      loadYoutubeReference();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-3 text-[11px]"
                  onClick={loadYoutubeReference}
                  disabled={isLoadingYoutube || !referenceYoutubeUrl.trim()}
                >
                  {isLoadingYoutube ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Laden"}
                </Button>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Optional — wenn gesetzt, ignoriert die AI die Stil-Auswahl oben und orientiert sich an deiner Vorlage.
          </p>
        </div>





        {/* Text Style */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Titel-Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = textStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTextStyle(opt.id)}
                  className={`relative text-left p-3 rounded-2xl border transition-all ${
                    active
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                      : "border-border/50 hover:border-primary/40 bg-background/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-xs font-bold text-foreground">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title + Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {autoTitle ? "Keywords (AI schreibt Titel)" : "Titel auf dem Thumbnail"}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoTitle}
                  onChange={(e) => setAutoTitle(e.target.checked)}
                  disabled={textStyle === "none"}
                  className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                />
                <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  AI-Titel
                </span>
              </label>
            </div>
            {autoTitle ? (
              <Input
                placeholder="z.B. 'AI Agents 2026, Startup, ChatGPT, Productivity'"
                value={titleKeywords}
                onChange={(e) => setTitleKeywords(e.target.value)}
                maxLength={300}
                className="text-xs rounded-xl h-10"
                disabled={textStyle === "none"}
              />
            ) : (
              <Input
                placeholder="z.B. '24h ALLEIN IN TOKIO' oder '1 Jahr Daily Vlog' (leer = ohne Text)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="text-xs rounded-xl h-10"
                disabled={textStyle === "none"}
              />
            )}
            {autoTitle && (
              <p className="text-[10px] text-muted-foreground">
                Beschreibe Thema in 3–8 Stichworten — die AI generiert einen scroll-stoppenden Titel im gewählten Stil.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Akzent-Farbe
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={enforceApexCI ? "#00BCFF" : brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={enforceApexCI}
                className="w-10 h-10 rounded-xl border border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Input
                value={enforceApexCI ? "#00BCFF" : brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={enforceApexCI}
                className="text-xs rounded-xl h-10 font-mono flex-1"
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={enforceApexCI}
                onChange={(e) => setEnforceApexCI(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
              />
              <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
                Full APEX CI erzwingen
              </span>
            </label>
            {enforceApexCI && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                APEX Blue #00BCFF, Deep Ocean, Slate Steel, Frost White — strikte Markenpalette &amp; Typografie.
              </p>
            )}
          </div>
        </div>



        {/* Scene description (optional) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Szene / Kontext (optional)
          </label>
          <Textarea
            placeholder="Beschreibe Setting, Stimmung, Story-Kontext... z.B. 'Sonnenuntergang am Strand in Bali, ich mit Kamera in der Hand, Motorrad im Hintergrund'"
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className="text-xs rounded-xl resize-none"
          />
        </div>

        {/* Subject image */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Foto der Person(en) im Thumbnail (optional — reicht ein Portrait/Selfie der Personen, die erscheinen sollen)
          </label>

          {batchImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {batchImages.map((img) => {
                const isSelected = selectedBatchImageId === img.id;
                const displayUrl = img.editedUrl ?? img.url;
                return (
                  <button
                    key={img.id}
                    className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-primary shadow-lg shadow-primary/30"
                        : "border-border/50 hover:border-primary/40"
                    }`}
                    onClick={() => selectBatchImage(img.id)}
                  >
                    <img src={displayUrl} alt={img.name} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 items-center">
            {uploadedImage ? (
              <div className="flex items-center gap-2 flex-1">
                <img src={uploadedImage} alt="Subject" className="w-12 h-12 rounded-xl object-cover border border-border" />
                <span className="text-xs text-foreground font-medium flex-1">Foto hochgeladen ✓</span>
                <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={() => setUploadedImage(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex-1">
                <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:bg-accent/50 hover:border-primary/40 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Portrait / Selfie hochladen — nur die Person(en) im Bild reicht
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {hasSubject
              ? "✓ Gesicht/Person bleibt 1:1 erhalten, Szene wird im gewählten Stil neu komponiert"
              : "→ Ohne Foto generiert die AI eine komplett neue Szene mit fiktiver Person"}
          </p>
        </div>

        <div className="space-y-2">
          {(() => {
            const isPodcastBatch = vlogStyle === "podcast" && podcastStyles.length > 0;
            const total = isPodcastBatch ? variants * podcastStyles.length : variants;
            return (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {isPodcastBatch ? `Bilder pro Stil (× ${podcastStyles.length} Stile)` : "Varianten pro Generierung"}
                  </label>
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {isPodcastBatch ? `${variants} → ${total} gesamt` : total}
                  </span>
                </div>
                <Slider
                  value={[variants]}
                  min={1}
                  max={6}
                  step={1}
                  onValueChange={(v) => setVariants(v[0])}
                  disabled={isGenerating}
                />
                <p className="text-[10px] text-muted-foreground">
                  {isPodcastBatch
                    ? `Slider = Bilder pro Stil. ${variants} × ${podcastStyles.length} Stil${podcastStyles.length > 1 ? "e" : ""} = ${total} Bilder gesamt`
                    : `${total} Bild${total > 1 ? "er" : ""} parallel`}
                </p>
              </>
            );
          })()}
        </div>


        {/* Generate button */}
        <div className="space-y-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full h-12 rounded-2xl glass-button-primary text-primary-foreground text-sm font-bold gap-2"
          >
            {(() => {
              const count = variants;
              return isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {count} Cinematic Thumbnails generieren...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {count} Cinematic Thumbnails generieren
                </>
              );
            })()}
          </Button>
          {isGenerating && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {elapsed}s — {progress < 40 ? "AI generiert..." : progress < 80 ? "Cinematic feinschliff..." : "Fast fertig..."}
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated gallery */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Generierte Thumbnails ({generated.length})</h3>
            {generated.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 rounded-xl text-muted-foreground"
                onClick={() => onGeneratedChange(() => [])}
              >
                Alle löschen
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {generated.map((thumb) => (
              <div
                key={thumb.templateId}
                className="glass-elevated rounded-2xl overflow-hidden group transition-all hover:shadow-xl hover:shadow-primary/10"
              >
                <button
                  type="button"
                  onClick={() => setPreviewUrl(thumb.imageUrl)}
                  className="block w-full relative bg-muted/30 overflow-hidden cursor-zoom-in"
                  style={{ aspectRatio: "16/9" }}
                >
                  <img
                    src={thumb.imageUrl}
                    alt="Vlog thumbnail"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
                  </div>
                </button>
                <div className="p-2.5 flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-[11px] h-8 rounded-xl gap-1"
                    onClick={() => handleEdit(thumb)}
                  >
                    <Pencil className="h-3 w-3" />
                    Bearbeiten
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="text-[11px] h-8 rounded-xl glass-button-primary text-primary-foreground px-2.5 gap-1">
                        <Download className="h-3 w-3" />
                        <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      <DropdownMenuItem onClick={() => handleDownload(thumb)} className="text-xs">
                        Original (1280×720)
                      </DropdownMenuItem>
                      {EXPORT_RESOLUTIONS.map((res) => (
                        <DropdownMenuItem
                          key={res.label}
                          onClick={() => handleDownload(thumb, res.width, res.height)}
                          className="text-xs"
                        >
                          {res.label} ({res.width}×{res.height})
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {generated.length === 0 && !isGenerating && (
        <div className="flex-1 flex items-center justify-center text-center py-12">
          <div className="space-y-2 max-w-sm">
            <div className="w-14 h-14 rounded-2xl glass-elevated flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Noch keine Thumbnails</h3>
            <p className="text-xs text-muted-foreground">
              Wähle Stil & Titel, dann generiere cinematic Vlog- oder Podcast-Thumbnails in einem Klick.
            </p>
          </div>
        </div>
      )}

      {/* Lightbox preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl glass-elevated flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
