/**
 * useNoteHighlight Hook
 * Feature 019 - Playback Note Highlighting
 * 
 * React hook that computes which notes should be highlighted based on
 * current playback position and status.
 * 
 * Performance: Uses useMemo to prevent unnecessary recalculations during
 * the 60 Hz playback update cycle. Only recomputes when inputs change.
 */

import { useMemo } from 'react';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { computeHighlightedNotes } from './computeHighlightedNotes';

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
 * **Performance:**
 * - Optimized with useMemo to prevent recalculation on every render
 * - Only recalculates when notes, currentTick, or status changes
 * - Computation time: <2ms for 1000 notes (linear scan O(n))
 */
export function useNoteHighlight(
  notes: Note[],
  currentTick: number,
  status: PlaybackStatus
): Set<string> {
  return useMemo(() => {
    // Return empty set when playback is stopped
    if (status === 'stopped') {
      return new Set<string>();
    }

    // For 'playing' and 'paused', compute highlights at current position
    // This allows paused state to show which notes were playing when paused
    return computeHighlightedNotes(notes, currentTick);
  }, [notes, currentTick, status]);
}
