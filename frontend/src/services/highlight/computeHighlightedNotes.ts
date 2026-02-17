/**
 * Compute Highlighted Notes
 * Feature 019 - Playback Note Highlighting
 * Feature 024 - Performance Optimization: Delegates to HighlightIndex for O(log n) lookup
 * 
 * Pure function that determines which notes should be highlighted
 * based on the current playback position.
 */

import type { Note } from '../../types/score';
import { HighlightIndex } from './HighlightIndex';

// Feature 024 (T019): Shared HighlightIndex instance for delegation.
// Built lazily on first call with a new notes array.
let cachedIndex: HighlightIndex | null = null;
let cachedNotesRef: Note[] | null = null;

/**
 * Computes the set of note IDs that are currently playing at a given tick position.
 * 
 * Feature 024 (T019): Now delegates to HighlightIndex for O(log n + k) lookup
 * instead of O(n) linear scan. The index is built once per unique notes array
 * and reused for subsequent queries.
 * 
 * @param notes - Array of all notes in the score
 * @param currentTick - Current playback position in ticks (PPQ units, 960 per quarter note)
 * @returns Set of note IDs that are actively playing at currentTick
 * 
 * @example
 * ```typescript
 * const notes = [
 *   { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
 *   { id: '2', start_tick: 960, duration_ticks: 960, pitch: 62 }
 * ];
 * 
 * computeHighlightedNotes(notes, 500);  // Returns Set(['1'])
 * computeHighlightedNotes(notes, 1000); // Returns Set(['2'])
 * computeHighlightedNotes(notes, 2000); // Returns Set([])
 * ```
 */
export function computeHighlightedNotes(
  notes: Note[],
  currentTick: number
): Set<string> {
  // Feature 024 (T019): Rebuild index only when notes array changes
  if (notes !== cachedNotesRef) {
    if (!cachedIndex) {
      cachedIndex = new HighlightIndex();
    }
    cachedIndex.build(notes);
    cachedNotesRef = notes;
  }

  // Feature 024 (T019): Delegate to O(log n + k) binary search
  const playingIds = cachedIndex!.findPlayingNoteIds(currentTick);
  return new Set(playingIds);
}
