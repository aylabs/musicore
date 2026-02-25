/**
 * practice.ts — Domain types for the Piano Practice Exercise feature.
 *
 * Feature: 001-piano-practice
 * All types are in-memory only (no persistence).
 * See specs/001-piano-practice/data-model.md for full documentation.
 */

// ─── Exercise ─────────────────────────────────────────────────────────────────

/** One entry in the target exercise sequence. */
export interface ExerciseNote {
  /**
   * Stable layout/highlight identifier for this slot: "ex-{slotIndex}".
   * Generated at creation time, never mutated. Used by LayoutRenderer for highlight tracking.
   */
  id: string;
  /** Slot index: 0-based position in the exercise (0 = first note) */
  slotIndex: number;
  /** Target MIDI pitch (48 = C3 … 60 = C4), ∈ {48,50,52,53,55,57,59,60} */
  midiPitch: number;
  /** Expected onset time in ms from the moment Play is pressed */
  expectedOnsetMs: number;
}

/** The immutable sequence of target notes for one practice session. */
export interface Exercise {
  /** Ordered target notes — always exactly 8 in v1 */
  notes: ExerciseNote[];
  /** Beats per minute used to compute onset times (default 80) */
  bpm: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/** A note detected from the user's microphone during playback. */
export interface ResponseNote {
  /** Raw detected frequency in Hz */
  hz: number;
  /**
   * Fractional MIDI value ×100 for precise cent comparison.
   * Formula: 12 × log2(hz/440) × 100 + 6900
   * (i.e. standard MIDI note × 100, so C4 = 6000, A4 = 6900)
   */
  midiCents: number;
  /** Detected onset offset in ms from the moment Play was pressed */
  onsetMs: number;
  /** Raw detection confidence [0, 1] from pitchy */
  confidence: number;
}

// ─── Comparison & Result ──────────────────────────────────────────────────────

/**
 * Classification of one beat slot.
 * - correct:      pitch within ±50 cents AND timing within ±200 ms
 * - wrong-pitch:  response detected in slot window, deviation > 50 cents
 * - wrong-timing: pitch within ±50 cents, but onset falls outside ±200 ms window
 * - missed:       no response note detected for this slot
 * - extraneous:   response note that doesn't map to any slot (surplus)
 */
export type NoteComparisonStatus =
  | 'correct'
  | 'wrong-pitch'
  | 'wrong-timing'
  | 'missed'
  | 'extraneous';

/** The pairing of one target slot with its best-matching response note (if any). */
export interface NoteComparison {
  /** The target note for this slot */
  target: ExerciseNote;
  /** The user-played note assigned to this slot, or null if missed */
  response: ResponseNote | null;
  /** Classification result */
  status: NoteComparisonStatus;
  /** Pitch deviation in cents (|detectedMidiCents − targetMidi×100|); null if missed */
  pitchDeviationCents: number | null;
  /** Timing deviation in ms (|response.onsetMs − target.expectedOnsetMs|); null if missed */
  timingDeviationMs: number | null;
}

/** Complete result for one exercise attempt. */
export interface ExerciseResult {
  /** Per-slot comparisons (length === exercise.notes.length) */
  comparisons: NoteComparison[];
  /** Extraneous response notes not assigned to any slot */
  extraneousNotes: ResponseNote[];
  /** Final score 0–100 */
  score: number;
  /** Number of slots with correct pitch (deviation ≤ 50 cents) */
  correctPitchCount: number;
  /** Number of slots with correct timing (onset deviation ≤ 200 ms) */
  correctTimingCount: number;
}

// ─── UI State Machine ─────────────────────────────────────────────────────────

/**
 * State machine for the practice view UI.
 * Transitions: ready → countdown → playing → results
 * ready: waiting for first note press to trigger countdown
 * countdown: 3-2-1 displayed; mic capture not yet started
 * From results: Try Again → ready (same exercise) | New Exercise → ready (new exercise)
 */
export type PracticePhase = 'ready' | 'countdown' | 'playing' | 'results';
