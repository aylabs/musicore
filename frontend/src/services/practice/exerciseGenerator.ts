/**
 * exerciseGenerator.ts — Random exercise factory for the Piano Practice feature.
 *
 * Feature: 001-piano-practice (T007)
 * FR-002: Generates exactly 8 quarter-note pitches from C3–C4 (MIDI 48–60 diatonic).
 * FR-015: Default configuration: 8 notes, 80 BPM, C3–C4 range.
 */

import type { Exercise, ExerciseNote } from '../../types/practice';

// ─── Exercise configuration ────────────────────────────────────────────────────────────────

export interface ExerciseConfig {
  /** Note pool selection */
  preset: 'random' | 'c4scale';
  /** Number of notes in the exercise (1–12) */
  noteCount: number;
  /** Clef determines the note pool range */
  clef: 'Treble' | 'Bass';
  /** 1 = one octave around the clef centre; 2 = two octaves */
  octaveRange: 1 | 2;
}

export const DEFAULT_EXERCISE_CONFIG: ExerciseConfig = {
  preset: 'random',
  noteCount: 8,
  clef: 'Treble',
  octaveRange: 1,
};

// ─── Constants ────────────────────────────────────────────────────────────────────

/** Diatonic pitches from C4 to C5 inclusive (C4=60, D4=62 ... C5=72) */
const C4_TO_C5_PITCHES: readonly number[] = [60, 62, 64, 65, 67, 69, 71, 72];

const DEFAULT_BPM = 80;

/**
 * Diatonic note pools keyed by "Clef-OctaveRange".
 * Only white-key (diatonic) pitches are included.
 *
 * Treble-1: C4–C5   (MIDI 60–72)
 * Treble-2: C3–C5   (MIDI 48–72)
 * Bass-1:   C3–C4   (MIDI 48–60)
 * Bass-2:   C2–C4   (MIDI 36–60)
 */
const NOTE_POOLS: Record<string, readonly number[]> = {
  'Treble-1': [60, 62, 64, 65, 67, 69, 71, 72],
  'Treble-2': [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72],
  'Bass-1':   [48, 50, 52, 53, 55, 57, 59, 60],
  'Bass-2':   [36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60],
};


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
 * generateExercise(bpm?, config?, seed?) → Exercise
 *
 * Generates a practice exercise according to the given config.
 * When config.preset === 'c4scale', delegates to generateC4ScaleExercise.
 *
 * @param bpm    Tempo in beats per minute (default 80)
 * @param config Exercise configuration (default: 8 random Treble-1 notes)
 * @param seed   Optional seed for deterministic output (useful in tests)
 */
export function generateExercise(
  bpm: number = DEFAULT_BPM,
  config: ExerciseConfig = DEFAULT_EXERCISE_CONFIG,
  seed?: number,
): Exercise {
  if (config.preset === 'c4scale') {
    return generateC4ScaleExercise(bpm, config.noteCount);
  }

  const pool = NOTE_POOLS[`${config.clef}-${config.octaveRange}`];
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const msPerBeat = 60_000 / bpm;

  const notes: ExerciseNote[] = Array.from({ length: config.noteCount }, (_, i) => ({
    slotIndex: i,
    midiPitch: pool[Math.floor(rand() * pool.length)],
    expectedOnsetMs: i * msPerBeat,
  }));

  return { notes, bpm };
}

/**
 * generateC4ScaleExercise(bpm?, noteCount?) → Exercise
 *
 * Returns a fixed ascending C major scale (C4 D4 E4 F4 G4 A4 B4 C5),
 * truncated to noteCount notes (default 8).
 * Useful for debugging: expected pitches are known and predictable.
 */
export function generateC4ScaleExercise(bpm: number = DEFAULT_BPM, noteCount = 8): Exercise {
  const msPerBeat = 60_000 / bpm;
  const num = Math.min(noteCount, C4_TO_C5_PITCHES.length);
  const notes: ExerciseNote[] = C4_TO_C5_PITCHES.slice(0, num).map((midiPitch, i) => ({
    slotIndex: i,
    midiPitch,
    expectedOnsetMs: i * msPerBeat,
  }));
  return { notes, bpm };
}
