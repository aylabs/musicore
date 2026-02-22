/**
 * exerciseGenerator.ts — Random exercise factory for the Piano Practice feature.
 *
 * Feature: 001-piano-practice (T007)
 * FR-002: Generates exactly 8 quarter-note pitches from C3–C4 (MIDI 48–60 diatonic).
 * FR-015: Default configuration: 8 notes, 80 BPM, C3–C4 range.
 */

import type { Exercise, ExerciseNote } from '../../types/practice';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Diatonic pitches from C4 to C5 inclusive (C4=60, D4=62 ... C5=72) */
const C4_TO_C5_PITCHES: readonly number[] = [60, 62, 64, 65, 67, 69, 71, 72];

const DEFAULT_BPM = 80;
const NOTE_COUNT = 8;

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

/**
 * A simple, fast, good-quality 32-bit seeded PRNG (mulberry32).
 * Returns a function that produces values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * generateExercise(bpm?, seed?) → Exercise
 *
 * Generates an 8-note practice exercise with pitches drawn uniformly from C3–C4.
 *
 * @param bpm  Tempo in beats per minute (default 80)
 * @param seed Optional seed for deterministic output (useful in tests)
 */
export function generateExercise(bpm: number = DEFAULT_BPM, seed?: number): Exercise {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const msPerBeat = 60_000 / bpm;

  const notes: ExerciseNote[] = Array.from({ length: NOTE_COUNT }, (_, i) => {
    const pitchIndex = Math.floor(rand() * C4_TO_C5_PITCHES.length);
    return {
      slotIndex: i,
      midiPitch: C4_TO_C5_PITCHES[pitchIndex],
      expectedOnsetMs: i * msPerBeat,
    };
  });

  return { notes, bpm };
}
