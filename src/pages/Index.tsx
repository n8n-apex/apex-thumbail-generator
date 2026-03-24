import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import UploadScreen from "@/components/reel/UploadScreen";
import ProcessingScreen from "@/components/reel/ProcessingScreen";
import ReelPreview from "@/components/reel/ReelPreview";
import ControlsPanel from "@/components/reel/ControlsPanel";
import { calculateTimeSaved } from "@/lib/audio-analysis";
import { useVideoProjects } from "@/hooks/use-video-projects";
import { mergeWordCutsWithSilences, getVisibleTranscript } from "@/types/editor";

const Index = () => {
  const {
    projects, activeIndex, setActiveIndex, activeProject,
    addFiles, removeProject, updateProject, redetectForProject,
    exportProject, resetAll, hasProjects, regenerateTranscript,
  } = useVideoProjects();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  const proj = activeProject;

  // Merge cut-word time ranges into silences for playback skipping & export
  const effectiveSilences = useMemo(
    () => proj ? mergeWordCutsWithSilences(proj.transcript, proj.silences) : [],
    [proj?.transcript, proj?.silences]
  );
  const visibleTranscript = useMemo(
    () => proj ? getVisibleTranscript(proj.transcript) : [],
    [proj?.transcript]
  );

  // Re-detect silences when settings change for active project
  useEffect(() => {
    if (proj && proj.phase === "ready") {
      redetectForProject(proj.id);
    }
  }, [
    proj?.silenceCut.threshold,
    proj?.silenceCut.minDuration,
    proj?.silenceCut.padding,
    proj?.silenceCut.enabled,
    redetectForProject,
  ]);

  // Listen for subtitle drag position changes
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      if (proj) {
        updateProject(proj.id, {
          subtitleStyle: { ...proj.subtitleStyle, positionX: x, positionY: y },
        });
      }
    };
    window.addEventListener("subtitle-position", handler);
    return () => window.removeEventListener("subtitle-position", handler);
  }, [proj, updateProject]);

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

  const timeSaved = calculateTimeSaved(effectiveSilences);

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
        transcript={visibleTranscript}
        subtitleStyle={proj.subtitleStyle}
        speaker={proj.speaker}
        currentTime={proj.currentTime}
        duration={proj.duration}
        isPlaying={proj.isPlaying}
        silences={effectiveSilences}
        colorGrading={proj.colorGrading}
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
        onReanalyze={() => regenerateTranscript(proj.id)}
      />
      <ControlsPanel
        style={proj.subtitleStyle}
        speaker={proj.speaker}
        silenceCut={proj.silenceCut}
        colorGrading={proj.colorGrading}
        onStyleChange={(s) => updateProject(proj.id, { subtitleStyle: s })}
        onSpeakerChange={(s) => updateProject(proj.id, { speaker: s })}
        onSilenceCutChange={(s) => {
          updateProject(proj.id, { silenceCut: s });
        }}
        onColorGradingChange={(s) => updateProject(proj.id, { colorGrading: s })}
        onTranscriptChange={(words) => updateProject(proj.id, { transcript: words })}
        onExport={() => exportProject(proj.id)}
        onRegenerate={() => regenerateTranscript(proj.id)}
        onAddMore={handleAddMore}
        videoRef={videoEl}
        transcript={proj.transcript}
        currentTime={proj.currentTime}
        isExporting={proj.isExporting}
        exportProgress={proj.exportProgress}
        silenceCount={proj.silences.length}
        timeSaved={timeSaved}
        duration={proj.duration}
        sanityCheck={proj.sanityCheck}
        calibrationReasoning={proj.calibrationReasoning}
      />
    </div>
  );
};

export default Index;
