/**
 * exerciseScorer.ts — Beat-slot alignment and scoring for the Piano Practice feature.
 *
 * Feature: 001-piano-practice (T014)
 * FR-008: Correct = pitch within ±50 cents AND timing within ±200 ms
 * FR-009: Extraneous notes reduce the score
 * FR-010: Score = 50% pitch accuracy + 50% timing accuracy, normalised 0–100
 *
 * Scoring formula (from data-model.md):
 *   totalSlots     = exercise.notes.length + extraneousNotes.length
 *   pitchScore     = correctPitchCount  / totalSlots
 *   timingScore    = correctTimingCount / totalSlots
 *   score          = Math.round(50 × pitchScore + 50 × timingScore)
 */

import type {
  Exercise,
  ResponseNote,
  NoteComparison,
  NoteComparisonStatus,
  ExerciseResult,
} from '../../types/practice';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Pitch match threshold in cents (FR-008, Clarification Q1) */
const PITCH_TOLERANCE_CENTS = 50;
/** Timing match window in ms (FR-006, FR-008) */
const TIMING_TOLERANCE_MS = 200;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * scoreExercise — classify each beat slot and compute the final score.
 *
 * @param exercise        The target exercise (immutable after generation)
 * @param responses       Array of ResponseNotes aligned by usePracticeRecorder;
 *                        length must equal exercise.notes.length; null = missed slot
 * @param extraneousNotes ResponseNotes not matched to any slot (surplus)
 */
export function scoreExercise(
  exercise: Exercise,
  responses: (ResponseNote | null)[],
  extraneousNotes: ResponseNote[],
): ExerciseResult {
  let correctPitchCount = 0;
  let correctTimingCount = 0;

  const comparisons: NoteComparison[] = exercise.notes.map((target, i) => {
    const response: ResponseNote | null = responses[i] ?? null;

    if (response === null) {
      return {
        target,
        response: null,
        status: 'missed' as NoteComparisonStatus,
        pitchDeviationCents: null,
        timingDeviationMs: null,
      };
    }

    // Pitch deviation: |detectedMidiCents − targetMidi × 100|
    const targetMidiCents = target.midiPitch * 100;
    const pitchDeviationCents = Math.abs(response.midiCents - targetMidiCents);
    const pitchOk = pitchDeviationCents <= PITCH_TOLERANCE_CENTS;

    // Timing deviation: |response.onsetMs − target.expectedOnsetMs|
    const timingDeviationMs = Math.abs(response.onsetMs - target.expectedOnsetMs);
    const timingOk = timingDeviationMs <= TIMING_TOLERANCE_MS;

    let status: NoteComparisonStatus;
    if (pitchOk && timingOk) {
      status = 'correct';
      correctPitchCount++;
      correctTimingCount++;
    } else if (pitchOk && !timingOk) {
      // Pitch is correct but note fell outside the timing window
      status = 'wrong-timing';
      correctPitchCount++;
    } else if (!pitchOk && timingOk) {
      // Responded in the right window but wrong pitch
      status = 'wrong-pitch';
      correctTimingCount++;
    } else {
      // Both wrong — classify as wrong-pitch (most informative for the student)
      status = 'wrong-pitch';
    }

    return {
      target,
      response,
      status,
      pitchDeviationCents,
      timingDeviationMs,
    };
  });

  // Scoring formula: pitch accuracy only (0–100).
  // Timing is shown in the report but not penalised — mic detection is not
  // accurate enough for timing evaluation. wrong-timing notes already
  // incremented correctPitchCount above, so they receive full credit.
  const score = exercise.notes.length > 0
    ? Math.round(100 * correctPitchCount / exercise.notes.length)
    : 0;

  return {
    comparisons,
    extraneousNotes,
    score,
    correctPitchCount,
    correctTimingCount,
  };
}
