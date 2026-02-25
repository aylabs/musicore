/**
 * practiceLayoutAdapter.test.ts
 * Feature 001-practice-rust-layout — T004 (test-first, written before implementation)
 *
 * Tests for serializeExerciseToLayoutInput, buildPracticeSourceToNoteIdMap,
 * and findPracticeNoteX (in practiceLayoutAdapter.ts).
 *
 * Principle V (Test-First): these tests are written before the implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  serializeExerciseToLayoutInput,
  buildPracticeSourceToNoteIdMap,
  findPracticeNoteX,
} from '../../src/services/practice/practiceLayoutAdapter';
import type { ExerciseNote } from '../../src/types/practice';
import type { GlobalLayout, GlyphRun, Glyph } from '../../src/wasm/layout';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal ExerciseNote[] as exerciseGenerator would produce.
 * Each note has id = "ex-{i}" and slotIndex = i.
 */
function makeNotes(count: number, midiPitch = 60): ExerciseNote[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ex-${i}`,
    slotIndex: i,
    midiPitch,
    expectedOnsetMs: i * 750, // 80 bpm
  }));
}

/**
 * Build a minimal GlobalLayout stub containing a single system with one glyph
 * at the given slotIndex, positioned at (x, y).
 */
function makeMinimalLayout(slotIndex: number, x: number): GlobalLayout {
  const glyph: Glyph = {
    position: { x, y: 100 },
    bounding_box: { x, y: 90, width: 20, height: 20 },
    codepoint: '\uE0A4', // quarter notehead
    source_reference: {
      instrument_id: 'practice-instrument',
      staff_index: 0,
      voice_index: 0,
      event_index: slotIndex,
    },
  };

  const glyphRun: GlyphRun = {
    glyphs: [glyph],
    font_family: 'Bravura',
    font_size: 40,
    color: { r: 0, g: 0, b: 0, a: 255 },
    opacity: 1,
  };

  return {
    total_width: 1000,
    total_height: 200,
    units_per_space: 10,
    systems: [
      {
        index: 0,
        bounding_box: { x: 0, y: 0, width: 1000, height: 200 },
        tick_range: { start_tick: 0, end_tick: 3840 },
        staff_groups: [
          {
            instrument_id: 'practice-instrument',
            instrument_name: 'Piano',
            bracket_type: 'None',
            staves: [
              {
                staff_lines: [],
                structural_glyphs: [],
                glyph_runs: [glyphRun],
                bar_lines: [],
                ledger_lines: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── serializeExerciseToLayoutInput ──────────────────────────────────────────

describe('serializeExerciseToLayoutInput', () => {
  it('produces a single instrument with id "practice-instrument"', () => {
    const notes = makeNotes(4);
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    expect(result.instruments).toHaveLength(1);
    expect(result.instruments[0].id).toBe('practice-instrument');
  });

  it('produces a single staff with the requested clef', () => {
    const notes = makeNotes(4);
    const treble = serializeExerciseToLayoutInput(notes, 'Treble');
    expect(treble.instruments[0].staves[0].clef).toBe('Treble');

    const bass = serializeExerciseToLayoutInput(notes, 'Bass');
    expect(bass.instruments[0].staves[0].clef).toBe('Bass');
  });

  it('uses 4/4 time signature', () => {
    const notes = makeNotes(4);
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    const ts = result.instruments[0].staves[0].time_signature;
    expect(ts.numerator).toBe(4);
    expect(ts.denominator).toBe(4);
  });

  it('maps each note to tick = slotIndex × 960', () => {
    const notes = makeNotes(4);
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    const voiceNotes = result.instruments[0].staves[0].voices[0].notes;
    for (let i = 0; i < 4; i++) {
      expect(voiceNotes[i].tick).toBe(i * 960);
    }
  });

  it('all notes have duration 960 (quarter note)', () => {
    const notes = makeNotes(8);
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    const voiceNotes = result.instruments[0].staves[0].voices[0].notes;
    for (const n of voiceNotes) {
      expect(n.duration).toBe(960);
    }
  });

  it('passes through the midiPitch as pitch', () => {
    const notes = makeNotes(3, 64); // E4
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    const voiceNotes = result.instruments[0].staves[0].voices[0].notes;
    for (const n of voiceNotes) {
      expect(n.pitch).toBe(64);
    }
  });

  it('produces the correct note count', () => {
    for (const count of [1, 8, 16, 20]) {
      const notes = makeNotes(count);
      const result = serializeExerciseToLayoutInput(notes, 'Treble');
      expect(result.instruments[0].staves[0].voices[0].notes).toHaveLength(count);
    }
  });

  it('handles a single-note exercise', () => {
    const notes = makeNotes(1);
    const result = serializeExerciseToLayoutInput(notes, 'Treble');
    expect(result.instruments[0].staves[0].voices[0].notes).toHaveLength(1);
    expect(result.instruments[0].staves[0].voices[0].notes[0].tick).toBe(0);
  });
});

// ─── buildPracticeSourceToNoteIdMap ──────────────────────────────────────────

describe('buildPracticeSourceToNoteIdMap', () => {
  it('maps source key "0/practice-instrument/0/0/{slotIndex}" → "ex-{slotIndex}"', () => {
    const notes = makeNotes(4);
    const map = buildPracticeSourceToNoteIdMap(notes);

    for (let i = 0; i < 4; i++) {
      const key = `0/practice-instrument/0/0/${i}`;
      expect(map.get(key)).toBe(`ex-${i}`);
    }
  });

  it('returns a Map with exactly noteCount entries', () => {
    const notes = makeNotes(8);
    const map = buildPracticeSourceToNoteIdMap(notes);
    expect(map.size).toBe(8);
  });

  it('single-note exercise produces one entry', () => {
    const notes = makeNotes(1);
    const map = buildPracticeSourceToNoteIdMap(notes);
    expect(map.size).toBe(1);
    expect(map.get('0/practice-instrument/0/0/0')).toBe('ex-0');
  });

  it('returns an empty Map for empty notes array', () => {
    const map = buildPracticeSourceToNoteIdMap([]);
    expect(map.size).toBe(0);
  });
});

// ─── findPracticeNoteX ────────────────────────────────────────────────────────

describe('findPracticeNoteX', () => {
  it('returns the x position of glyph whose event_index matches slotIndex', () => {
    const expectedX = 350;
    const layout = makeMinimalLayout(0, expectedX);
    const x = findPracticeNoteX(layout, 0);
    expect(x).toBe(expectedX);
  });

  it('returns correct x for a non-zero slotIndex in a multi-glyph layout', () => {
    // Build a layout with two glyphs at different event_index values
    const glyph0: Glyph = {
      position: { x: 100, y: 100 },
      bounding_box: { x: 100, y: 90, width: 20, height: 20 },
      codepoint: '\uE0A4',
      source_reference: { instrument_id: 'practice-instrument', staff_index: 0, voice_index: 0, event_index: 0 },
    };
    const glyph3: Glyph = {
      position: { x: 420, y: 100 },
      bounding_box: { x: 420, y: 90, width: 20, height: 20 },
      codepoint: '\uE0A4',
      source_reference: { instrument_id: 'practice-instrument', staff_index: 0, voice_index: 0, event_index: 3 },
    };
    const singleRun: GlyphRun = {
      glyphs: [glyph0, glyph3],
      font_family: 'Bravura',
      font_size: 40,
      color: { r: 0, g: 0, b: 0, a: 255 },
      opacity: 1,
    };
    const layout: GlobalLayout = {
      total_width: 1000,
      total_height: 200,
      units_per_space: 10,
      systems: [
        {
          index: 0,
          bounding_box: { x: 0, y: 0, width: 1000, height: 200 },
          tick_range: { start_tick: 0, end_tick: 3840 },
          staff_groups: [
            {
              instrument_id: 'practice-instrument',
              instrument_name: 'Piano',
              bracket_type: 'None',
              staves: [
                {
                  staff_lines: [],
                  structural_glyphs: [],
                  glyph_runs: [singleRun],
                  bar_lines: [],
                  ledger_lines: [],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(findPracticeNoteX(layout, 0)).toBe(100);
    expect(findPracticeNoteX(layout, 3)).toBe(420);
  });

  it('returns null if the slotIndex is not found in any glyph', () => {
    const layout = makeMinimalLayout(0, 100);
    const x = findPracticeNoteX(layout, 99); // slotIndex 99 doesn't exist
    expect(x).toBeNull();
  });

  it('returns null for an empty layout (no systems)', () => {
    const emptyLayout: GlobalLayout = {
      total_width: 0,
      total_height: 0,
      units_per_space: 10,
      systems: [],
    };
    expect(findPracticeNoteX(emptyLayout, 0)).toBeNull();
  });

  it('returns null for a layout with a system but no staff groups', () => {
    const layout: GlobalLayout = {
      total_width: 100,
      total_height: 200,
      units_per_space: 10,
      systems: [
        {
          index: 0,
          bounding_box: { x: 0, y: 0, width: 100, height: 200 },
          tick_range: { start_tick: 0, end_tick: 3840 },
          staff_groups: [],
        },
      ],
    };
    expect(findPracticeNoteX(layout, 0)).toBeNull();
  });
});
