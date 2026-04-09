import { useCallback, useRef, useState } from "react";
import { useImageEditor } from "@/hooks/use-image-editor";
import Toolbar from "@/components/image-editor/Toolbar";
import Canvas from "@/components/image-editor/Canvas";
import PropertiesPanel from "@/components/image-editor/PropertiesPanel";
import BatchStrip from "@/components/image-editor/BatchStrip";
import UploadZone from "@/components/image-editor/UploadZone";
import ThumbnailGenerator from "@/components/image-editor/ThumbnailGenerator";
import ThumbnailEditor from "@/components/image-editor/ThumbnailEditor";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings2, Wand2, LayoutGrid, Pencil } from "lucide-react";
import { ThumbnailProject } from "@/types/thumbnail-editor";

type AppTab = "editor" | "thumbnails" | "thumb-editor";

const Index = () => {
  const {
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
  } = useImageEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("editor");
  const [thumbProject, setThumbProject] = useState<ThumbnailProject | null>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addImages(Array.from(e.target.files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addImages]
  );

  const handleEditThumbnail = useCallback((project: ThumbnailProject) => {
    setThumbProject(project);
    setActiveTab("thumb-editor");
  }, []);

  const hasImages = state.images.length > 0;
  const showProps = state.activeTool !== "select";

  const propertiesContent = (
    <PropertiesPanel
      activeTool={state.activeTool}
      activeImage={activeImage}
      selectedCount={state.selectedIds.length}
      customPrompt={state.customPrompt}
      onCustomPromptChange={setCustomPrompt}
      onAiEdit={(action) => aiEdit(action)}
      onCrop={(preset) => {
        if (activeImage) setCropPreset(preset);
      }}
      onBatchCrop={batchCrop}
      onDownload={() => activeImage && downloadImage(activeImage.id)}
      onSelectAll={selectAll}
    />
  );

  return (
    <div
      className="h-screen flex flex-col mesh-gradient overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (activeTab !== "editor") return;
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length > 0) addImages(files);
      }}
    >
      {/* Header */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 sm:px-4 glass-elevated rounded-none border-b border-border/30 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg glass-button-primary flex items-center justify-center">
              <span className="text-xs font-black text-primary-foreground">A</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight hidden sm:block">
              APEX AI Image Intelligence
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/50">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === "editor"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("editor")}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Editor
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === "thumbnails"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("thumbnails")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Thumbnails
            </button>
            {thumbProject && (
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === "thumb-editor"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("thumb-editor")}
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "editor" && hasImages && (
            <Sheet open={propsOpen} onOpenChange={setPropsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:hidden rounded-xl"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0 overflow-y-auto">
                <div className="p-4">{propertiesContent}</div>
              </SheetContent>
            </Sheet>
          )}
          <span className="text-[10px] text-muted-foreground font-medium hidden sm:block">
            Powered by APEX AI Tech
          </span>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Thumbnail Editor Tab */}
      {activeTab === "thumb-editor" && thumbProject && (
        <ThumbnailEditor
          project={thumbProject}
          onBack={() => setActiveTab("thumbnails")}
        />
      )}

      {/* Thumbnail Generator Tab */}
      {activeTab === "thumbnails" && (
        <ThumbnailGenerator
          batchImages={state.images}
          onEditThumbnail={handleEditThumbnail}
        />
      )}

      {/* Editor Tab */}
      {activeTab === "editor" && (
        <>
          {!hasImages ? (
            <UploadZone onFiles={addImages} />
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row gap-1.5 sm:gap-2 p-1.5 sm:p-2 min-h-0 relative">
              <div className="sm:hidden">
                <div className="flex items-center gap-1 p-1.5 glass-elevated rounded-xl overflow-x-auto">
                  <Toolbar
                    activeTool={state.activeTool}
                    onToolChange={setTool}
                    onUpload={handleUploadClick}
                    onDownload={downloadAll}
                    onReset={() => activeImage && resetImage(activeImage.id)}
                    hasImages={hasImages}
                    hasActiveImage={!!activeImage}
                    horizontal
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <Toolbar
                  activeTool={state.activeTool}
                  onToolChange={setTool}
                  onUpload={handleUploadClick}
                  onDownload={downloadAll}
                  onReset={() => activeImage && resetImage(activeImage.id)}
                  hasImages={hasImages}
                  hasActiveImage={!!activeImage}
                />
              </div>

              <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0 min-h-0 relative">
                <Canvas
                  image={activeImage}
                  zoom={state.zoom}
                  onZoomChange={setZoom}
                  onDownload={() => activeImage && downloadImage(activeImage.id)}
                  onReset={() => activeImage && resetImage(activeImage.id)}
                  cropPreset={state.cropPreset}
                  onCropConfirm={(ox, oy) => {
                    if (activeImage && state.cropPreset) {
                      cropImage(activeImage.id, state.cropPreset, ox, oy);
                    }
                  }}
                  onCropCancel={() => setCropPreset(null)}
                />
                <BatchStrip
                  images={state.images}
                  activeId={state.activeId}
                  selectedIds={state.selectedIds}
                  onSelect={setActiveImage}
                  onToggleSelect={toggleSelect}
                  onRemove={removeImage}
                />

                {showProps && (
                  <div className="hidden sm:block absolute top-3 right-3 z-10 animate-fade-in">
                    {propertiesContent}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Index;
