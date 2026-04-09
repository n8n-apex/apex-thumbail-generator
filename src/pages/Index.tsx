import { useCallback, useRef, useState } from "react";
import { useImageEditor } from "@/hooks/use-image-editor";
import Toolbar from "@/components/image-editor/Toolbar";
import Canvas from "@/components/image-editor/Canvas";
import PropertiesPanel from "@/components/image-editor/PropertiesPanel";
import BatchStrip from "@/components/image-editor/BatchStrip";
import UploadZone from "@/components/image-editor/UploadZone";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

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
      onCrop={(preset) => activeImage && cropImage(activeImage.id, preset)}
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
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length > 0) addImages(files);
      }}
    >
      {/* Header */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 sm:px-4 glass-elevated rounded-none border-b border-border/30 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg glass-button-primary flex items-center justify-center">
            <span className="text-xs font-black text-primary-foreground">A</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
            APEX AI Image Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile: properties sheet trigger */}
          {hasImages && (
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

      {!hasImages ? (
        <UploadZone onFiles={addImages} />
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row gap-1.5 sm:gap-2 p-1.5 sm:p-2 min-h-0 relative">
          {/* Toolbar: horizontal on mobile, vertical on desktop */}
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

          {/* Center area — full width, properties floats over it */}
          <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0 min-h-0 relative">
            <Canvas
              image={activeImage}
              zoom={state.zoom}
              onZoomChange={setZoom}
              onDownload={() => activeImage && downloadImage(activeImage.id)}
              onReset={() => activeImage && resetImage(activeImage.id)}
            />
            <BatchStrip
              images={state.images}
              activeId={state.activeId}
              selectedIds={state.selectedIds}
              onSelect={setActiveImage}
              onToggleSelect={toggleSelect}
              onRemove={removeImage}
            />

            {/* Floating properties panel — overlays on canvas when a tool is active */}
            {showProps && (
              <div className="hidden sm:block absolute top-3 right-3 z-10 animate-fade-in">
                {propertiesContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
