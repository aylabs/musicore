/**
 * practiceTypes.ts — Plugin-internal domain types
 * Feature 031: Practice View Plugin
 *
 * Self-contained type definitions for the practice-view plugin.
 * NO imports from src/ — all types are defined here.
 * These mirror the host-side types in src/types/practice.ts and
 * src/services/practice/exerciseGenerator.ts but are intentionally
 * independent to satisfy the ESLint import boundary.
 */

// ─── Exercise configuration ───────────────────────────────────────────────────

/** Which notes to practice */
export type PracticeMode = 'flow' | 'step';

/** Exercise configuration for generating a practice set */
export interface ExerciseConfig {
  /** Note pool selection */
  preset: 'random' | 'c4scale';
  /** Number of notes in the exercise (1–20) */
  noteCount: number;
  /** Clef determines the note pool range */
  clef: 'Treble' | 'Bass';
  /** 1 = one octave around the clef centre; 2 = two octaves */
  octaveRange: 1 | 2;
  /** Practice mode: 'flow' = timed play-through; 'step' = wait for correct note each slot */
  mode: PracticeMode;
  /**
   * Step mode only. Multiplier applied to the quarter-note duration to derive
   * the per-slot timeout. E.g. 4 = the user has 4× the note's duration to press it.
   */
  stepTimeoutMultiplier: number;
}

// ─── Phase state machine ──────────────────────────────────────────────────────

/**
 * Phase state machine for the Practice plugin UI:
 *   ready → countdown → playing → results
 */
export type PracticePhase = 'ready' | 'countdown' | 'playing' | 'results';

// ─── Exercise ─────────────────────────────────────────────────────────────────

/** One entry in the target exercise sequence */
export interface ExerciseNote {
  /** Stable slot identifier, e.g. "ex-0" */
  id: string;
  /** 0-based slot index */
  slotIndex: number;
  /** Target MIDI pitch */
  midiPitch: number;
  /** Expected onset time in ms from when Play is pressed */
  expectedOnsetMs: number;
}

/** The immutable sequence of target notes for one practice session */
export interface PracticeExercise {
  /** Ordered target notes */
  notes: ExerciseNote[];
  /** Beats per minute used to compute onset times */
  bpm: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * A note detected during practice (from mic or MIDI).
 * Internal to the scorer — converting from PluginPitchEvent happens in scoreCapture.
 */
export interface ResponseNote {
  /** Raw detected frequency in Hz (0 for MIDI events converted to this type) */
  hz: number;
  /**
   * Fractional MIDI value ×100 for cent comparison.
   * For mic: 12 × log2(hz/440) × 100 + 6900
   * For MIDI: midiNote × 100
   */
  midiCents: number;
  /** Detected onset offset in ms from when Play was pressed */
  onsetMs: number;
  /** Raw detection confidence [0, 1] */
  confidence: number;
}

// ─── Comparison & Result ──────────────────────────────────────────────────────

/**
 * Classification of one beat slot.
 * - correct: pitch within ±50 cents AND timing within ±200 ms
 * - wrong-pitch: deviation > 50 cents
 * - wrong-timing: pitch ok but outside timing window
 * - missed: no response detected
 * - extraneous: unmatched note
 */
export type NoteComparisonStatus =
  | 'correct'
  | 'wrong-pitch'
  | 'wrong-timing'
  | 'missed'
  | 'extraneous';

/** Pairing of one target slot with its best-matching response note (if any) */
export interface NoteComparison {
  target: ExerciseNote;
  response: ResponseNote | null;
  status: NoteComparisonStatus;
  pitchDeviationCents: number | null;
  timingDeviationMs: number | null;
}

/** Complete result for one exercise attempt */
export interface ExerciseResult {
  /** Per-slot comparisons */
  comparisons: NoteComparison[];
  /** Unmatched response notes */
  extraneousNotes: ResponseNote[];
  /** Final score 0–100 */
  score: number;
  /** Slots with correct pitch */
  correctPitchCount: number;
  /** Slots with correct timing */
  correctTimingCount: number;
}
