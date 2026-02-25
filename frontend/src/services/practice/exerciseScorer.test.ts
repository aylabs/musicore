/**
 * exerciseScorer.test.ts — Unit tests for scoreExercise.
 *
 * Feature: 001-piano-practice (T013)
 * TDD: written before the implementation.
 *
 * FR-008: Correct = pitch within ±50 cents AND timing within ±200 ms
 * FR-009: Extraneous notes reduce the score
 * FR-010: Score = 50% pitch accuracy + 50% timing accuracy, normalised 0–100
 */

import { describe, it, expect } from 'vitest';
import { scoreExercise } from './exerciseScorer';
import type { Exercise, ExerciseNote, ResponseNote } from '../../types/practice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BPM = 80;
const MS_PER_BEAT = 60_000 / BPM; // 750 ms

function makeExercise(pitches: number[] = Array(8).fill(60)): Exercise {
  return {
    bpm: BPM,
    notes: pitches.map((midiPitch, i): ExerciseNote => ({
      slotIndex: i,
      midiPitch,
      expectedOnsetMs: i * MS_PER_BEAT,
    })),
  };
}

/**
 * Convert MIDI note to the midiCents representation used by ResponseNote.
 * C4 (midi 60) → hz = 440 × 2^((60-69)/12) ≈ 261.63 Hz
 * midiCents = 12 × log2(hz/440) × 100 + 6900
 * For midi 60: 12 × log2(261.63/440) × 100 + 6900 = 12 × (-0.75) × 100 + 6900 = 6000
 */
function midiToMidiCents(midi: number): number {
  const hz = 440 * Math.pow(2, (midi - 69) / 12);
  return 12 * Math.log2(hz / 440) * 100 + 6900;
}

function makeResponse(
  midiPitch: number,
  onsetMs: number,
  opts: { centOffset?: number; msDrift?: number } = {}
): ResponseNote {
  const detuned = midiPitch + (opts.centOffset ?? 0) / 100;
  const hz = 440 * Math.pow(2, (detuned - 69) / 12);
  const midiCents = 12 * Math.log2(hz / 440) * 100 + 6900;
  return {
    hz,
    midiCents,
    onsetMs: onsetMs + (opts.msDrift ?? 0),
    confidence: 0.95,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('scoreExercise', () => {
  describe('perfect performance', () => {
    it('returns score 100 when all notes match pitch and timing exactly', () => {
      const exercise = makeExercise();
      const responses = exercise.notes.map((n) =>
        makeResponse(n.midiPitch, n.expectedOnsetMs)
      );
      const result = scoreExercise(exercise, responses, []);
      expect(result.score).toBe(100);
    });

    it('returns score 100 when pitch deviation is exactly 50 cents', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { centOffset: 50 });
      const result = scoreExercise(exercise, [response], []);
      // 50 cents = boundary, should be correct
      expect(result.comparisons[0].status).toBe('correct');
    });

    it('marks status as correct for exactly 200 ms timing deviation', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { msDrift: 200 });
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].status).toBe('correct');
    });
  });

  describe('all missed', () => {
    it('returns score 0 when all responses are null', () => {
      const exercise = makeExercise();
      const responses: (ResponseNote | null)[] = new Array(8).fill(null);
      const result = scoreExercise(exercise, responses, []);
      expect(result.score).toBe(0);
      expect(result.correctPitchCount).toBe(0);
      expect(result.correctTimingCount).toBe(0);
    });

    it('marks all slots as missed when responses are null', () => {
      const exercise = makeExercise();
      const responses: (ResponseNote | null)[] = new Array(8).fill(null);
      const result = scoreExercise(exercise, responses, []);
      result.comparisons.forEach((c) => expect(c.status).toBe('missed'));
    });
  });

  describe('note classification', () => {
    it('classifies wrong-pitch when deviation > 50 cents', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { centOffset: 51 }); // just over threshold
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].status).toBe('wrong-pitch');
    });

    it('classifies correct when timing within 200 ms and pitch within 50 cents', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { msDrift: 150 });
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].status).toBe('correct');
    });

    it('classifies wrong-timing when pitch is correct but onset > 200 ms', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { msDrift: 250 });
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].status).toBe('wrong-timing');
    });

    it('classifies missed when response is null', () => {
      const exercise = makeExercise([60]);
      const result = scoreExercise(exercise, [null], []);
      expect(result.comparisons[0].status).toBe('missed');
    });
  });

  describe('extraneous notes', () => {
    it('passes through extraneous notes in the result', () => {
      const exercise = makeExercise();
      const responses: (ResponseNote | null)[] = new Array(8).fill(null);
      const extra: ResponseNote[] = [makeResponse(60, 99999)];
      const result = scoreExercise(exercise, responses, extra);
      expect(result.extraneousNotes).toHaveLength(1);
    });

    it('extraneous notes do not affect the score', () => {
      const exercise = makeExercise([60]);
      // Perfect on the one slot
      const responses = [makeResponse(60, 0)];
      // Extraneous notes are no longer penalised (sequential matching discards them)
      const extra = [makeResponse(60, 99999)];

      const withExtra = scoreExercise(exercise, responses, extra);
      const withoutExtra = scoreExercise(exercise, responses, []);

      expect(withExtra.score).toBe(withoutExtra.score);
    });
  });

  describe('scoring formula', () => {
    it('returns correct pitchCount and timingCount', () => {
      const exercise = makeExercise([60, 62]);
      // First note: correct pitch & timing; second: wrong pitch
      const responses: (ResponseNote | null)[] = [
        makeResponse(60, 0),   // correct
        makeResponse(60, exercise.notes[1].expectedOnsetMs, { centOffset: 100 }), // wrong pitch (100 cents off)
      ];
      const result = scoreExercise(exercise, responses, []);
      expect(result.correctPitchCount).toBe(1);
    });

    it('score is Math.round(correctPitchCount / notes.length × 100)', () => {
      const exercise = makeExercise([60, 62]);
      // First slot: perfect. Second slot: missed.
      const responses: (ResponseNote | null)[] = [makeResponse(60, 0), null];
      const result = scoreExercise(exercise, responses, []);
      // correctPitchCount = 1, notes.length = 2 → score = Math.round(100 × 0.5) = 50
      expect(result.score).toBe(50);
    });

    it('pitch deviation is stored in cents', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { centOffset: 30 });
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].pitchDeviationCents).toBeCloseTo(30, 0);
    });

    it('timing deviation is stored in ms', () => {
      const exercise = makeExercise([60]);
      const response = makeResponse(60, 0, { msDrift: 120 });
      const result = scoreExercise(exercise, [response], []);
      expect(result.comparisons[0].timingDeviationMs).toBeCloseTo(120, 0);
    });

    it('pitchDeviationCents is null for missed notes', () => {
      const exercise = makeExercise([60]);
      const result = scoreExercise(exercise, [null], []);
      expect(result.comparisons[0].pitchDeviationCents).toBeNull();
    });
  });

  describe('includeTimingScore (MIDI mode)', () => {
    it('score = 50% pitch + 50% timing when all correct', () => {
      const exercise = makeExercise([60, 62]);
      const responses: (ResponseNote | null)[] = [
        makeResponse(60, exercise.notes[0].expectedOnsetMs),
        makeResponse(62, exercise.notes[1].expectedOnsetMs),
      ];
      const result = scoreExercise(exercise, responses, [], { includeTimingScore: true });
      expect(result.score).toBe(100);
    });

    it('wrong-timing penalises 50% of score per slot', () => {
      const exercise = makeExercise([60, 62]);
      // First slot: correct pitch but late by 500 ms (> TIMING_TOLERANCE_MS 200)
      // Second slot: perfect
      const responses: (ResponseNote | null)[] = [
        makeResponse(60, exercise.notes[0].expectedOnsetMs, { msDrift: 500 }),
        makeResponse(62, exercise.notes[1].expectedOnsetMs),
      ];
      const result = scoreExercise(exercise, responses, [], { includeTimingScore: true });
      // correctPitchCount=2, correctTimingCount=1, n=2
      // score = Math.round(50 × 2/2 + 50 × 1/2) = Math.round(50 + 25) = 75
      expect(result.score).toBe(75);
      expect(result.comparisons[0].status).toBe('wrong-timing');
    });

    it('missed note counts as 0 pitch and 0 timing', () => {
      const exercise = makeExercise([60, 62]);
      const responses: (ResponseNote | null)[] = [makeResponse(60, exercise.notes[0].expectedOnsetMs), null];
      const result = scoreExercise(exercise, responses, [], { includeTimingScore: true });
      // correctPitchCount=1, correctTimingCount=1, n=2
      // score = Math.round(50 × 1/2 + 50 × 1/2) = 50
      expect(result.score).toBe(50);
    });

    it('pitch-only scoring unchanged when includeTimingScore is omitted', () => {
      const exercise = makeExercise([60, 62]);
      const responses: (ResponseNote | null)[] = [
        makeResponse(60, exercise.notes[0].expectedOnsetMs, { msDrift: 500 }),
        makeResponse(62, exercise.notes[1].expectedOnsetMs),
      ];
      // Without flag: wrong-timing gets full pitch credit → score = 100
      const result = scoreExercise(exercise, responses, []);
      expect(result.score).toBe(100);
    });
  });

  describe('responses array length', () => {
    it('handles responses array shorter than notes (treats missing as null)', () => {
      const exercise = makeExercise([60, 62, 64]);
      const responses: (ResponseNote | null)[] = [makeResponse(60, 0)]; // only 1 of 3
      // Should not throw; remaining slots treated as missed
      const result = scoreExercise(exercise, responses, []);
      expect(result.comparisons).toHaveLength(3);
      expect(result.comparisons[1].status).toBe('missed');
      expect(result.comparisons[2].status).toBe('missed');
    });
  });
});
