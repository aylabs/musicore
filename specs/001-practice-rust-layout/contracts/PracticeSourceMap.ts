/**
 * PracticeSourceMap.ts
 * Feature 001-practice-rust-layout — Phase 1 Contract
 *
 * Contracts for the practice-specific source-reference mapping and
 * glyph-position lookup utilities in practiceLayoutAdapter.ts.
 *
 * These replace the score-domain-coupled buildSourceToNoteIdMap()
 * from services/highlight/sourceMapping.ts for the practice context.
 */

import type { GlobalLayout } from '../../../frontend/src/wasm/layout';
import type { ExerciseNote } from '../../../frontend/src/types/practice';

// ─── Source key ───────────────────────────────────────────────────────────────

/**
 * Source key format used by LayoutRenderer's HighlightIndex.
 * Format: "{system_index}/{instrument_id}/{staff_index}/{voice_index}/{event_index}"
 *
 * For practice staves:
 *   system_index  = 0 (always single system)
 *   instrument_id = "practice-instrument"
 *   staff_index   = 0
 *   voice_index   = 0
 *   event_index   = slotIndex
 *
 * Example for slot 3: "0/practice-instrument/0/0/3"
 */
export type PracticeSourceKey = string;

/**
 * Note ID assigned to each exercise slot.
 * Format: "ex-{slotIndex}"
 *
 * Example for slot 3: "ex-3"
 */
export type PracticeNoteId = string;

// ─── Serialization function ───────────────────────────────────────────────────

/**
 * Signature for serializeExerciseToLayoutInput.
 *
 * Converts an array of ExerciseNote objects into the JSON object
 * expected by computeLayout (Rust WASM).
 *
 * All notes are serialized as quarter notes (duration = 960 ticks).
 * Tick position = slotIndex × 960.
 *
 * @param notes   - Ordered exercise notes (sorted by slotIndex ascending)
 * @param clef    - Clef for the staff ("Treble" | "Bass")
 * @returns       ExerciseLayoutInput object ready for JSON.stringify + computeLayout
 */
export declare function serializeExerciseToLayoutInput(
  notes: ExerciseNote[],
  clef: 'Treble' | 'Bass',
): import('./ExerciseLayoutInput').ExerciseLayoutInput;

// ─── Source map function ──────────────────────────────────────────────────────

/**
 * Signature for buildPracticeSourceToNoteIdMap.
 *
 * Builds the Map<SourceKey, NoteId> that LayoutRenderer uses to resolve
 * a glyph's SourceReference to the note's id for highlight comparison.
 *
 * @param notes - The exercise notes (each must have id = "ex-{slotIndex}")
 * @returns     Map from PracticeSourceKey to PracticeNoteId
 *
 * @example
 * ```typescript
 * const map = buildPracticeSourceToNoteIdMap(exercise.notes);
 * // map.get("0/practice-instrument/0/0/0") === "ex-0"
 * // map.get("0/practice-instrument/0/0/7") === "ex-7"
 * ```
 */
export declare function buildPracticeSourceToNoteIdMap(
  notes: ExerciseNote[],
): Map<PracticeSourceKey, PracticeNoteId>;

// ─── Scroll helper function ───────────────────────────────────────────────────

/**
 * Signature for findPracticeNoteX.
 *
 * Locates the logical-unit x-coordinate of the notehead glyph for a
 * given slotIndex in a computed GlobalLayout.
 *
 * Iterates: systems[0] → staff_groups[0] → staves[0] → glyph_runs → glyphs
 * Matches: glyph.source_reference.event_index === slotIndex
 *
 * To convert to CSS pixels: x * BASE_SCALE (BASE_SCALE = 0.5)
 *
 * @param layout     - The GlobalLayout returned by computeLayout
 * @param slotIndex  - The 0-based slot index of the note to find
 * @returns          x in logical units, or null if not found (empty layout / reset)
 */
export declare function findPracticeNoteX(
  layout: GlobalLayout,
  slotIndex: number,
): number | null;
