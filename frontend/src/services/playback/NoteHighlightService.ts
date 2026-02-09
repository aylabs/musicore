import type { Note } from '../../types/score';
import type { NoteHighlight, HighlightResult } from '../../types/notation/layout';

/**
 * NoteHighlightService - Pure service for note highlighting logic
 * 
 * Feature 009 - Playback Scroll and Highlight: User Story 2
 * 
 * Identifies which notes are currently playing based on currentTick position.
 * Uses linear scan O(n) with tick range filtering for simplicity and clarity.
 * 
 * Performance: Acceptable for typical scores (<1000 notes per staff).
 * For large scores, could optimize with spatial index or binary search.
 */
export class NoteHighlightService {
  /**
   * Get IDs of notes that are currently playing at the given tick
   * 
   * @param notes - Array of notes to check
   * @param currentTick - Current playback position in ticks
   * @param minimumDuration - Minimum visual duration in ticks (default: 0)
   * @returns Array of note IDs that are currently playing
   * 
   * @example
   * ```typescript
   * const notes = [
   *   { id: 'n1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
   *   { id: 'n2', start_tick: 100, duration_ticks: 100, pitch: 62, velocity: 80 },
   * ];
   * 
   * NoteHighlightService.getPlayingNoteIds(notes, 50); // Returns ['n1']
   * NoteHighlightService.getPlayingNoteIds(notes, 150); // Returns ['n2']
   * ```
   */
  static getPlayingNoteIds(
    notes: Note[],
    currentTick: number,
    minimumDuration: number = 0
  ): string[] {
    const playingNoteIds: string[] = [];

    for (const note of notes) {
      const effectiveDuration = Math.max(note.duration_ticks, minimumDuration);
      const endTick = note.start_tick + effectiveDuration;

      // Note is playing if currentTick is within [start_tick, end_tick)
      if (currentTick >= note.start_tick && currentTick < endTick) {
        playingNoteIds.push(note.id);
      }
    }

    return playingNoteIds;
  }

  /**
   * Get detailed highlight information for currently playing notes
   * 
   * Returns both an array of playing note IDs (for quick lookups) and
   * a map with full highlight details (for advanced use cases).
   * 
   * @param notes - Array of notes to check
   * @param currentTick - Current playback position in ticks
   * @param minimumDuration - Minimum visual duration in ticks (default: 0)
   * @returns HighlightResult with playingNoteIds array and highlightMap
   * 
   * @example
   * ```typescript
   * const result = NoteHighlightService.getHighlightDetails(notes, 50);
   * console.log(result.playingNoteIds); // ['n1', 'n2']
   * console.log(result.highlightMap.get('n1')); // { noteId: 'n1', startTick: 0, endTick: 100, isPlaying: true }
   * ```
   */
  static getHighlightDetails(
    notes: Note[],
    currentTick: number,
    minimumDuration: number = 0
  ): HighlightResult {
    const playingNoteIds: string[] = [];
    const highlightMap = new Map<string, NoteHighlight>();

    for (const note of notes) {
      const effectiveDuration = Math.max(note.duration_ticks, minimumDuration);
      const endTick = note.start_tick + effectiveDuration;

      // Note is playing if currentTick is within [start_tick, end_tick)
      if (currentTick >= note.start_tick && currentTick < endTick) {
        playingNoteIds.push(note.id);

        highlightMap.set(note.id, {
          noteId: note.id,
          startTick: note.start_tick,
          endTick,
          isPlaying: true,
        });
      }
    }

    return {
      playingNoteIds,
      highlightMap,
    };
  }
}
