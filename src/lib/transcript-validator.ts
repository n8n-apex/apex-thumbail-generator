/**
 * Transcript Validator - Self-checking algorithm for subtitle-voice sync
 * 
 * Validates and repairs transcript timing issues:
 * 1. Overlapping words (end > next.start)
 * 2. Impossible speech rates (too many chars per second)
 * 3. Gaps that should be filled (tiny gaps between words in same phrase)
 * 4. Words with zero or negative duration
 */

import { TranscriptWord } from "@/types/editor";

const MAX_CHARS_PER_SECOND = 20; // tighter limit for sync accuracy
const MIN_WORD_DURATION = 0.08; // minimum 80ms per word (more realistic)
const MAX_GAP_IN_PHRASE = 0.15; // only fill very small gaps (150ms) to avoid drift

interface ValidationResult {
  words: TranscriptWord[];
  fixes: string[];
  score: number; // 0-100 quality score
}

export function validateAndRepairTranscript(words: TranscriptWord[]): ValidationResult {
  if (words.length === 0) return { words: [], fixes: [], score: 100 };

  const fixes: string[] = [];
  let repaired = words.map((w) => ({ ...w }));

  // Pass 1: Fix zero/negative durations
  repaired = repaired.filter((w, i) => {
    const dur = w.end - w.start;
    if (dur < MIN_WORD_DURATION) {
      // Try to expand to minimum duration
      const nextStart = i < repaired.length - 1 ? repaired[i + 1].start : w.start + 0.3;
      const available = nextStart - w.start;
      if (available >= MIN_WORD_DURATION) {
        w.end = w.start + Math.min(available, estimateWordDuration(w.text));
        fixes.push(`Fixed duration for "${w.text}"`);
        return true;
      }
      fixes.push(`Removed "${w.text}" (impossible timing)`);
      return false;
    }
    return true;
  });

  // Pass 2: Fix overlapping words
  for (let i = 0; i < repaired.length - 1; i++) {
    const curr = repaired[i];
    const next = repaired[i + 1];
    if (curr.end > next.start) {
      // Split the overlap at the midpoint
      const mid = (curr.end + next.start) / 2;
      curr.end = mid - 0.01;
      next.start = mid + 0.01;
      fixes.push(`Fixed overlap between "${curr.text}" and "${next.text}"`);
    }
  }

  // Pass 3: Check speech rate sanity
  for (const w of repaired) {
    const dur = w.end - w.start;
    const charsPerSec = w.text.length / dur;
    if (charsPerSec > MAX_CHARS_PER_SECOND) {
      // Word is too short for its text - expand it
      const idealDur = w.text.length / (MAX_CHARS_PER_SECOND * 0.7);
      w.end = w.start + idealDur;
      fixes.push(`Expanded "${w.text}" (speech rate too fast)`);
    }
  }

  // Pass 4: Fill micro-gaps in phrases (smooth subtitle flow)
  for (let i = 0; i < repaired.length - 1; i++) {
    const curr = repaired[i];
    const next = repaired[i + 1];
    const gap = next.start - curr.end;
    if (gap > 0 && gap < MAX_GAP_IN_PHRASE) {
      // Extend current word to fill gap for smooth display
      curr.end = next.start;
    }
  }

  // Pass 5: Re-check overlaps after expansion (Pass 3 might create new ones)
  for (let i = 0; i < repaired.length - 1; i++) {
    const curr = repaired[i];
    const next = repaired[i + 1];
    if (curr.end > next.start) {
      curr.end = next.start - 0.01;
    }
  }

  // Calculate quality score
  const score = calculateSyncScore(repaired);

  return { words: repaired, fixes, score };
}

function estimateWordDuration(text: string): number {
  // Rough estimate: ~80ms per character for average speech
  return Math.max(MIN_WORD_DURATION, text.length * 0.08);
}

function calculateSyncScore(words: TranscriptWord[]): number {
  if (words.length === 0) return 100;
  
  let penalties = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const dur = w.end - w.start;

    // Penalty for very short words
    if (dur < 0.1) penalties += 5;
    
    // Penalty for low confidence
    if (w.confidence < 0.6) penalties += 3;
    if (w.confidence < 0.4) penalties += 7;

    // Penalty for large gaps
    if (i < words.length - 1) {
      const gap = words[i + 1].start - w.end;
      if (gap > 1.5) penalties += 2;
    }

    // Penalty for impossible speech rate
    const cps = w.text.length / dur;
    if (cps > MAX_CHARS_PER_SECOND) penalties += 5;
  }

  return Math.max(0, Math.min(100, 100 - penalties));
}
