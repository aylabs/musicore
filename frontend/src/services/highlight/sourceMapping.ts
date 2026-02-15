/**
 * Source Reference to Note ID Mapping Utility
 * Feature 019 - Playback Note Highlighting
 * 
 * Maps layout GlyphRun SourceReferences back to domain Note IDs.
 * Required because the layout engine uses indices (instrument_id, staff_index,
 * voice_index, event_index) while highlighting operates on Note UUIDs.
 */

import type { Score, Note } from '../../types/score';
import type { SourceReference, GlobalLayout } from '../../wasm/layout';

/**
 * Composite key for sourceReference lookup
 * Format: "{system_index}/{instrument_id}/{staff_index}/{voice_index}/{event_index}"
 * System index added because event_index restarts per system
 */
type SourceKey = string;

/**
 * Build a map from SourceReference keys to Note IDs
 * 
 * Iterates through the score hierarchy to create a lookup table that
 * maps layout source references (indices) to domain note IDs (UUIDs).
 * Uses instrument IDs from the layout result to ensure keys match.
 * 
 * @param score - The domain score model
 * @param layout - The computed layout (to extract instrument IDs)
 * @returns Map from composite source key to note ID
 * 
 * @example
 * ```tsx
 * const score = await loadScore();
 * const layout = await computeLayout(...);
 * const sourceToNoteId = buildSourceToNoteIdMap(score, layout);
 * 
 * // Later, when rendering a GlyphRun:
 * const noteId = sourceToNoteId.get(sourceKey(glyphRun.source_reference));
 * const isHighlighted = highlightedNoteIds.has(noteId);
 * ```
 */
/**
 * Build a map from SourceReference keys to Note objects (not just IDs)
 * Returns notes themselves so we can validate tick positions during rendering
 */
export function buildSourceToNoteMap(score: Score, layout: GlobalLayout | null): Map<SourceKey, Note> {
  const map = new Map<SourceKey, Note>();

  if (!layout || layout.systems.length === 0) {
    return map;
  }

  // Process each system separately (event_index is system/measure-relative)
  for (const system of layout.systems) {
    const { start_tick, end_tick } = system.tick_range;

    for (const staffGroup of system.staff_groups) {
      const instrumentId = staffGroup.instrument_id;
      
      // Find matching instrument in score (by ID or fallback to first)
      const instrument = score.instruments.find(inst => inst.id === instrumentId) || score.instruments[0];
      if (!instrument) continue;

      instrument.staves.forEach((staff, staffIndex) => {
        staff.voices.forEach((voice, voiceIndex) => {
          // Filter notes within this system's tick range
          const notesInSystem = voice.interval_events.filter((note: Note) => 
            note.start_tick >= start_tick && note.start_tick < end_tick
          );

          // Map each note using its local index within this system
          notesInSystem.forEach((note: Note, localIndex) => {
            const key = createSourceKey({
              system_index: system.index,
              instrument_id: instrumentId,
              staff_index: staffIndex,
              voice_index: voiceIndex,
              event_index: localIndex, // Use local index within system
            });

            map.set(key, note);
          });
        });
      });
    }
  }

  return map;
}

/**
 * Build a map from SourceReference keys to Note IDs
 * Backward compatibility wrapper
 */
export function buildSourceToNoteIdMap(score: Score, layout: GlobalLayout | null): Map<SourceKey, string> {
  const noteMap = buildSourceToNoteMap(score, layout);
  const idMap = new Map<SourceKey, string>();
  
  for (const [key, note] of noteMap.entries()) {
    idMap.set(key, note.id);
  }
  
  return idMap;
}

/**
 * Create a composite key from SourceReference and system index
 * 
 * @param ref - Source reference from layout GlyphRun (must include system_index)
 * @returns Composite string key
 */
export function createSourceKey(ref: SourceReference & { system_index: number }): SourceKey {
  return `${ref.system_index}/${ref.instrument_id}/${ref.staff_index}/${ref.voice_index}/${ref.event_index}`;
}

/**
 * Get note ID from SourceReference using the precomputed map
 * 
 * @param ref - Source reference from layout GlyphRun
 * @param systemIndex - System index (event_index is system-relative)
 * @param sourceToNoteId - Precomputed map from buildSourceToNoteIdMap
 * @returns Note ID (UUID) or undefined if not found
 */
export function getNoteId(
  ref: SourceReference,
  systemIndex: number,
  sourceToNoteId: Map<SourceKey, string>
): string | undefined {
  const key = createSourceKey({ ...ref, system_index: systemIndex });
  return sourceToNoteId.get(key);
}
