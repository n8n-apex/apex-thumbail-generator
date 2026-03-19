import { TranscriptWord } from "@/types/editor";
import { SilenceGap, getActiveSegments } from "@/lib/audio-analysis";

interface TranscriptChunk {
  startIdx: number;
  endIdx: number;
  start: number;
  end: number;
}

export interface TranscriptSyncResult {
  words: TranscriptWord[];
  appliedAdjustments: number;
  globalShiftMs: number;
}

const CHUNK_BREAK_GAP = 0.55;
const MIN_WORD_DURATION = 0.06;
const MIN_WORD_GAP = 0.01;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitTranscriptChunks(words: TranscriptWord[]): TranscriptChunk[] {
  if (words.length === 0) return [];

  const chunks: TranscriptChunk[] = [];
  let chunkStart = 0;

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= CHUNK_BREAK_GAP) {
      chunks.push({
        startIdx: chunkStart,
        endIdx: i - 1,
        start: words[chunkStart].start,
        end: words[i - 1].end,
      });
      chunkStart = i;
    }
  }

  chunks.push({
    startIdx: chunkStart,
    endIdx: words.length - 1,
    start: words[chunkStart].start,
    end: words[words.length - 1].end,
  });

  return chunks;
}

function enforceMonotonicTiming(words: TranscriptWord[], duration: number): TranscriptWord[] {
  if (words.length === 0) return words;

  const out = words.map((w) => ({ ...w }));
  const maxTime = Math.max(duration, out[out.length - 1].end + 0.5);

  for (let i = 0; i < out.length; i++) {
    const prev = i > 0 ? out[i - 1] : null;
    const current = out[i];

    let start = current.start;
    let end = current.end;

    if (prev) {
      start = Math.max(start, prev.end + MIN_WORD_GAP);
    }

    start = clamp(start, 0, Math.max(0, maxTime - MIN_WORD_DURATION));
    end = Math.max(end, start + MIN_WORD_DURATION);
    end = clamp(end, start + MIN_WORD_DURATION, maxTime);

    current.start = start;
    current.end = end;
  }

  return out;
}

export function alignTranscriptToAudioTimeline(
  words: TranscriptWord[],
  silences: SilenceGap[],
  duration: number,
): TranscriptSyncResult {
  if (words.length === 0) {
    return { words: [], appliedAdjustments: 0, globalShiftMs: 0 };
  }

  const speechSegments = getActiveSegments(silences, duration).filter(
    (segment) => segment.end - segment.start >= 0.18,
  );

  if (speechSegments.length === 0) {
    return {
      words: enforceMonotonicTiming(words, duration),
      appliedAdjustments: 0,
      globalShiftMs: 0,
    };
  }

  let adjusted = words.map((w) => ({ ...w }));
  let appliedAdjustments = 0;

  const firstSpeech = speechSegments[0];
  const lastSpeech = speechSegments[speechSegments.length - 1];
  const firstWord = adjusted[0];
  const lastWord = adjusted[adjusted.length - 1];

  const sourceSpan = Math.max(0.5, lastWord.end - firstWord.start);
  const targetSpan = Math.max(0.5, lastSpeech.end - firstSpeech.start);

  const globalScale = clamp(targetSpan / sourceSpan, 0.9, 1.1);
  const globalOffset = firstSpeech.start + 0.02 - firstWord.start * globalScale;

  if (Math.abs(globalScale - 1) > 0.008 || Math.abs(globalOffset) > 0.012) {
    adjusted = adjusted.map((word) => ({
      ...word,
      start: word.start * globalScale + globalOffset,
      end: word.end * globalScale + globalOffset,
    }));
    appliedAdjustments += adjusted.length;
  }

  const chunks = splitTranscriptChunks(adjusted);
  const transcriptEnd = chunks.length > 0 ? chunks[chunks.length - 1].end : adjusted[adjusted.length - 1].end;

  let lastMappedSpeechIdx = 0;
  for (const chunk of chunks) {
    const center = (chunk.start + chunk.end) / 2;
    const ratio = transcriptEnd > 0 ? center / transcriptEnd : 0;

    let speechIdx = Math.round(ratio * (speechSegments.length - 1));
    speechIdx = Math.max(lastMappedSpeechIdx, Math.min(speechIdx, speechSegments.length - 1));
    lastMappedSpeechIdx = speechIdx;

    const speech = speechSegments[speechIdx];
    const targetStart = speech.start + 0.02;
    const targetEnd = speech.end - 0.02;
    const targetDuration = targetEnd - targetStart;

    if (targetDuration < 0.12) continue;

    const chunkDuration = Math.max(0.12, chunk.end - chunk.start);
    const localScale = clamp(targetDuration / chunkDuration, 0.82, 1.22);
    const localOffset = targetStart - chunk.start * localScale;

    if (Math.abs(localScale - 1) <= 0.01 && Math.abs(localOffset) <= 0.012) continue;

    for (let i = chunk.startIdx; i <= chunk.endIdx; i++) {
      const word = adjusted[i];
      word.start = word.start * localScale + localOffset;
      word.end = word.end * localScale + localOffset;
      appliedAdjustments++;
    }
  }

  return {
    words: enforceMonotonicTiming(adjusted, duration),
    appliedAdjustments,
    globalShiftMs: Math.round(globalOffset * 1000),
  };
}
