import { useState, useCallback, useRef, useEffect } from "react";
import { ThumbnailLayer, ThumbnailProject } from "@/types/thumbnail-editor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Type,
  Square,
  Circle,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Download,
  Wand2,
  Loader2,
  RotateCcw,
  Plus,
  ChevronLeft,
  Layers,
  MousePointer,
  Move,
} from "lucide-react";

const genId = () => Math.random().toString(36).slice(2, 10);

interface ThumbnailEditorProps {
  project: ThumbnailProject;
  onBack: () => void;
}

export default function ThumbnailEditor({ project: initialProject, onBack }: ThumbnailEditorProps) {
  const [project, setProject] = useState<ThumbnailProject>(initialProject);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [dragState, setDragState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    startLayerX: number;
    startLayerY: number;
    mode: "move" | "resize";
    resizeHandle?: string;
    startW: number;
    startH: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef<HTMLCanvasElement>(null);

  const selected = project.layers.find((l) => l.id === project.selectedLayerId) ?? null;

  const selectLayer = useCallback((id: string | null) => {
    setProject((p) => ({ ...p, selectedLayerId: id }));
  }, []);

  const updateLayer = useCallback((id: string, updates: Partial<ThumbnailLayer>) => {
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  }, []);

  const addTextLayer = useCallback(() => {
    const layer: ThumbnailLayer = {
      id: genId(),
      type: "text",
      x: project.width / 2 - 150,
      y: project.height / 2 - 30,
      width: 300,
      height: 60,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: "Dein Text hier",
      fontSize: 48,
      fontFamily: "Inter",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
    };
    setProject((p) => ({
      ...p,
      layers: [...p.layers, layer],
      selectedLayerId: layer.id,
    }));
  }, [project.width, project.height]);

  const addShapeLayer = useCallback((shapeType: "rect" | "circle") => {
    const layer: ThumbnailLayer = {
      id: genId(),
      type: "shape",
      x: project.width / 2 - 50,
      y: project.height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 0.8,
      visible: true,
      locked: false,
      shapeType,
      fill: "#00BCFF",
      stroke: "transparent",
      strokeWidth: 0,
    };
    setProject((p) => ({
      ...p,
      layers: [...p.layers, layer],
      selectedLayerId: layer.id,
    }));
  }, [project.width, project.height]);

  const duplicateLayer = useCallback((id: string) => {
    setProject((p) => {
      const src = p.layers.find((l) => l.id === id);
      if (!src) return p;
      const dup = { ...src, id: genId(), x: src.x + 20, y: src.y + 20 };
      return { ...p, layers: [...p.layers, dup], selectedLayerId: dup.id };
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setProject((p) => ({
      ...p,
      layers: p.layers.filter((l) => l.id !== id),
      selectedLayerId: p.selectedLayerId === id ? null : p.selectedLayerId,
    }));
  }, []);

  const moveLayerOrder = useCallback((id: string, dir: "up" | "down") => {
    setProject((p) => {
      const idx = p.layers.findIndex((l) => l.id === id);
      if (idx < 0) return p;
      const newIdx = dir === "up" ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= p.layers.length) return p;
      const arr = [...p.layers];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...p, layers: arr };
    });
  }, []);

  // Mouse handlers for drag/resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string, mode: "move" | "resize" = "move", handle?: string) => {
      e.stopPropagation();
      const layer = project.layers.find((l) => l.id === layerId);
      if (!layer || layer.locked) return;
      selectLayer(layerId);
      setDragState({
        layerId,
        startX: e.clientX,
        startY: e.clientY,
        startLayerX: layer.x,
        startLayerY: layer.y,
        mode,
        resizeHandle: handle,
        startW: layer.width,
        startH: layer.height,
      });
    },
    [project.layers, selectLayer]
  );

  useEffect(() => {
    if (!dragState) return;
    const handleMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = project.width / rect.width;
      const scaleY = project.height / rect.height;
      const dx = (e.clientX - dragState.startX) * scaleX;
      const dy = (e.clientY - dragState.startY) * scaleY;

      if (dragState.mode === "move") {
        updateLayer(dragState.layerId, {
          x: Math.round(dragState.startLayerX + dx),
          y: Math.round(dragState.startLayerY + dy),
        });
      } else {
        const minSize = 20;
        updateLayer(dragState.layerId, {
          width: Math.max(minSize, Math.round(dragState.startW + dx)),
          height: Math.max(minSize, Math.round(dragState.startH + dy)),
        });
      }
    };
    const handleUp = () => setDragState(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, project.width, project.height, updateLayer]);

  // AI iteration
  const handleAiIterate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    try {
      // Render current state to canvas
      const dataUrl = await renderToDataUrl();
      const { data, error } = await supabase.functions.invoke("generate-thumbnails", {
        body: { action: "iterate", imageBase64: dataUrl, prompt: aiPrompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProject((p) => ({ ...p, backgroundImage: data.image, layers: [] }));
      setAiPrompt("");
      toast.success("AI-Iteration angewendet");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Fehler bei AI-Iteration");
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiPrompt]);

  // Render to data URL for export/AI
  const renderToDataUrl = useCallback(async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bg = new Image();
    bg.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      bg.onload = () => resolve();
      bg.onerror = () => resolve();
      bg.src = project.backgroundImage;
    });
    ctx.drawImage(bg, 0, 0, project.width, project.height);

    // Layers
    for (const layer of project.layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      if (layer.type === "text" && layer.text) {
        ctx.font = `${layer.fontWeight || "700"} ${layer.fontSize || 48}px ${layer.fontFamily || "Inter"}`;
        ctx.fillStyle = layer.color || "#FFFFFF";
        ctx.textAlign = (layer.textAlign as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";
        // Text shadow for readability
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(layer.text, 0, 0);
      } else if (layer.type === "shape") {
        ctx.fillStyle = layer.fill || "#00BCFF";
        if (layer.shapeType === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
      } else if (layer.type === "image" && layer.src) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((r) => {
          img.onload = () => r();
          img.onerror = () => r();
          img.src = layer.src!;
        });
        ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      }
      ctx.restore();
    }

    return canvas.toDataURL("image/png");
  }, [project]);

  const handleExport = useCallback(async () => {
    const dataUrl = await renderToDataUrl();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${project.name.replace(/\s+/g, "_")}_${project.width}x${project.height}.png`;
    a.click();
    toast.success("Thumbnail exportiert");
  }, [renderToDataUrl, project.name, project.width, project.height]);

  // Scale for preview
  const containerAspect = 16 / 9;
  const projectAspect = project.width / project.height;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 glass-elevated border-b border-border/30">
        <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5" onClick={onBack}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Zurück
        </Button>
        <span className="text-xs font-bold text-foreground">{project.name}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {project.width}×{project.height}
        </span>
        <div className="flex-1" />

        {/* Add elements */}
        <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5" onClick={addTextLayer}>
          <Type className="h-3.5 w-3.5" />
          Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs gap-1.5"
          onClick={() => addShapeLayer("rect")}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs gap-1.5"
          onClick={() => addShapeLayer("circle")}
        >
          <Circle className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-6 bg-border/40" />
        <Button size="sm" className="h-8 rounded-xl text-xs gap-1.5 glass-button-primary text-primary-foreground" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 min-w-0">
          <div
            ref={canvasRef}
            className="relative bg-muted shadow-2xl rounded-lg overflow-hidden"
            style={{
              aspectRatio: `${project.width}/${project.height}`,
              maxWidth: "100%",
              maxHeight: "100%",
              width: projectAspect >= containerAspect ? "100%" : "auto",
              height: projectAspect < containerAspect ? "100%" : "auto",
            }}
            onClick={() => selectLayer(null)}
          >
            {/* Background image */}
            <img
              src={project.backgroundImage}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Layers */}
            {project.layers.map((layer) => {
              if (!layer.visible) return null;
              const isSelected = layer.id === project.selectedLayerId;
              const pctX = (layer.x / project.width) * 100;
              const pctY = (layer.y / project.height) * 100;
              const pctW = (layer.width / project.width) * 100;
              const pctH = (layer.height / project.height) * 100;

              return (
                <div
                  key={layer.id}
                  className={`absolute cursor-move group ${isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-primary/40"}`}
                  style={{
                    left: `${pctX}%`,
                    top: `${pctY}%`,
                    width: `${pctW}%`,
                    height: `${pctH}%`,
                    opacity: layer.opacity,
                    transform: `rotate(${layer.rotation}deg)`,
                    pointerEvents: layer.locked ? "none" : "auto",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, layer.id, "move")}
                >
                  {layer.type === "text" && (
                    <div
                      className="w-full h-full flex items-center justify-center select-none"
                      style={{
                        fontSize: `${(layer.fontSize! / project.height) * 100}vh`,
                        fontFamily: layer.fontFamily,
                        fontWeight: layer.fontWeight as any,
                        color: layer.color,
                        textAlign: layer.textAlign,
                        textShadow: "2px 2px 8px rgba(0,0,0,0.5)",
                        lineHeight: 1.1,
                      }}
                    >
                      {/* Use relative font size */}
                      <span style={{ fontSize: `clamp(8px, ${pctH * 0.7}vw, 200px)` }}>
                        {layer.text}
                      </span>
                    </div>
                  )}

                  {layer.type === "shape" && layer.shapeType === "rect" && (
                    <div
                      className="w-full h-full rounded-sm"
                      style={{ backgroundColor: layer.fill, border: layer.stroke ? `${layer.strokeWidth}px solid ${layer.stroke}` : undefined }}
                    />
                  )}
                  {layer.type === "shape" && layer.shapeType === "circle" && (
                    <div
                      className="w-full h-full rounded-full"
                      style={{ backgroundColor: layer.fill }}
                    />
                  )}
                  {layer.type === "image" && (
                    <img src={layer.src} className="w-full h-full object-contain" draggable={false} />
                  )}

                  {/* Resize handle */}
                  {isSelected && !layer.locked && (
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize shadow-md border border-background"
                      onMouseDown={(e) => handleMouseDown(e, layer.id, "resize", "se")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 shrink-0 glass-elevated border-l border-border/30 flex flex-col overflow-y-auto">
          {/* Layer list */}
          <div className="p-3 border-b border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Ebenen</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {project.layers.length === 0 && (
                <p className="text-[10px] text-muted-foreground">Keine Ebenen — füge Text oder Shapes hinzu</p>
              )}
              {[...project.layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                    layer.id === project.selectedLayerId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                  onClick={() => selectLayer(layer.id)}
                >
                  {layer.type === "text" ? (
                    <Type className="h-3 w-3 shrink-0" />
                  ) : layer.type === "shape" ? (
                    layer.shapeType === "circle" ? <Circle className="h-3 w-3 shrink-0" /> : <Square className="h-3 w-3 shrink-0" />
                  ) : (
                    <MousePointer className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate flex-1">
                    {layer.type === "text" ? (layer.text?.slice(0, 20) || "Text") : layer.type === "shape" ? layer.shapeType : "Bild"}
                  </span>
                  <button
                    className="p-0.5 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                  >
                    {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Selected layer properties */}
          {selected && (
            <div className="p-3 border-b border-border/30 space-y-3">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Eigenschaften</span>

              {selected.type === "text" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Text</label>
                    <Input
                      value={selected.text || ""}
                      onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                      className="text-xs h-8 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Größe</label>
                      <Input
                        type="number"
                        value={selected.fontSize || 48}
                        onChange={(e) => updateLayer(selected.id, { fontSize: Number(e.target.value) })}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Farbe</label>
                      <input
                        type="color"
                        value={selected.color || "#FFFFFF"}
                        onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                        className="w-full h-8 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Font</label>
                    <select
                      value={selected.fontFamily || "Inter"}
                      onChange={(e) => updateLayer(selected.id, { fontFamily: e.target.value })}
                      className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Arial Black">Arial Black</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["left", "center", "right"] as const).map((align) => (
                      <Button
                        key={align}
                        variant={selected.textAlign === align ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] rounded-lg"
                        onClick={() => updateLayer(selected.id, { textAlign: align })}
                      >
                        {align === "left" ? "L" : align === "center" ? "M" : "R"}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {selected.type === "shape" && (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Füllfarbe</label>
                  <input
                    type="color"
                    value={selected.fill || "#00BCFF"}
                    onChange={(e) => updateLayer(selected.id, { fill: e.target.value })}
                    className="w-full h-8 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Common controls */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Deckkraft</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(selected.opacity * 100)}
                    onChange={(e) => updateLayer(selected.id, { opacity: Number(e.target.value) / 100 })}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Rotation</label>
                  <Input
                    type="number"
                    value={selected.rotation}
                    onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })}
                    className="text-xs h-8 rounded-lg"
                  />
                </div>
              </div>

              {/* Layer actions */}
              <div className="flex gap-1 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2" onClick={() => moveLayerOrder(selected.id, "up")}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2" onClick={() => moveLayerOrder(selected.id, "down")}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2" onClick={() => duplicateLayer(selected.id)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] rounded-lg px-2"
                  onClick={() => updateLayer(selected.id, { locked: !selected.locked })}
                >
                  {selected.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] rounded-lg px-2 text-destructive hover:text-destructive"
                  onClick={() => removeLayer(selected.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* AI Iteration */}
          <div className="p-3 mt-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">AI Iteration</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Beschreibe Änderungen und AI wendet sie auf das gesamte Thumbnail an.
            </p>
            <div className="space-y-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="z.B. 'Mach den Hintergrund dunkler'"
                className="text-xs h-8 rounded-lg"
                onKeyDown={(e) => e.key === "Enter" && handleAiIterate()}
              />
              <Button
                size="sm"
                className="w-full h-8 rounded-lg text-xs glass-button-primary text-primary-foreground gap-1.5"
                disabled={isAiProcessing || !aiPrompt.trim()}
                onClick={handleAiIterate}
              >
                {isAiProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                AI anwenden
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
