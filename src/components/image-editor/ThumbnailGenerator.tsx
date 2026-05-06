import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Sparkles, Image as ImageIcon, Check, Pencil, Clock, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ImageFile } from "@/types/image-editor";
import { ThumbnailProject } from "@/types/thumbnail-editor";

interface ThumbnailTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  style: string;
  width: number;
  height: number;
}

const TEMPLATES: ThumbnailTemplate[] = [
  { id: "yt-cinematic", title: "YouTube Cinematic", description: "Filmische Ästhetik, dramatische Beleuchtung", category: "YouTube", style: "", width: 1280, height: 720 },
  { id: "yt-editorial", title: "YouTube Editorial", description: "Magazin-Cover Layout, editorial Typografie", category: "YouTube", style: "", width: 1280, height: 720 },
  { id: "yt-minimal", title: "YouTube Minimal", description: "Reduziertes Design, starke Typografie", category: "YouTube", style: "", width: 1280, height: 720 },
  { id: "ig-editorial", title: "Instagram Editorial", description: "High-Fashion Magazin-Look", category: "Instagram", style: "", width: 1080, height: 1080 },
  { id: "ig-brand", title: "Instagram Brand", description: "Premium Brand Identity Post", category: "Instagram", style: "", width: 1080, height: 1080 },
  { id: "ig-story-premium", title: "Story Premium", description: "Elegante Story mit Glassmorphism", category: "Instagram", style: "", width: 1080, height: 1920 },
  { id: "tt-professional", title: "TikTok Professional", description: "Modernes Cover, starkes Branding", category: "TikTok", style: "", width: 1080, height: 1920 },
  { id: "li-thought-leader", title: "LinkedIn Thought Leader", description: "Authoritative Business-Visual", category: "LinkedIn", style: "", width: 1200, height: 627 },
  { id: "fb-corporate", title: "Facebook Corporate", description: "Professioneller Unternehmens-Post", category: "Facebook", style: "", width: 1200, height: 630 },
  { id: "podcast-premium", title: "Podcast Premium", description: "High-End Podcast-Cover", category: "Podcast", style: "", width: 1400, height: 1400 },
  { id: "testimonial-youtube", title: "Testimonial YouTube", description: "16:9 YouTube Testimonial Cover", category: "Testimonial", style: "", width: 1280, height: 720 },
  { id: "testimonial-instagram-portrait", title: "Testimonial Instagram 4:5", description: "4:5 Instagram Portrait Testimonial", category: "Testimonial", style: "", width: 1080, height: 1350 },
  { id: "testimonial-instagram", title: "Testimonial Instagram Post", description: "1:1 Instagram Testimonial Post", category: "Testimonial", style: "", width: 1080, height: 1080 },
  { id: "testimonial-quote", title: "Testimonial Quote", description: "Premium Kunden-Zitat mit Portrait", category: "Testimonial", style: "", width: 1080, height: 1080 },
  { id: "testimonial-story", title: "Testimonial Story", description: "Story-Format Kunden-Stimme 9:16", category: "Testimonial", style: "", width: 1080, height: 1920 },
  { id: "testimonial-landscape", title: "Testimonial Landscape", description: "Landscape Testimonial für Web/LinkedIn", category: "Testimonial", style: "", width: 1200, height: 627 },
];

const CATEGORY_COLORS: Record<string, string> = {
  YouTube: "bg-red-500/10 text-red-600 border-red-500/20",
  Instagram: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  TikTok: "bg-foreground/10 text-foreground border-foreground/20",
  LinkedIn: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Facebook: "bg-blue-600/10 text-blue-700 border-blue-600/20",
  Podcast: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Testimonial: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const ASPECT_LABELS: Record<string, string> = {
  "1280x720": "16:9",
  "1080x1080": "1:1",
  "1080x1350": "4:5",
  "1080x1920": "9:16",
  "1200x627": "1.91:1",
  "1200x630": "1.91:1",
  "1400x1400": "1:1",
};

export interface GeneratedThumbnail {
  templateId: string;
  imageUrl: string;
  template: ThumbnailTemplate;
}

interface ThumbnailGeneratorProps {
  batchImages?: ImageFile[];
  onEditThumbnail: (project: ThumbnailProject) => void;
  generated: GeneratedThumbnail[];
  onGeneratedChange: (updater: (prev: GeneratedThumbnail[]) => GeneratedThumbnail[]) => void;
}

function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ThumbnailGenerator({ batchImages = [], onEditThumbnail, generated, onGeneratedChange }: ThumbnailGeneratorProps) {
  const [customText, setCustomText] = useState("");
  const [brandColor, setBrandColor] = useState("#00BCFF");
  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialRole, setTestimonialRole] = useState("");
  const [generatingMap, setGeneratingMap] = useState<Record<string, { progress: number; elapsed: number }>>({});
  const progressIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const startProgress = useCallback((templateId: string) => {
    setGeneratingMap((prev) => ({ ...prev, [templateId]: { progress: 0, elapsed: 0 } }));
    const start = Date.now();
    progressIntervals.current[templateId] = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const progress = Math.min(95, (1 - Math.exp(-elapsed / 12)) * 100);
      setGeneratingMap((prev) => prev[templateId] ? { ...prev, [templateId]: { progress: Math.round(progress), elapsed: Math.floor(elapsed) } } : prev);
    }, 500);
  }, []);

  const stopProgress = useCallback((templateId: string) => {
    if (progressIntervals.current[templateId]) {
      clearInterval(progressIntervals.current[templateId]);
      delete progressIntervals.current[templateId];
    }
    setGeneratingMap((prev) => {
      const next = { ...prev, [templateId]: { progress: 100, elapsed: prev[templateId]?.elapsed ?? 0 } };
      setTimeout(() => setGeneratingMap((p) => { const { [templateId]: _, ...rest } = p; return rest; }), 600);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(progressIntervals.current).forEach(clearInterval);
    };
  }, []);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBatchImageId, setSelectedBatchImageId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];
  const filteredTemplates = selectedCategory
    ? TEMPLATES.filter((t) => t.category === selectedCategory)
    : TEMPLATES;

  const handleGenerate = useCallback(async (template: ThumbnailTemplate) => {
    startProgress(template.id);
    try {
      let imageBase64: string | undefined;
      if (selectedBatchImageId) {
        const batchImg = batchImages.find((i) => i.id === selectedBatchImageId);
        if (batchImg) {
          const src = batchImg.editedUrl ?? batchImg.url;
          imageBase64 = src.startsWith("data:") ? src : await urlToBase64(src);
        }
      } else if (uploadedImage) {
        imageBase64 = uploadedImage;
      }

      const isTestimonial = template.category === "Testimonial";
      const { data, error } = await supabase.functions.invoke("generate-thumbnails", {
        body: {
          action: "generate",
          templateId: template.id,
          customText: customText || undefined,
          brandColor,
          imageBase64: imageBase64 || undefined,
          testimonialName: isTestimonial ? testimonialName.trim().slice(0, 80) || undefined : undefined,
          testimonialRole: isTestimonial ? testimonialRole.trim().slice(0, 120) || undefined : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onGeneratedChange((prev) => [
        { templateId: template.id, imageUrl: data.image, template: data.template },
        ...prev,
      ]);
      toast.success(`${template.title} Thumbnail erstellt!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fehler bei der Generierung";
      toast.error(message);
    } finally {
      stopProgress(template.id);
    }
  }, [customText, brandColor, selectedBatchImageId, batchImages, uploadedImage, testimonialName, testimonialRole, startProgress, stopProgress]);

  const EXPORT_RESOLUTIONS = [
    { label: "720p", width: 1280, height: 720 },
    { label: "1080p", width: 1920, height: 1080 },
    { label: "2K", width: 2560, height: 1440 },
    { label: "4K", width: 3840, height: 2160 },
  ];

  const handleDownload = useCallback((thumbnail: GeneratedThumbnail, targetWidth?: number, targetHeight?: number) => {
    const tw = targetWidth ?? thumbnail.template.width;
    const th = targetHeight ?? thumbnail.template.height;

    // If same as source, direct download
    if (!targetWidth) {
      const a = document.createElement("a");
      a.href = thumbnail.imageUrl;
      a.download = `${thumbnail.template.title.replace(/\s+/g, "_")}_${tw}x${th}.png`;
      a.click();
      return;
    }

    // Scale to target resolution keeping aspect ratio
    const srcAspect = thumbnail.template.width / thumbnail.template.height;
    let finalW = tw;
    let finalH = Math.round(tw / srcAspect);
    if (finalH > th) {
      finalH = th;
      finalW = Math.round(th * srcAspect);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, finalW, finalH);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${thumbnail.template.title.replace(/\s+/g, "_")}_${finalW}x${finalH}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = thumbnail.imageUrl;
  }, []);

  const DownloadDropdown = ({ thumbnail, compact }: { thumbnail: GeneratedThumbnail; compact?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={compact
            ? "text-[11px] h-8 rounded-xl px-2.5"
            : "opacity-0 group-hover:opacity-100 transition-opacity text-[11px] h-8 rounded-xl"
          }
        >
          <Download className="h-3 w-3" />
          <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => handleDownload(thumbnail)} className="text-xs">
          Original ({thumbnail.template.width}×{thumbnail.template.height})
        </DropdownMenuItem>
        {EXPORT_RESOLUTIONS.map((res) => (
          <DropdownMenuItem
            key={res.label}
            onClick={() => handleDownload(thumbnail, res.width, res.height)}
            className="text-xs"
          >
            {res.label} ({res.width}×{res.height})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleEdit = useCallback((thumbnail: GeneratedThumbnail) => {
    const project: ThumbnailProject = {
      id: Math.random().toString(36).slice(2, 10),
      name: thumbnail.template.title,
      width: thumbnail.template.width,
      height: thumbnail.template.height,
      backgroundImage: thumbnail.imageUrl,
      layers: [],
      selectedLayerId: null,
    };
    onEditThumbnail(project);
  }, [onEditThumbnail]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setSelectedBatchImageId(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const selectBatchImage = useCallback((id: string) => {
    setSelectedBatchImageId((prev) => (prev === id ? null : id));
    setUploadedImage(null);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Controls */}
      <div className="glass-elevated rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Thumbnail Generator</h2>
          <span className="text-[10px] text-muted-foreground ml-1">Premium Professional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Text auf dem Thumbnail
            </label>
            <Input
              placeholder="z.B. '5 Strategien für nachhaltiges Wachstum'"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="text-xs rounded-xl h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Brand-Farbe
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-border cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="text-xs rounded-xl h-9 font-mono flex-1"
              />
            </div>
          </div>
        </div>

        {/* Batch image picker */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Bild auswählen
          </label>

          {batchImages.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {batchImages.map((img) => {
                const isSelected = selectedBatchImageId === img.id;
                const displayUrl = img.editedUrl ?? img.url;
                return (
                  <button
                    key={img.id}
                    className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-primary shadow-lg shadow-primary/30 ring-2 ring-primary/20"
                        : "border-border/50 hover:border-primary/40"
                    }`}
                    onClick={() => selectBatchImage(img.id)}
                  >
                    <img src={displayUrl} alt={img.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary-foreground drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                );
              })}
              <label className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 flex items-center justify-center cursor-pointer transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <label className="flex-1">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-border text-xs text-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {uploadedImage ? "Bild gewählt ✓" : "Bild hochladen"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {uploadedImage && (
                <Button variant="ghost" size="sm" className="text-xs h-9 rounded-xl" onClick={() => setUploadedImage(null)}>
                  ✕
                </Button>
              )}
            </div>
          )}

          {(selectedBatchImageId || uploadedImage) ? (
            <p className="text-[10px] text-primary font-medium">
              ✓ Bild wird als Basis für die Thumbnail-Generierung verwendet
            </p>
          ) : (
            <p className="text-[10px] text-destructive font-medium">
              ⚠ Bitte wähle ein Bild aus, bevor du ein Thumbnail generierst
            </p>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          className="text-xs rounded-xl h-7 px-3"
          onClick={() => setSelectedCategory(null)}
        >
          Alle
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-xl h-7 px-3"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredTemplates.map((template) => {
          const existingResult = generated.find((g) => g.templateId === template.id);
          const genState = generatingMap[template.id];
          const isLoading = !!genState;
          const progress = genState?.progress ?? 0;
          const elapsed = genState?.elapsed ?? 0;
          const aspectKey = `${template.width}x${template.height}`;
          const aspectLabel = ASPECT_LABELS[aspectKey] || "";
          const catColor = CATEGORY_COLORS[template.category] || "bg-muted text-foreground";

          return (
            <div key={template.id} className="glass-elevated rounded-2xl overflow-hidden group transition-all hover:shadow-lg">
              <div
                className="relative bg-muted/30 flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: `${template.width}/${template.height}`, maxHeight: 220 }}
              >
                {existingResult ? (
                  <img src={existingResult.imageUrl} alt={template.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[10px] font-medium tabular-nums">{template.width}×{template.height}</span>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 w-3/4 max-w-[200px]">
                      <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                      <Progress value={progress} className="h-2 w-full" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-foreground tabular-nums">
                          {elapsed}s — {progress < 50 ? "AI generiert..." : progress < 80 ? "Feinschliff..." : "Fast fertig..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{template.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{template.description}</p>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${catColor}`}>
                    {aspectLabel}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 text-[11px] h-8 rounded-xl glass-button-primary text-primary-foreground"
                    disabled={isLoading || (!selectedBatchImageId && !uploadedImage)}
                    onClick={() => handleGenerate(template)}
                    title={!selectedBatchImageId && !uploadedImage ? "Bitte zuerst ein Bild auswählen" : undefined}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generieren
                      </>
                    )}
                  </Button>
                  {existingResult && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] h-8 rounded-xl px-2.5"
                        onClick={() => handleEdit(existingResult)}
                        title="Im Editor bearbeiten"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <DownloadDropdown thumbnail={existingResult} compact />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated results gallery */}
      {generated.length > 0 && (
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-bold text-foreground">Generierte Thumbnails</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {generated.map((thumb, i) => (
              <div key={i} className="glass-elevated rounded-xl overflow-hidden group">
                <div className="relative">
                  <img
                    src={thumb.imageUrl}
                    alt={thumb.template.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: `${thumb.template.width}/${thumb.template.height}` }}
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] h-8 rounded-xl glass-button-primary text-primary-foreground"
                      onClick={() => handleEdit(thumb)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Bearbeiten
                    </Button>
                    <DownloadDropdown thumbnail={thumb} />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-medium text-foreground">{thumb.template.title}</p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">
                    {thumb.template.width}×{thumb.template.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
