/**
 * T002: Regression test — key signature numeric extraction
 *
 * The Rust backend serializes KeySignature(i8) as a plain JSON number (e.g., 1 for G major).
 * LayoutView.convertScoreToLayoutFormat() must forward that number as `keySharps`.
 *
 * Before the fix: keySharps is always 0 because keyMap[1] is undefined.
 */

import { describe, it, expect } from 'vitest';
import { convertScoreToLayoutFormat } from '../../src/components/layout/LayoutView';
import type { Score } from '../../src/types/score';

/** Minimal Score with a numeric key signature (runtime format from Rust serde) */
function makeScoreWithKeySig(keySigValue: number): Score {
  return {
    id: 'test-score',
    schema_version: 2,
    global_structural_events: [
      { TimeSignature: { tick: 0, numerator: 4, denominator: 4 } },
    ],
    instruments: [
      {
        id: 'inst-1',
        name: 'Piano',
        instrument_type: 'piano',
        staves: [
          {
            id: 'staff-1',
            active_clef: 'Treble',
            staff_structural_events: [
              { Clef: { tick: 0, clef_type: 'Treble' } },
              // Simulate Rust serde: KeySignature(i8) → number
              { KeySignature: { tick: 0, key: keySigValue as any } },
            ],
            voices: [
              {
                id: 'voice-1',
                interval_events: [
                  {
                    id: 'note-1',
                    start_tick: 0,
                    duration_ticks: 960,
                    pitch: 60,
                    spelling: { step: 'C', alter: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as Score;
}

describe('LayoutView - Key signature extraction', () => {
  it('should extract keySharps = 1 for G major (numeric key sig from Rust)', () => {
    const score = makeScoreWithKeySig(1);
    const result = convertScoreToLayoutFormat(score);
    expect(result.instruments[0].staves[0].key_signature.sharps).toBe(1);
  });

  it('should extract keySharps = -3 for Eb major (numeric key sig from Rust)', () => {
    const score = makeScoreWithKeySig(-3);
    const result = convertScoreToLayoutFormat(score);
    expect(result.instruments[0].staves[0].key_signature.sharps).toBe(-3);
  });

  it('should extract keySharps = 0 for C major (numeric key sig from Rust)', () => {
    const score = makeScoreWithKeySig(0);
    const result = convertScoreToLayoutFormat(score);
    expect(result.instruments[0].staves[0].key_signature.sharps).toBe(0);
  });
});
