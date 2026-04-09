import { useState, useCallback } from "react";
import { ImageFile, EditorState, CropPreset } from "@/types/image-editor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const generateId = () => Math.random().toString(36).slice(2, 10);

function loadImage(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
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

export function useImageEditor() {
  const [state, setState] = useState<EditorState>({
    images: [],
    selectedIds: [],
    activeId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    activeTool: "select",
    cropPreset: null,
    customPrompt: "",
  });

  const addImages = useCallback(async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Keine gültigen Bilddateien gefunden");
      return;
    }

    const newImages: ImageFile[] = [];
    for (const file of validFiles) {
      try {
        const { url, width, height } = await loadImage(file);
        newImages.push({
          id: generateId(),
          file,
          name: file.name,
          url,
          originalWidth: width,
          originalHeight: height,
          width,
          height,
          hasBgRemoved: false,
          isProcessing: false,
        });
      } catch {
        toast.error(`Konnte ${file.name} nicht laden`);
      }
    }

    setState((prev) => {
      const images = [...prev.images, ...newImages];
      return {
        ...prev,
        images,
        activeId: prev.activeId ?? newImages[0]?.id ?? null,
        selectedIds: prev.selectedIds.length === 0 ? [newImages[0]?.id].filter(Boolean) : prev.selectedIds,
      };
    });

    toast.success(`${newImages.length} Bild(er) hinzugefügt`);
  }, []);

  const removeImage = useCallback((id: string) => {
    setState((prev) => {
      const images = prev.images.filter((img) => img.id !== id);
      const selectedIds = prev.selectedIds.filter((sid) => sid !== id);
      const activeId = prev.activeId === id ? (images[0]?.id ?? null) : prev.activeId;
      return { ...prev, images, selectedIds, activeId };
    });
  }, []);

  const setActiveImage = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id, selectedIds: [id] }));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setState((prev) => {
      const isSelected = prev.selectedIds.includes(id);
      const selectedIds = isSelected
        ? prev.selectedIds.filter((sid) => sid !== id)
        : [...prev.selectedIds, id];
      return { ...prev, selectedIds, activeId: id };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIds: prev.images.map((img) => img.id),
    }));
  }, []);

  const setTool = useCallback((tool: EditorState["activeTool"]) => {
    setState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  const setCropPreset = useCallback((preset: CropPreset | null) => {
    setState((prev) => ({ ...prev, cropPreset: preset }));
  }, []);

  const setCustomPrompt = useCallback((prompt: string) => {
    setState((prev) => ({ ...prev, customPrompt: prompt }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(5, zoom)) }));
  }, []);

  const aiEdit = useCallback(async (action: string, targetIds?: string[]) => {
    const ids = targetIds ?? state.selectedIds;
    if (ids.length === 0) {
      toast.error("Keine Bilder ausgewählt");
      return;
    }

    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        ids.includes(img.id) ? { ...img, isProcessing: true, error: undefined } : img
      ),
    }));

    for (const id of ids) {
      const img = state.images.find((i) => i.id === id);
      if (!img) continue;

      try {
        const sourceUrl = img.editedUrl ?? img.url;
        const base64 = sourceUrl.startsWith("data:") ? sourceUrl : await urlToBase64(sourceUrl);

        const { data, error } = await supabase.functions.invoke("ai-image-edit", {
          body: {
            action,
            imageBase64: base64,
            prompt: action === "custom-prompt" ? state.customPrompt : undefined,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const isBgRemove = action === "remove-background";

        setState((prev) => ({
          ...prev,
          images: prev.images.map((i) =>
            i.id === id
              ? {
                  ...i,
                  editedUrl: data.editedImage,
                  isProcessing: false,
                  hasBgRemoved: isBgRemove ? true : i.hasBgRemoved,
                }
              : i
          ),
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fehler bei der Bildbearbeitung";
        toast.error(`${img.name}: ${message}`);
        setState((prev) => ({
          ...prev,
          images: prev.images.map((i) =>
            i.id === id ? { ...i, isProcessing: false, error: message } : i
          ),
        }));
      }
    }

    toast.success("AI-Bearbeitung abgeschlossen");
  }, [state.selectedIds, state.images, state.customPrompt]);

  // IMPORTANT: Crop always from the ORIGINAL image so switching presets doesn't compound
  const cropImage = useCallback(async (id: string, preset: CropPreset, offsetX?: number, offsetY?: number) => {
    const img = state.images.find((i) => i.id === id);
    if (!img) return;

    // Always crop from original
    const sourceUrl = img.url;
    const image = new Image();
    image.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = sourceUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext("2d")!;

    const srcRatio = image.naturalWidth / image.naturalHeight;
    const dstRatio = preset.width / preset.height;
    let sw: number, sh: number;

    if (srcRatio > dstRatio) {
      sh = image.naturalHeight;
      sw = sh * dstRatio;
    } else {
      sw = image.naturalWidth;
      sh = sw / dstRatio;
    }

    // Use provided offsets or default to center
    const sx = offsetX ?? (image.naturalWidth - sw) / 2;
    const sy = offsetY ?? (image.naturalHeight - sh) / 2;

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, preset.width, preset.height);
    const editedUrl = canvas.toDataURL("image/png");

    setState((prev) => ({
      ...prev,
      images: prev.images.map((i) =>
        i.id === id ? { ...i, editedUrl, width: preset.width, height: preset.height } : i
      ),
      cropPreset: null,
    }));

    toast.success(`Zugeschnitten auf ${preset.label}`);
  }, [state.images]);

  const batchCrop = useCallback(async (preset: CropPreset) => {
    for (const id of state.selectedIds) {
      await cropImage(id, preset);
    }
  }, [state.selectedIds, cropImage]);

  const downloadImage = useCallback(async (id: string) => {
    const img = state.images.find((i) => i.id === id);
    if (!img) return;

    const url = img.editedUrl ?? img.url;
    const baseName = img.name.replace(/\.[^.]+$/, "");
    const ext = img.hasBgRemoved ? "png" : "jpg";
    const filename = `${baseName}_edited.${ext}`;

    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    }
  }, [state.images]);

  const downloadAll = useCallback(async () => {
    for (const img of state.images) {
      const url = img.editedUrl ?? img.url;
      const baseName = img.name.replace(/\.[^.]+$/, "");
      const ext = img.hasBgRemoved ? "png" : "jpg";
      const filename = `${baseName}_edited.${ext}`;

      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
    }
  }, [state.images]);

  const resetImage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((i) =>
        i.id === id
          ? {
              ...i,
              editedUrl: undefined,
              error: undefined,
              hasBgRemoved: false,
              width: i.originalWidth,
              height: i.originalHeight,
            }
          : i
      ),
    }));
  }, []);

  const activeImage = state.images.find((i) => i.id === state.activeId) ?? null;

  return {
    state,
    activeImage,
    addImages,
    removeImage,
    setActiveImage,
    toggleSelect,
    selectAll,
    setTool,
    setCropPreset,
    setCustomPrompt,
    setZoom,
    aiEdit,
    cropImage,
    batchCrop,
    downloadImage,
    downloadAll,
    resetImage,
  };
}
