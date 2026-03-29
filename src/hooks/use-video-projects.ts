import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { TranscriptWord, SilenceCutSettings, MOCK_TRANSCRIPT, MOCK_SILENCES, mergeWordCutsWithSilences, getVisibleTranscript } from "@/types/editor";
import { VideoProject, createVideoProject } from "@/types/video-project";
import { analyzeAudio, getActiveSegments, type SilenceGap } from "@/lib/audio-analysis";
import { extractAudioBlob } from "@/lib/audio-extract";
import { exportWithSubtitles, preloadRemuxer } from "@/lib/canvas-exporter";
import { validateAndRepairTranscript } from "@/lib/transcript-validator";
import { alignTranscriptToAudioTimeline } from "@/lib/transcript-sync";
import { autoCalibrateFromAmplitudes } from "@/lib/auto-calibrate";
import { autoGradeFromVideo } from "@/lib/auto-color-grading";
import { applyCorrections } from "@/components/reel/TranscriptEditor";
import { supabase } from "@/integrations/supabase/client";

const CHUNK_DURATION = 0.05;

// Filler words to remove across common languages (DE, EN, FR, ES, etc.)
const FILLER_WORDS = new Set([
  // German
  "ähm", "äh", "ehm", "eh", "hm", "hmm", "mhm", "öhm", "öh", "ähh", "ehh",
  "halt", "quasi", "sozusagen", "irgendwie", "eigentlich", "ja", "ne", "naja",
  "genau", "also", "eben", "tja",
  // English
  "um", "uh", "uhm", "hmm", "hm", "er", "like", "you know", "i mean",
  "basically", "literally", "actually", "right",
  // French
  "euh", "bah", "ben", "hein",
  // Spanish
  "este", "pues", "bueno",
]);

// Filter out garbled/nonsensical words and filler words for clean subtitle flow
function cleanTranscript(words: TranscriptWord[]): TranscriptWord[] {
  return words.filter((w) => {
    const text = w.text.trim();
    if (!text) return false;
    if (w.confidence < 0.4) return false;
    if (FILLER_WORDS.has(text.toLowerCase())) return false;
    if (text.length === 1 && !/[A-Za-zÄÖÜäöü0-9]/.test(text)) return false;
    if (/^[^\p{L}\p{N}]+$/u.test(text)) return false;
    if (w.end - w.start < 0.01) return false;
    return true;
  });
}

/**
 * Detect and cut stutters, false starts, repeated phrases, and meta-speech.
 * 
 * Patterns handled:
 *   1. Word-level stutter: "ich ich ich gehe" → cut first two "ich"
 *   2. Partial stutter: "al- also" → cut "al-"
 *   3. Short phrase repeat (1-6 words): "und dann sprech ich und dann sprech ich" → cut first occurrence
 *   4. False-start re-takes: speaker starts a sentence, restarts → cut the false start
 *   5. Meta/warm-up speech: "ok jetzt", "so los", "eins zwei drei" etc. at video start
 */
function markStutterRepeats(words: TranscriptWord[]): TranscriptWord[] {
  const result = words.map((w) => ({ ...w }));
  const norm = (t: string) => t.toLowerCase().replace(/[.,!?:;\-–—"'„"]+$/g, "").replace(/^[.,!?:;\-–—"'„"]+/, "").trim();

  // === Pass 1: Consecutive word-level stutters ===
  for (let i = 0; i < result.length; i++) {
    if (result[i].isCut) continue;
    const word = norm(result[i].text);
    if (!word || word.length < 2) continue;

    let runEnd = i;
    while (runEnd + 1 < result.length) {
      const next = norm(result[runEnd + 1].text);
      if (next === word || isPartialStutter(next, word) || isPartialStutter(word, next)) {
        runEnd++;
      } else {
        break;
      }
    }
    if (runEnd > i) {
      for (let j = i; j < runEnd; j++) result[j].isCut = true;
      i = runEnd;
    }
  }

  // === Pass 2: Phrase-level repeats (2-12 words) ===
  // Wide search window to catch restarts like "und dann sprech ich... [pause] ...und dann sprech ich"
  for (let phraseLen = 2; phraseLen <= 12; phraseLen++) {
    for (let i = 0; i < result.length - phraseLen; i++) {
      if (result[i].isCut) continue;
      
      const phrase1Words = result.slice(i, i + phraseLen);
      if (phrase1Words.filter(w => w.isCut).length > phraseLen / 2) continue;
      
      const phrase1 = phrase1Words.filter(w => !w.isCut).map(w => norm(w.text)).join(" ");
      if (phrase1.split(" ").some(w => w.length < 1)) continue;
      if (phrase1.split(" ").length < 2) continue;

      const searchStart = i + phraseLen;
      // Search much further ahead — repeated sentences can be 20+ words apart
      const searchEnd = Math.min(searchStart + phraseLen + 20, result.length - phraseLen + 1);
      
      for (let j = searchStart; j < searchEnd; j++) {
        if (result[j].isCut) continue;
        const phrase2 = result.slice(j, j + phraseLen).filter(w => !w.isCut).map(w => norm(w.text)).join(" ");
        if (phrase1 === phrase2 && phrase1.split(" ").length >= 2) {
          // Cut the FIRST occurrence (the false start), keep the second (the correction)
          for (let k = i; k < j; k++) {
            result[k].isCut = true;
          }
          console.log(`Cut repeated phrase: "${phrase1}"`);
          i = j - 1;
          break;
        }
      }
    }
  }

  // === Pass 3: False-start detection ===
  for (let i = 0; i < result.length - 3; i++) {
    if (result[i].isCut) continue;
    const startWord = norm(result[i].text);
    if (!startWord || startWord.length < 3) continue;
    
    for (let j = i + 2; j < Math.min(i + 10, result.length); j++) {
      if (result[j].isCut) continue;
      const candidate = norm(result[j].text);
      if (candidate === startWord) {
        const afterFirst = result.slice(i + 1, j).filter(w => !w.isCut);
        const afterSecond = result.slice(j + 1, j + 1 + afterFirst.length + 3).filter(w => !w.isCut);
        
        if (afterSecond.length >= afterFirst.length) {
          for (let k = i; k < j; k++) {
            result[k].isCut = true;
          }
          i = j - 1;
          break;
        }
      }
    }
  }

  // === Pass 4: Meta-speech / warm-up at video start ===
  const META_PATTERNS = [
    /^(ok|okay|so|gut|also|alles klar|los|bereit|ready|go|jetzt|na gut|passt|check|test|testing)/i,
    /^(eins|zwei|drei|one|two|three|1|2|3)\b/i,
  ];
  if (result.length > 0) {
    const firstContentTime = result.find(w => !w.isCut)?.start ?? 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i].isCut) continue;
      if (result[i].start > firstContentTime + 3) break;
      
      const textFromHere = result.slice(i, i + 4).filter(w => !w.isCut).map(w => norm(w.text)).join(" ");
      if (META_PATTERNS.some(p => p.test(textFromHere))) {
        const nextReal = result.slice(i + 1, i + 5).find(w => !w.isCut && norm(w.text).length > 3 && !META_PATTERNS.some(p => p.test(norm(w.text))));
        if (nextReal && nextReal.start - result[i].end < 1.5) {
          result[i].isCut = true;
        }
      }
    }
  }

  // === Pass 5: Speech exercises / warm-up drills ===
  // Detect tongue twisters, repeated practice phrases, vocal warm-ups
  // e.g. "la la la", "bla bla", "pa pa pa", or repeated nonsense syllables
  const EXERCISE_PATTERNS = [
    /^(la|bla|ba|pa|ta|da|ma|na|ra)\b/i,
    /^(blub|brr|pfff|pff|sch+|tss|brrr)/i,
  ];
  for (let i = 0; i < result.length; i++) {
    if (result[i].isCut) continue;
    const w = norm(result[i].text);
    // Single syllable exercise sounds repeated
    if (EXERCISE_PATTERNS.some(p => p.test(w))) {
      // Check if surrounded by similar nonsense (at least 2 in a row)
      let count = 1;
      let end = i;
      for (let j = i + 1; j < Math.min(i + 8, result.length); j++) {
        if (result[j].isCut) continue;
        const nj = norm(result[j].text);
        if (EXERCISE_PATTERNS.some(p => p.test(nj)) || nj === w) {
          count++;
          end = j;
        } else break;
      }
      if (count >= 2) {
        for (let j = i; j <= end; j++) result[j].isCut = true;
        i = end;
      }
    }
  }

  // === Pass 6: Mumbling / unintelligible segments ===
  // Low-confidence consecutive words = mumbling → cut them
  // Only cut if 3+ consecutive low-confidence words (isolated low-conf words might just be unusual)
  for (let i = 0; i < result.length; i++) {
    if (result[i].isCut) continue;
    if (result[i].confidence >= 0.55) continue;

    // Found a low-confidence word — count the run
    let runEnd = i;
    for (let j = i + 1; j < result.length; j++) {
      if (result[j].isCut) continue;
      if (result[j].confidence < 0.55) {
        runEnd = j;
      } else break;
    }
    const runLen = runEnd - i + 1;
    if (runLen >= 3) {
      // 3+ consecutive unclear words → mumbling, cut them
      for (let j = i; j <= runEnd; j++) result[j].isCut = true;
      console.log(`Cut mumbling: "${result.slice(i, runEnd + 1).map(w => w.text).join(" ")}" (confidence < 0.55)`);
      i = runEnd;
    }
  }

  // === Pass 7: Syntactic coherence — cut orphaned fragments ===
  // After all cuts, check that remaining visible segments form coherent phrases.
  // An "orphan" is 1-2 words isolated between cuts/silences that don't form a sentence.
  // Common orphans: leftover conjunctions, articles, prepositions alone.
  const WEAK_WORDS = new Set([
    "und", "oder", "aber", "denn", "weil", "dass", "wenn", "ob", "als",
    "der", "die", "das", "ein", "eine", "einer", "einem", "einen",
    "an", "auf", "in", "mit", "von", "zu", "für", "über", "nach", "bei",
    "the", "a", "an", "and", "or", "but", "to", "for", "with", "of", "in",
    "ich", "du", "er", "sie", "es", "wir", "ihr",
    "i", "he", "she", "we", "they", "it",
    "ist", "sind", "war", "hat", "haben", "wird",
    "is", "are", "was", "has", "have", "will",
    "nicht", "noch", "schon", "auch", "nur", "mal",
    "not", "just", "also", "still", "yet",
  ]);

  // Find visible segments (runs of non-cut words)
  const segments: { start: number; end: number }[] = [];
  let segStart: number | null = null;
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isCut) {
      if (segStart === null) segStart = i;
    } else {
      if (segStart !== null) {
        segments.push({ start: segStart, end: i - 1 });
        segStart = null;
      }
    }
  }
  if (segStart !== null) segments.push({ start: segStart, end: result.length - 1 });

  for (const seg of segments) {
    const segWords = result.slice(seg.start, seg.end + 1);
    const visibleWords = segWords.filter(w => !w.isCut);
    
    // Very short fragment (1-2 words) that's just weak/function words → cut
    if (visibleWords.length <= 2) {
      const allWeak = visibleWords.every(w => WEAK_WORDS.has(norm(w.text)));
      if (allWeak) {
        for (let j = seg.start; j <= seg.end; j++) {
          if (!result[j].isCut) result[j].isCut = true;
        }
      }
    }

    // Fragment starts with a trailing conjunction/preposition but has no preceding context → cut the dangling word
    if (visibleWords.length >= 2) {
      const firstVisible = norm(visibleWords[0].text);
      const isTrailingConnector = ["und", "oder", "aber", "denn", "weil", "dass", "and", "or", "but", "because"].includes(firstVisible);
      if (isTrailingConnector) {
        // Check if there's a preceding visible segment that this connects to
        const segIdx = segments.indexOf(seg);
        if (segIdx === 0) {
          // First segment starts with connector — doesn't make sense, cut it
          const idx = result.indexOf(visibleWords[0]);
          if (idx >= 0) result[idx].isCut = true;
        } else {
          // Check gap to previous segment
          const prevSeg = segments[segIdx - 1];
          const prevEnd = result[prevSeg.end];
          const gap = result[seg.start].start - prevEnd.end;
          if (gap > 2.0) {
            // Big gap before connector — it's a fragment restart, cut the connector
            const idx = result.indexOf(visibleWords[0]);
            if (idx >= 0) result[idx].isCut = true;
          }
        }
      }
    }
  }

  return result;
}

/** Check if `partial` is a truncated stutter of `full` (e.g. "al" or "al-" → "also") */
function isPartialStutter(partial: string, full: string): boolean {
  if (partial.length >= full.length) return false;
  if (partial.length < 2) return false;
  const clean = partial.replace(/[-–—]+$/, "");
  return clean.length >= 2 && full.startsWith(clean);
}

/**
 * Final coherence check before export.
 * Ensures the visible script reads as natural, syntactically valid speech.
 * Cuts any remaining fragments that break the flow.
 */
function validateScriptCoherence(words: TranscriptWord[]): { words: TranscriptWord[]; fixes: string[] } {
  const result = words.map(w => ({ ...w }));
  const fixes: string[] = [];
  const norm = (t: string) => t.toLowerCase().replace(/[.,!?:;\-–—"'„"]+$/g, "").replace(/^[.,!?:;\-–—"'„"]+/, "").trim();

  // Build visible segments (groups of consecutive non-cut words)
  const segments: { startIdx: number; endIdx: number }[] = [];
  let segStart: number | null = null;
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isCut) {
      if (segStart === null) segStart = i;
    } else if (segStart !== null) {
      segments.push({ startIdx: segStart, endIdx: i - 1 });
      segStart = null;
    }
  }
  if (segStart !== null) segments.push({ startIdx: segStart, endIdx: result.length - 1 });

  // --- Check 1: Dangling sentence-ending fragments ---
  // A segment that's just 1 word and is a verb/pronoun ending a cut sentence
  const SENTENCE_ENDERS_ALONE = new Set(["ist", "war", "hat", "wird", "kann", "soll", "muss", "darf",
    "is", "was", "has", "will", "can", "shall", "must", "does"]);
  
  for (const seg of segments) {
    const visible = result.slice(seg.startIdx, seg.endIdx + 1).filter(w => !w.isCut);
    if (visible.length === 1) {
      const w = norm(visible[0].text);
      if (SENTENCE_ENDERS_ALONE.has(w) || w.length <= 2) {
        const idx = result.indexOf(visible[0]);
        if (idx >= 0) {
          result[idx].isCut = true;
          fixes.push(`Einzelnes "${visible[0].text}" entfernt (kein Satzkontext)`);
        }
      }
    }
  }

  // --- Check 2: Sentence starts with impossible grammar ---
  // e.g. segment starts with a trailing punctuation word or ends mid-phrase
  const IMPOSSIBLE_STARTERS = new Set([".", ",", "!", "?", "...", "…"]);
  for (const seg of segments) {
    const visible = result.slice(seg.startIdx, seg.endIdx + 1).filter(w => !w.isCut);
    if (visible.length > 0 && IMPOSSIBLE_STARTERS.has(visible[0].text.trim())) {
      const idx = result.indexOf(visible[0]);
      if (idx >= 0) {
        result[idx].isCut = true;
        fixes.push(`Satzzeichen "${visible[0].text}" am Segmentanfang entfernt`);
      }
    }
  }

  // --- Check 3: Incomplete verb phrases (subject without predicate in short segments) ---
  // If a segment is 2-3 words and it's just pronouns + conjunction, cut it
  const PRONOUNS = new Set(["ich", "du", "er", "sie", "es", "wir", "ihr", "i", "you", "he", "she", "we", "they", "it"]);
  const CONJUNCTIONS = new Set(["und", "oder", "aber", "denn", "weil", "dass", "wenn", "ob", "als",
    "and", "or", "but", "because", "that", "when", "if"]);

  // Re-build segments after check 1-2 modifications
  const segments2: { startIdx: number; endIdx: number }[] = [];
  segStart = null;
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isCut) {
      if (segStart === null) segStart = i;
    } else if (segStart !== null) {
      segments2.push({ startIdx: segStart, endIdx: i - 1 });
      segStart = null;
    }
  }
  if (segStart !== null) segments2.push({ startIdx: segStart, endIdx: result.length - 1 });

  for (const seg of segments2) {
    const visible = result.slice(seg.startIdx, seg.endIdx + 1).filter(w => !w.isCut);
    if (visible.length >= 2 && visible.length <= 3) {
      const normed = visible.map(w => norm(w.text));
      const allFunctional = normed.every(w => PRONOUNS.has(w) || CONJUNCTIONS.has(w));
      if (allFunctional) {
        for (const w of visible) {
          const idx = result.indexOf(w);
          if (idx >= 0) {
            result[idx].isCut = true;
          }
        }
        fixes.push(`Fragment "${visible.map(w => w.text).join(" ")}" entfernt (kein vollständiger Satz)`);
      }
    }
  }

  // --- Check 4: Trailing dangling words at the very end ---
  // If the last visible segment is just 1-2 weak words, cut them
  const WEAK = new Set(["und", "oder", "aber", "also", "ja", "ne", "so", "dann",
    "and", "or", "but", "so", "then", "well", "yeah"]);
  const finalVisible: TranscriptWord[] = [];
  for (let i = result.length - 1; i >= 0; i--) {
    if (!result[i].isCut) finalVisible.unshift(result[i]);
    else if (finalVisible.length > 0) break;
  }
  if (finalVisible.length <= 2 && finalVisible.every(w => WEAK.has(norm(w.text)))) {
    for (const w of finalVisible) {
      const idx = result.indexOf(w);
      if (idx >= 0) {
        result[idx].isCut = true;
        fixes.push(`Dangling "${w.text}" am Ende entfernt`);
      }
    }
  }

  // --- Check 5: Final deduplication on visible text ---
  // After all cuts, rebuild the visible transcript and find any remaining repeated sentences
  const getVisible = () => result.filter(w => !w.isCut);
  const visible = getVisible();
  
  // Sliding window: compare sequences of 3-10 visible words for duplicates
  for (let winSize = 3; winSize <= Math.min(10, Math.floor(visible.length / 2)); winSize++) {
    for (let i = 0; i <= visible.length - winSize * 2; i++) {
      const seq1 = visible.slice(i, i + winSize).map(w => norm(w.text)).join(" ");
      for (let j = i + winSize; j <= visible.length - winSize; j++) {
        const seq2 = visible.slice(j, j + winSize).map(w => norm(w.text)).join(" ");
        if (seq1 === seq2) {
          // Cut the first occurrence
          for (let k = i; k < i + winSize; k++) {
            const idx = result.indexOf(visible[k]);
            if (idx >= 0) result[idx].isCut = true;
          }
          // Also cut any words between the two sequences that are now orphaned
          const lastOfFirst = result.indexOf(visible[i + winSize - 1]);
          const firstOfSecond = result.indexOf(visible[j]);
          if (lastOfFirst >= 0 && firstOfSecond >= 0) {
            for (let k = lastOfFirst + 1; k < firstOfSecond; k++) {
              if (!result[k].isCut) {
                const betweenText = norm(result[k].text);
                // Only cut weak bridging words between duplicates
                if (betweenText.length <= 4 || ["und", "also", "dann", "ja", "so", "ähm", "and", "then", "so"].includes(betweenText)) {
                  result[k].isCut = true;
                }
              }
            }
          }
          fixes.push(`Dopplung entfernt: "${seq1}"`);
          break;
        }
      }
    }
  }

  // --- Check 6: Remove isolated single words that make no sense alone ---
  // Re-scan after dedup: any single visible word surrounded by cuts that isn't a meaningful standalone
  const STANDALONE_OK = new Set(["ja", "nein", "genau", "richtig", "ok", "danke", "yes", "no", "exactly", "right", "thanks"]);
  for (let i = 0; i < result.length; i++) {
    if (result[i].isCut) continue;
    const prev = i > 0 ? result[i - 1].isCut !== false : true;
    const next = i < result.length - 1 ? result[i + 1].isCut !== false : true;
    if (prev && next) {
      const w = norm(result[i].text);
      if (!STANDALONE_OK.has(w) && w.length < 6) {
        result[i].isCut = true;
        fixes.push(`Isoliertes "${result[i].text}" entfernt`);
      }
    }
  }

  if (fixes.length > 0) {
    console.log(`[Coherence] ${fixes.length} fixes: ${fixes.join("; ")}`);
  }

  return { words: result, fixes };
}

function redetectSilences(
  amplitudes: number[],
  chunkDuration: number,
  totalDuration: number,
  settings: SilenceCutSettings,
): SilenceGap[] {
  if (!settings.enabled || amplitudes.length === 0) return [];
  const silences: SilenceGap[] = [];
  let silenceStart: number | null = null;
  for (let i = 0; i < amplitudes.length; i++) {
    const time = i * chunkDuration;
    const isSilent = amplitudes[i] < settings.threshold;
    if (isSilent && silenceStart === null) {
      silenceStart = time;
    } else if (!isSilent && silenceStart !== null) {
      const dur = time - silenceStart;
      if (dur >= settings.minDuration) {
        silences.push({
          start: silenceStart + settings.padding,
          end: Math.max(time - settings.padding * 0.5, silenceStart + settings.padding + 0.01),
        });
      }
      silenceStart = null;
    }
  }
  if (silenceStart !== null) {
    const dur = totalDuration - silenceStart;
    if (dur >= settings.minDuration) {
      silences.push({
        start: silenceStart + settings.padding,
        end: Math.max(totalDuration - settings.padding * 0.5, silenceStart + settings.padding + 0.01),
      });
    }
  }

  // Force-trim leading background noise (first 0.4s if mostly quiet)
  const leadChunks = Math.min(Math.ceil(0.4 / chunkDuration), amplitudes.length);
  const leadAvg = amplitudes.slice(0, leadChunks).reduce((a, b) => a + b, 0) / leadChunks;
  if (leadAvg < settings.threshold * 3) {
    // Find exact point where audio actually starts
    let firstLoudChunk = 0;
    for (let i = 0; i < amplitudes.length; i++) {
      if (amplitudes[i] >= settings.threshold * 2) {
        firstLoudChunk = i;
        break;
      }
    }
    const trimEnd = Math.max(firstLoudChunk * chunkDuration - 0.05, 0);
    if (trimEnd > 0.02) {
      // Remove any existing silence that overlaps with our forced trim
      const filtered = silences.filter(s => s.start >= trimEnd);
      silences.length = 0;
      silences.unshift({ start: 0, end: trimEnd });
      silences.push(...filtered);
    }
  }

  // Force-trim trailing background noise (last 0.4s if mostly quiet)
  const tailStart = Math.max(0, amplitudes.length - leadChunks);
  const tailAvg = amplitudes.slice(tailStart).reduce((a, b) => a + b, 0) / leadChunks;
  if (tailAvg < settings.threshold * 3) {
    // Find exact point where audio ends
    let lastLoudChunk = amplitudes.length - 1;
    for (let i = amplitudes.length - 1; i >= 0; i--) {
      if (amplitudes[i] >= settings.threshold * 2) {
        lastLoudChunk = i;
        break;
      }
    }
    const trimStart = Math.min((lastLoudChunk + 1) * chunkDuration + 0.05, totalDuration);
    if (totalDuration - trimStart > 0.02) {
      // Remove any existing silence that overlaps with our forced trim
      const filtered = silences.filter(s => s.end <= trimStart);
      const nonOverlapping = silences.filter(s => s.end > trimStart);
      if (nonOverlapping.length > 0) {
        // Keep only the non-overlapping parts
      }
      silences.length = 0;
      silences.push(...filtered);
      silences.push({ start: trimStart, end: totalDuration });
    }
  }

  return silences;
}

function reconcileSilencesWithTranscript(
  silences: SilenceGap[],
  transcript: TranscriptWord[],
): SilenceGap[] {
  if (transcript.length === 0) return silences;
  const result: SilenceGap[] = [];
  const MARGIN = 0.05;
  for (const gap of silences) {
    const overlapping = transcript.filter(
      (w) => w.end > gap.start + MARGIN && w.start < gap.end - MARGIN
    );
    if (overlapping.length === 0) { result.push(gap); continue; }
    let cursor = gap.start;
    for (const word of overlapping) {
      const subGapEnd = word.start - MARGIN;
      if (subGapEnd - cursor >= 0.1) result.push({ start: cursor, end: subGapEnd });
      cursor = word.end + MARGIN;
    }
    if (gap.end - cursor >= 0.1) result.push({ start: cursor, end: gap.end });
  }
  return result;
}

export function useVideoProjects() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const processingRef = useRef(new Set<string>());
  const projectsRef = useRef<VideoProject[]>([]);
  // Keep ref in sync so callbacks always see latest state
  projectsRef.current = projects;

  const updateProject = useCallback((id: string, updates: Partial<VideoProject>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const updateProjectStep = useCallback((id: string, stepIdx: number, upd: { done?: boolean; active?: boolean }) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, steps: p.steps.map((s, i) => (i === stepIdx ? { ...s, ...upd } : s)) }
          : p
      )
    );
  }, []);

  const processVideo = useCallback(async (project: VideoProject) => {
    if (processingRef.current.has(project.id)) return;
    processingRef.current.add(project.id);
    const id = project.id;

    try {
      // Step 1: Analyze audio
      const result = await analyzeAudio(project.file, {
        silenceThreshold: 0.015, // Initial pass — will be overridden by calibration
        minSilenceDuration: 0.4,
        chunkDuration: CHUNK_DURATION,
        onProgress: (p) => updateProject(id, { progress: p }),
      });

      updateProjectStep(id, 0, { done: true, active: false });
      updateProjectStep(id, 1, { active: true });
      updateProject(id, { 
        currentStep: "KI kalibriert Parameter...", 
        rawAmplitudes: result.rawAmplitudes, 
        duration: result.duration, 
        progress: 0 
      });

      // Step 2: Auto-calibrate — analyze audio profile and derive optimal settings per video
      const calibration = autoCalibrateFromAmplitudes(
        result.rawAmplitudes, CHUNK_DURATION, result.duration
      );
      console.log(`Auto-calibration (confidence ${calibration.confidence}/100): ${calibration.reasoning}`);

      // Apply calibrated silence settings
      const calibratedSC = calibration.silenceCut;
      updateProject(id, { 
        silenceCut: calibratedSC,
        calibrationReasoning: calibration.reasoning,
      });

      const detectedSilences = redetectSilences(
        result.rawAmplitudes, CHUNK_DURATION, result.duration, calibratedSC
      );

      updateProjectStep(id, 1, { done: true, active: false });
      updateProjectStep(id, 2, { active: true });
      updateProject(id, { currentStep: "Audio wird extrahiert..." });

      // Step 3: Transcribe (precise word-level timestamps)
      let transcriptResult: TranscriptWord[] = [];
      try {
        const audioBlob = await extractAudioBlob(project.file, 120);
        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
        updateProject(id, { currentStep: "Sprache wird erkannt..." });
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("language", "de");

        // Try primary speech engine first (precise word-level timestamps)
        let data: any = null;
        let usedProvider = "deepgram";
        try {
          const dgResult = await supabase.functions.invoke("transcribe-deepgram", { body: formData });
          if (dgResult.error) throw dgResult.error;
          data = dgResult.data;
        } catch (primaryErr) {
          console.warn("Primary transcription failed, falling back to AI:", primaryErr);
          usedProvider = "ai-fallback";
          updateProject(id, { currentStep: "KI transkribiert..." });
          const fbForm = new FormData();
          fbForm.append("audio", audioFile);
          fbForm.append("language", "de");
          const fbResult = await supabase.functions.invoke("transcribe", { body: fbForm });
          if (fbResult.error) throw fbResult.error;
          data = fbResult.data;
        }

        if (data?.transcript?.length > 0) {
          const cleaned = cleanTranscript(data.transcript);
          const deStuttered = markStutterRepeats(cleaned);
          const validated = validateAndRepairTranscript(deStuttered);
          if (validated.fixes.length > 0) {
            console.log(`Transcript validation: ${validated.fixes.length} fixes, score: ${validated.score}/100`);
          }

          // Primary engine timestamps are already precise — only align for AI fallback
          let finalWords = validated.words;
          if (usedProvider !== "deepgram") {
            const synced = alignTranscriptToAudioTimeline(validated.words, detectedSilences, result.duration);
            if (synced.appliedAdjustments > 0) {
              console.log(
                `Transcript sync alignment: ${synced.appliedAdjustments} adjusted words, shift ${synced.globalShiftMs}ms`
              );
            }
            finalWords = synced.words;
          } else {
            console.log(`Transcription: ${validated.words.length} words with native timestamps`);
          }

          // Final coherence pass — ensure the script reads as natural speech
          const coherent = validateScriptCoherence(finalWords);
          if (coherent.fixes.length > 0) {
            console.log(`Script coherence: ${coherent.fixes.length} fixes applied`);
          }
          transcriptResult = applyCorrections(coherent.words);
        } else throw new Error("Empty transcript");
      } catch {
        toast.info(`Demo-Transkript für ${project.file.name}`);
        transcriptResult = MOCK_TRANSCRIPT;
      }

      const reconciledSilences = reconcileSilencesWithTranscript(detectedSilences, transcriptResult);

      updateProjectStep(id, 2, { done: true, active: false });
      updateProjectStep(id, 3, { active: true });
      updateProject(id, { 
        currentStep: "Qualitätsprüfung...",
        transcript: transcriptResult,
        silences: reconciledSilences,
      });

      // Step 4: Sanity check — AI agent validates everything (auto-retry if score < 80)
      const MAX_RETRIES = 2;
      let currentTranscript = transcriptResult;
      let currentSilences = reconciledSilences;
      let lastCheck: any = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            updateProject(id, { currentStep: `Optimierung (Versuch ${attempt + 1})...` });
            toast.info(`🔄 ${project.file.name}: Score zu niedrig, Re-Kalibrierung #${attempt}...`);

            // Re-calibrate with tighter parameters based on previous issues
            const adjustedSC = { ...calibratedSC };
            adjustedSC.threshold = Math.max(0.005, adjustedSC.threshold * (1 - attempt * 0.15));
            adjustedSC.minDuration = Math.max(0.15, adjustedSC.minDuration * (1 - attempt * 0.1));
            adjustedSC.padding = Math.min(0.15, adjustedSC.padding + attempt * 0.02);
            updateProject(id, { silenceCut: adjustedSC });

            currentSilences = reconcileSilencesWithTranscript(
              redetectSilences(result.rawAmplitudes, CHUNK_DURATION, result.duration, adjustedSC),
              currentTranscript
            );
            updateProject(id, { silences: currentSilences });
          }

          const { data: checkData, error: checkError } = await supabase.functions.invoke("sanity-check", {
            body: {
              transcript: currentTranscript,
              silences: currentSilences,
              calibration: { reasoning: calibration.reasoning, confidence: calibration.confidence },
              duration: result.duration,
            },
          });

          if (!checkError && checkData?.result) {
            lastCheck = checkData.result;
            updateProject(id, { sanityCheck: lastCheck });
            console.log(`Sanity check attempt ${attempt + 1}:`, lastCheck);

            if (lastCheck.overall_score >= 80) {
              toast.success(`✅ ${project.file.name}: Export-bereit! (Score: ${lastCheck.overall_score}/100)`);
              break;
            }
          } else {
            break; // API error, don't retry
          }
        } catch (e) {
          console.warn(`Sanity check attempt ${attempt + 1} failed:`, e);
          break;
        }
      }

      // Final toast if still below threshold after all retries
      if (lastCheck && lastCheck.overall_score < 80) {
        toast.warning(`⚠️ ${project.file.name}: Score ${lastCheck.overall_score}/100 — manuelle Optimierung empfohlen`);
      }

      updateProjectStep(id, 3, { done: true, active: false });

      // Auto color grading: sample a frame from the video
      try {
        const grading = await new Promise<import("@/types/editor").ColorGradingSettings>((resolve) => {
          const tempVideo = document.createElement("video");
          tempVideo.src = project.url;
          tempVideo.muted = true;
          tempVideo.playsInline = true;
          tempVideo.preload = "auto";
          const onSeek = () => {
            tempVideo.removeEventListener("seeked", onSeek);
            const grade = autoGradeFromVideo(tempVideo);
            tempVideo.src = "";
            resolve(grade);
          };
          tempVideo.addEventListener("seeked", onSeek);
          tempVideo.addEventListener("loadeddata", () => {
            // Seek to 1s or 30% to get a representative frame
            tempVideo.currentTime = Math.min(1, (result?.duration ?? 3) * 0.3);
          });
          // Timeout fallback
          setTimeout(() => { tempVideo.src = ""; resolve(autoGradeFromVideo(tempVideo)); }, 3000);
        });
        updateProject(id, { colorGrading: grading });
        console.log("Auto color grading applied:", grading);
      } catch {
        console.warn("Auto color grading failed, using defaults");
      }

      updateProject(id, {
        currentStep: "Fertig!",
        phase: "ready",
      });
    } catch {
      toast.error(`${project.file.name}: Fehler, Demo-Daten`);
      updateProject(id, {
        transcript: MOCK_TRANSCRIPT,
        silences: MOCK_SILENCES,
        duration: 12,
        phase: "ready",
      });
    } finally {
      processingRef.current.delete(id);
    }
  }, [updateProject, updateProjectStep]);

  const addFiles = useCallback((files: File[]) => {
    const newProjects = files.map(createVideoProject);
    setProjects((prev) => {
      const updated = [...prev, ...newProjects];
      return updated;
    });
    // Set active to first new project if currently empty
    setProjects((prev) => {
      if (prev.length === newProjects.length) {
        setActiveIndex(0);
      }
      return prev;
    });
    // Process all new projects
    // Process all new projects
    preloadRemuxer();
    newProjects.forEach((p) => processVideo(p));
  }, [processVideo]);

  const removeProject = useCallback((id: string) => {
    setProjects((prev) => {
      const proj = prev.find((p) => p.id === id);
      if (proj) URL.revokeObjectURL(proj.url);
      const next = prev.filter((p) => p.id !== id);
      return next;
    });
    setActiveIndex((prev) => Math.min(prev, Math.max(0, projects.length - 2)));
  }, [projects.length]);

  const redetectForProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.rawAmplitudes.length === 0 || p.duration === 0) return p;
        const raw = redetectSilences(p.rawAmplitudes, CHUNK_DURATION, p.duration, p.silenceCut);
        return { ...p, silences: reconcileSilencesWithTranscript(raw, p.transcript) };
      })
    );
  }, []);

  const exportProject = useCallback(async (id: string) => {
    const proj = projectsRef.current.find((p) => p.id === id);
    if (!proj || proj.isExporting) return;
    if (proj.duration <= 0) {
      toast.error("Video hat keine gültige Dauer");
      return;
    }

    updateProject(id, { isExporting: true, exportProgress: "Skript-Prüfung..." });
    try {
      // Final coherence validation before export — ensure script makes sense
      const coherenceResult = validateScriptCoherence(proj.transcript);
      const finalTranscript = coherenceResult.words;
      if (coherenceResult.fixes.length > 0) {
        console.log(`[Export] Pre-export coherence: ${coherenceResult.fixes.length} fixes`);
        updateProject(id, { transcript: finalTranscript });
      }

      // Merge cut-word ranges into silences for export
      const effectiveSilences = mergeWordCutsWithSilences(finalTranscript, proj.silences);
      const visibleTranscript = getVisibleTranscript(finalTranscript);

      const segments = getActiveSegments(effectiveSilences, proj.duration);
      const exportSegments = segments.length > 0
        ? segments
        : [{ start: 0, end: proj.duration }];

      console.log(`[Export] ${exportSegments.length} segments, total duration: ${proj.duration.toFixed(1)}s`);

      const blob = await exportWithSubtitles({
        videoUrl: proj.url,
        segments: exportSegments,
        transcript: visibleTranscript,
        style: proj.subtitleStyle,
        silences: effectiveSilences,
        onProgress: (msg) => updateProject(id, { exportProgress: msg }),
      });

      if (!blob.type.includes("mp4")) {
        throw new Error("Export ist nicht als MP4 angekommen");
      }

      const ext = "mp4";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apexclip_${proj.file.name.replace(/\.[^.]+$/, "")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
      toast.success(`✅ ${proj.file.name} exportiert (${sizeMB} MB)`);
    } catch (e) {
      console.error("[Export] Failed:", e);
      toast.error(`Export fehlgeschlagen: ${e instanceof Error ? e.message : "Unbekannter Fehler"}`);
    } finally {
      updateProject(id, { isExporting: false, exportProgress: "" });
    }
  }, [updateProject]);

  const resetAll = useCallback(() => {
    projects.forEach((p) => URL.revokeObjectURL(p.url));
    setProjects([]);
    setActiveIndex(0);
  }, [projects]);

  const regenerateTranscript = useCallback(async (id: string) => {
    const proj = projectsRef.current.find((p) => p.id === id);
    if (!proj || proj.phase !== "ready") {
      toast.error("Projekt nicht bereit für Regenerierung");
      return;
    }
    toast.info("Transkript wird neu generiert...");
    try {
      const audioBlob = await extractAudioBlob(proj.file, 120);
      const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("language", "de");

      let data: any = null;
      try {
        const dgResult = await supabase.functions.invoke("transcribe-deepgram", { body: formData });
        if (dgResult.error) throw dgResult.error;
        data = dgResult.data;
      } catch {
        const fbForm = new FormData();
        fbForm.append("audio", audioFile);
        fbForm.append("language", "de");
        const fbResult = await supabase.functions.invoke("transcribe", { body: fbForm });
        if (fbResult.error) throw fbResult.error;
        data = fbResult.data;
      }

      if (data?.transcript?.length > 0) {
        const cleaned = cleanTranscript(data.transcript);
        const deStuttered = markStutterRepeats(cleaned);
        const validated = validateAndRepairTranscript(deStuttered);
        const latestProj = projectsRef.current.find((p) => p.id === id);
        const sc = latestProj?.silenceCut ?? proj.silenceCut;
        const rawSilences = redetectSilences(proj.rawAmplitudes, CHUNK_DURATION, proj.duration, sc);

        // Native timestamps are precise — skip re-alignment
        const coherent = validateScriptCoherence(validated.words);
        const corrected = applyCorrections(coherent.words);
        const reconciledSilences = reconcileSilencesWithTranscript(rawSilences, corrected);

        updateProject(id, {
          transcript: corrected,
          silences: reconciledSilences,
        });
        toast.success(`Neu transkribiert: ${validated.words.length} Wörter (Score: ${validated.score}/100)`);
      } else {
        throw new Error("Empty transcript");
      }
    } catch (e) {
      console.error("Regenerate failed:", e);
      toast.error("Transkription fehlgeschlagen");
    }
  }, [updateProject]);

  return {
    projects,
    activeIndex,
    setActiveIndex,
    activeProject: projects[activeIndex] ?? null,
    addFiles,
    removeProject,
    updateProject,
    redetectForProject,
    exportProject,
    resetAll,
    regenerateTranscript,
    hasProjects: projects.length > 0,
  };
}
