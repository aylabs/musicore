/**
 * exerciseScorer.ts — Beat-slot alignment and scoring for the Piano Practice feature.
 *
 * Feature: 001-piano-practice (T014)
 * FR-008: Correct = pitch within ±50 cents AND timing within ±200 ms
 * FR-009: Extraneous notes reduce the score
 * FR-010: Score = 50% pitch accuracy + 50% timing accuracy, normalised 0–100
 *
 * Default scoring formula (microphone mode — timing excluded, detection latency
 * makes timing unreliable):
 *   score = Math.round(100 × correctPitchCount / notes.length)
 *
 * MIDI mode (includeTimingScore: true) — timing is precise enough to penalise:
 *   score = Math.round(50 × correctPitchCount / notes.length
 *                    + 50 × correctTimingCount / notes.length)
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
 * @param exercise          The target exercise (immutable after generation)
 * @param responses         Array of ResponseNotes aligned by usePracticeRecorder;
 *                          length must equal exercise.notes.length; null = missed slot
 * @param extraneousNotes   ResponseNotes not matched to any slot (surplus)
 * @param options.includeTimingScore  When true (MIDI mode), timing accuracy
 *                          contributes 50% of the score. Default false (mic
 *                          mode) because mic pitch-detection latency makes
 *                          timing measurements unreliable.
 */
export function scoreExercise(
  exercise: Exercise,
  responses: (ResponseNote | null)[],
  extraneousNotes: ResponseNote[],
  options: { includeTimingScore?: boolean } = {},
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

  // Scoring formula:
  //  - Mic mode (default): pitch only — mic detection latency makes timing
  //    unreliable, so wrong-timing notes receive full credit.
  //  - MIDI mode (includeTimingScore: true): 50% pitch + 50% timing.
  const n = exercise.notes.length;
  const score = n === 0 ? 0 : options.includeTimingScore
    ? Math.round(50 * correctPitchCount / n + 50 * correctTimingCount / n)
    : Math.round(100 * correctPitchCount / n);

  return {
    comparisons,
    extraneousNotes,
    score,
    correctPitchCount,
    correctTimingCount,
  };
}
