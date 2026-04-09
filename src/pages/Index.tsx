import { useCallback, useRef } from "react";
import { useImageEditor } from "@/hooks/use-image-editor";
import Toolbar from "@/components/image-editor/Toolbar";
import Canvas from "@/components/image-editor/Canvas";
import PropertiesPanel from "@/components/image-editor/PropertiesPanel";
import BatchStrip from "@/components/image-editor/BatchStrip";
import UploadZone from "@/components/image-editor/UploadZone";

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
      <header className="h-12 flex items-center justify-between px-4 glass-elevated rounded-none border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg glass-button-primary flex items-center justify-center">
            <span className="text-xs font-black text-primary-foreground">A</span>
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">
            APEX AI Image Intelligence
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          Powered by APEX AI Tech
        </span>
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
        <div className="flex-1 flex gap-2 p-2 min-h-0">
          {/* Left toolbar */}
          <Toolbar
            activeTool={state.activeTool}
            onToolChange={setTool}
            onUpload={handleUploadClick}
            onDownload={downloadAll}
            onReset={() => activeImage && resetImage(activeImage.id)}
            hasImages={hasImages}
            hasActiveImage={!!activeImage}
          />

          {/* Center area */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <Canvas
              image={activeImage}
              zoom={state.zoom}
              onZoomChange={setZoom}
            />
            <BatchStrip
              images={state.images}
              activeId={state.activeId}
              selectedIds={state.selectedIds}
              onSelect={setActiveImage}
              onToggleSelect={toggleSelect}
              onRemove={removeImage}
            />
          </div>

          {/* Right properties */}
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
        </div>
      )}
    </div>
  );
};

export default Index;
