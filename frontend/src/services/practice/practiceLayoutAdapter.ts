/**
 * practiceLayoutAdapter.ts
 * Feature 001-practice-rust-layout
 *
 * Adapter functions that bridge the practice exercise domain and the
 * Rust/WASM layout engine (computeLayout + LayoutRenderer).
 *
 * Three pure functions (no side-effects, no state):
 *   serializeExerciseToLayoutInput  — exercise notes → WASM input JSON
 *   buildPracticeSourceToNoteIdMap  — source keys → note ids (for LayoutRenderer)
 *   findPracticeNoteX               — GlobalLayout glyph tree → note x (for auto-scroll)
 *
 * See specs/001-practice-rust-layout/contracts/ for full type contracts.
 */

import type { ExerciseNote } from '../../types/practice';
import type { GlobalLayout } from '../../wasm/layout';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Clef values accepted by the Rust layout engine */
export type LayoutClef = 'Treble' | 'Bass';

// ─── serializeExerciseToLayoutInput ──────────────────────────────────────────

/**
 * Converts an array of ExerciseNote objects into the JSON input object expected
 * by computeLayout (Rust WASM) for the exercise staff.
 *
 * Mapping rules:
 *  - tick     = slotIndex × 960  (quarter-note at 960 PPQ)
 *  - duration = 960              (all quarter notes)
 *  - pitch    = midiPitch        (integer MIDI note number)
 *  - instrument id = "practice-instrument" (matches buildPracticeSourceToNoteIdMap)
 *
 * @param notes   Ordered exercise notes (sorted by slotIndex ascending)
 * @param clef    Clef for the staff ("Treble" | "Bass")
 */
export function serializeExerciseToLayoutInput(
  notes: ExerciseNote[],
  clef: LayoutClef,
) {
  return {
    instruments: [
      {
        id: 'practice-instrument' as const,
        name: 'Piano',
        staves: [
          {
            clef,
            time_signature: { numerator: 4, denominator: 4 },
            key_signature: { sharps: 0 },
            voices: [
              {
                notes: notes.map((n) => ({
                  tick: n.slotIndex * 960,
                  duration: 960,
                  pitch: n.midiPitch,
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── buildPracticeSourceToNoteIdMap ──────────────────────────────────────────

/**
 * Builds the Map<SourceKey, NoteId> that LayoutRenderer uses to resolve a
 * glyph's SourceReference to a note id for highlight comparison.
 *
 * Key format: "0/practice-instrument/0/0/{slotIndex}"
 *   system_index  = 0   (always single system)
 *   instrument_id = "practice-instrument"
 *   staff_index   = 0
 *   voice_index   = 0
 *   event_index   = slotIndex
 *
 * Value format: "ex-{slotIndex}"  (matches ExerciseNote.id)
 *
 * @param notes Exercise notes (each must have id = "ex-{slotIndex}")
 */
export function buildPracticeSourceToNoteIdMap(
  notes: ExerciseNote[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const note of notes) {
    const key = `0/practice-instrument/0/0/${note.slotIndex}`;
    map.set(key, note.id);
  }
  return map;
}

// ─── findPracticeNoteX ────────────────────────────────────────────────────────

/**
 * Locates the x-position (logical units) of the notehead glyph for a given
 * slotIndex in a computed GlobalLayout.
 *
 * Walk path: systems[0] → staff_groups[0] → staves[0] → glyph_runs → glyphs
 * Match condition: glyph.source_reference.event_index === slotIndex
 *
 * Returns null if:
 *   - layout has no systems
 *   - layout.systems[0] has no staff_groups
 *   - layout.systems[0].staff_groups[0] has no staves
 *   - no glyph with a matching event_index is found
 *
 * @param layout    The GlobalLayout returned by computeLayout
 * @param slotIndex The 0-based slot index of the exercise note to locate
 * @returns x position in logical units, or null
 */
export function findPracticeNoteX(
  layout: GlobalLayout,
  slotIndex: number,
): number | null {
  const system = layout.systems[0];
  if (!system) return null;

  const staffGroup = system.staff_groups[0];
  if (!staffGroup) return null;

  const stave = staffGroup.staves[0];
  if (!stave) return null;

  for (const run of stave.glyph_runs) {
    for (const glyph of run.glyphs) {
      if (glyph.source_reference.event_index === slotIndex) {
        return glyph.position.x;
      }
    }
  }

  return null;
}

// ─── serializeResponseToLayoutInput ──────────────────────────────────────────

/**
 * Converts recorded response notes into the WASM layout input for the response
 * staff. Each response note is placed at the same tick as its exercise slot
 * for visual alignment with the exercise staff above it.
 *
 * Mapping rules:
 *  - tick     = slotIndex × 960      (aligns with exercise staff)
 *  - duration = 960                   (displayed as quarter note)
 *  - pitch    = Math.round(midiCents / 100)  (integer MIDI from fractional cents)
 *
 * Missed slots (no response note) are omitted — the Rust engine will render
 * them as rests automatically.
 *
 * @param responseNotes   Matched response notes with slotIndex populated
 * @param clef            Clef for the staff (matches exercise staff)
 */
export function serializeResponseToLayoutInput(
  responseNotes: Array<{ slotIndex: number; midiCents: number }>,
  clef: LayoutClef,
) {
  return {
    instruments: [
      {
        id: 'practice-instrument' as const,
        name: 'Piano',
        staves: [
          {
            clef,
            time_signature: { numerator: 4, denominator: 4 },
            key_signature: { sharps: 0 },
            voices: [
              {
                notes: responseNotes.map((n) => ({
                  tick: n.slotIndex * 960,
                  duration: 960,
                  pitch: Math.round(n.midiCents / 100),
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}
