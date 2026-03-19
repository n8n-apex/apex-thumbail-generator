import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import UploadScreen from "@/components/reel/UploadScreen";
import ProcessingScreen from "@/components/reel/ProcessingScreen";
import ReelPreview from "@/components/reel/ReelPreview";
import ControlsPanel from "@/components/reel/ControlsPanel";
import { calculateTimeSaved } from "@/lib/audio-analysis";
import { useVideoProjects } from "@/hooks/use-video-projects";

const Index = () => {
  const {
    projects, activeIndex, setActiveIndex, activeProject,
    addFiles, removeProject, updateProject, redetectForProject,
    exportProject, resetAll, hasProjects, regenerateTranscript,
  } = useVideoProjects();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Re-detect silences when settings change for active project
  useEffect(() => {
    if (activeProject && activeProject.phase === "ready") {
      redetectForProject(activeProject.id);
    }
  }, [
    activeProject?.silenceCut.threshold,
    activeProject?.silenceCut.minDuration,
    activeProject?.silenceCut.padding,
    activeProject?.silenceCut.enabled,
  ]);

  // Listen for subtitle drag position changes
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      if (activeProject) {
        updateProject(activeProject.id, {
          subtitleStyle: { ...activeProject.subtitleStyle, positionX: x, positionY: y },
        });
      }
    };
    window.addEventListener("subtitle-position", handler);
    return () => window.removeEventListener("subtitle-position", handler);
  }, [activeProject, updateProject]);

  const handleFilesSelect = useCallback((files: File[]) => {
    addFiles(files);
  }, [addFiles]);

  const handleAddMore = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddMoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (f) => f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|webm|avi)$/i)
      );
      if (files.length > 0) addFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addFiles]);

  const handleNavigate = useCallback((dir: -1 | 1) => {
    setActiveIndex((prev: number) => {
      const next = prev + dir;
      if (next < 0 || next >= projects.length) return prev;
      return next;
    });
  }, [projects.length, setActiveIndex]);

  // No projects — show upload screen
  if (!hasProjects) {
    return (
      <div className="app-frame">
        <UploadScreen onFilesSelect={handleFilesSelect} />
      </div>
    );
  }

  const proj = activeProject;
  if (!proj) return null;

  // Active project still processing
  if (proj.phase === "processing") {
    return (
      <div className="app-frame">
        <ProcessingScreen
          fileName={proj.file.name}
          progress={proj.progress}
          currentStep={proj.currentStep}
          steps={proj.steps}
        />
        {projects.length > 1 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-2 text-[11px] font-semibold text-muted-foreground">
            Video {activeIndex + 1} / {projects.length}
          </div>
        )}
      </div>
    );
  }

  const timeSaved = calculateTimeSaved(proj.silences);

  return (
    <div className="app-frame flex-col sm:flex-row mesh-gradient">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.webm,.avi"
        multiple
        className="hidden"
        onChange={handleAddMoreChange}
      />
      <ReelPreview
        videoUrl={proj.url}
        transcript={proj.transcript}
        subtitleStyle={proj.subtitleStyle}
        speaker={proj.speaker}
        currentTime={proj.currentTime}
        duration={proj.duration}
        isPlaying={proj.isPlaying}
        silences={proj.silences}
        onTimeUpdate={(t) => updateProject(proj.id, { currentTime: t })}
        onPlayPause={() => updateProject(proj.id, { isPlaying: !proj.isPlaying })}
        onSeek={(t) => updateProject(proj.id, { currentTime: t })}
        onDurationChange={(d) => updateProject(proj.id, { duration: d })}
        onRemove={() => {
          removeProject(proj.id);
          if (projects.length <= 1) resetAll();
        }}
        totalVideos={projects.length}
        currentIndex={activeIndex}
        onNavigate={handleNavigate}
        fileName={proj.file.name}
        onVideoRef={setVideoEl}
      />
      <ControlsPanel
        style={proj.subtitleStyle}
        speaker={proj.speaker}
        silenceCut={proj.silenceCut}
        onStyleChange={(s) => updateProject(proj.id, { subtitleStyle: s })}
        onSpeakerChange={(s) => updateProject(proj.id, { speaker: s })}
        onSilenceCutChange={(s) => {
          updateProject(proj.id, { silenceCut: s });
        }}
        onExport={() => exportProject(proj.id)}
        onRegenerate={() => regenerateTranscript(proj.id)}
        onAddMore={handleAddMore}
        videoRef={videoEl}
        transcript={proj.transcript}
        isExporting={proj.isExporting}
        exportProgress={proj.exportProgress}
        silenceCount={proj.silences.length}
        timeSaved={timeSaved}
        duration={proj.duration}
      />
    </div>
  );
};

export default Index;
