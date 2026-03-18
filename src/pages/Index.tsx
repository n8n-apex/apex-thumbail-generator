import { useState, useCallback } from "react";
import DropZone from "@/components/editor/DropZone";
import AnalyzingState from "@/components/editor/AnalyzingState";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import {
  EditorState,
  SubtitleStyle,
  MOCK_TRANSCRIPT,
  MOCK_SILENCES,
  DEFAULT_SUBTITLE_STYLE,
} from "@/types/editor";

const Index = () => {
  const [state, setState] = useState<EditorState>({
    phase: "dropzone",
    videoFile: null,
    videoUrl: null,
    transcript: [],
    silences: [],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    removeSilences: false,
    subtitleStyle: DEFAULT_SUBTITLE_STYLE,
    thumbnailUrl: null,
  });

  const handleFileSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setState((s) => ({
      ...s,
      phase: "analyzing",
      videoFile: file,
      videoUrl: url,
    }));
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "editing",
      transcript: MOCK_TRANSCRIPT,
      silences: MOCK_SILENCES,
      duration: 18,
    }));
  }, []);

  const handleCaptureThumbnail = useCallback(() => {
    // In a real app this would grab the current video frame
    const canvas = document.createElement("canvas");
    const video = document.querySelector("video");
    if (video) {
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/png");
        setState((s) => ({ ...s, thumbnailUrl: url }));
      }
    }
  }, []);

  if (state.phase === "dropzone") {
    return <DropZone onFileSelect={handleFileSelect} />;
  }

  if (state.phase === "analyzing") {
    return (
      <AnalyzingState
        fileName={state.videoFile?.name || "video.mp4"}
        onComplete={handleAnalysisComplete}
      />
    );
  }

  return (
    <EditorWorkspace
      videoUrl={state.videoUrl}
      transcript={state.transcript}
      silences={state.silences}
      currentTime={state.currentTime}
      duration={state.duration}
      isPlaying={state.isPlaying}
      removeSilences={state.removeSilences}
      subtitleStyle={state.subtitleStyle}
      thumbnailUrl={state.thumbnailUrl}
      onTimeUpdate={(t) => setState((s) => ({ ...s, currentTime: t }))}
      onPlayPause={() => setState((s) => ({ ...s, isPlaying: !s.isPlaying }))}
      onSeek={(t) => setState((s) => ({ ...s, currentTime: t }))}
      onCaptureThumbnail={handleCaptureThumbnail}
      onDurationChange={(d) => setState((s) => ({ ...s, duration: d }))}
      onStyleChange={(subtitleStyle: SubtitleStyle) =>
        setState((s) => ({ ...s, subtitleStyle }))
      }
      onToggleSilences={(v) => setState((s) => ({ ...s, removeSilences: v }))}
    />
  );
};

export default Index;
