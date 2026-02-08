/**
 * ChordDetector Service
 * 
 * Detects potential chords by grouping notes at the same tick position.
 * Uses tick-based grouping with O(n) performance.
 */

import type { Note } from '../../types/score';

/**
 * ChordDetector - Detects potential chords from notes
 * 
 * Pure function service (no state, no dependencies)
 */
export class ChordDetector {
  /**
   * Group notes by tick position
   * 
   * Uses Map.reduce pattern for O(n) performance.
   * Groups notes that have identical start_tick values.
   * 
   * @param notes - Array of notes to analyze
   * @returns Map of tick position to notes at that tick
   */
  groupByTick(notes: Note[]): Map<number, Note[]> {
    return notes.reduce((groups, note) => {
      const tick = note.start_tick;
      const existing = groups.get(tick) || [];
      groups.set(tick, [...existing, note]);
      return groups;
    }, new Map<number, Note[]>());
  }

  /**
   * Filter groups that have 2+ notes (potential chords)
   * 
   * Single notes are not chords, so only groups with 2 or more
   * notes are considered chord candidates.
   * 
   * @param groups - Map from groupByTick
   * @returns Array of note groups with 2+ notes
   */
  filterChordCandidates(
    groups: Map<number, Note[]>
  ): Array<{ tick: number; notes: Note[] }> {
    const candidates: Array<{ tick: number; notes: Note[] }> = [];
    
    groups.forEach((notes, tick) => {
      if (notes.length >= 2) {
        candidates.push({ tick, notes });
      }
    });
    
    return candidates;
  }
}
