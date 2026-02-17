/**
 * useNoteHighlight Hook
 * Feature 019 - Playback Note Highlighting
 * Feature 024 - Performance: Stable Set reference eliminates per-frame allocations
 * 
 * React hook that computes which notes should be highlighted based on
 * current playback position and status.
 * 
 * Performance: Uses useMemo with stable Set reference to prevent
 * unnecessary allocations during the playback update cycle. Only creates
 * a new Set when the highlighted note contents actually change.
 */

import { useMemo, useRef } from 'react';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { computeHighlightedNotes } from './computeHighlightedNotes';

/** Empty Set singleton — avoids allocating a new empty Set on every stopped frame */
const EMPTY_SET = new Set<string>();

/**
 * Compare a Set with a new Set for content equality.
 * O(k) where k = set size (typically 1-6 notes).
 */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/**
 * Hook to manage note highlighting state synchronized with playback
 * 
 * @param notes - Array of all notes in the score
 * @param currentTick - Current playback position in ticks (from MusicTimeline)
 * @param status - Playback status ('playing' | 'paused' | 'stopped')
 * @returns Set of note IDs that should be highlighted
 * 
 * @example
 * ```tsx
 * const { currentTick, status } = usePlayback(notes, tempo);
 * const highlightedNoteIds = useNoteHighlight(notes, currentTick, status);
 * 
 * // Pass to LayoutRenderer
 * <LayoutRenderer highlightedNoteIds={highlightedNoteIds} />
 * ```
 * 
 * **Behavior by status:**
 * - `stopped`: Returns empty Set (no highlights)
 * - `playing`: Returns Set of currently playing note IDs
 * - `paused`: Returns Set of note IDs playing at pause position
 * 
 * **Performance (Feature 024):**
 * - Delegates to HighlightIndex for O(log n + k) lookup
 * - Stable Set reference: only creates new Set when contents change
 * - Eliminates ~60 unnecessary allocations per second during playback
 */
export function useNoteHighlight(
  notes: Note[],
  currentTick: number,
  status: PlaybackStatus
): Set<string> {
  const prevSetRef = useRef<Set<string>>(EMPTY_SET);

  return useMemo(() => {
    // Return empty set when playback is stopped
    if (status === 'stopped') {
      prevSetRef.current = EMPTY_SET;
      return EMPTY_SET;
    }

    // For 'playing' and 'paused', compute highlights at current position
    const newSet = computeHighlightedNotes(notes, currentTick);

    // Feature 024 (T020): Stable Set reference — only return new Set
    // when contents actually change. Prevents downstream React re-renders.
    if (setsEqual(prevSetRef.current, newSet)) {
      return prevSetRef.current;
    }

    prevSetRef.current = newSet;
    return newSet;
  }, [notes, currentTick, status]);
}
