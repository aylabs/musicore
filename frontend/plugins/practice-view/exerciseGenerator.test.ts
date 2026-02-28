/**
 * exerciseGenerator.test.ts — T009
 * Feature 034: Practice from Score
 *
 * Contract tests for generateScoreExercise().
 * MUST be written FAILING before T010 implements the function.
 * Constitution Principle V: Test-First Development.
 *
 * ESLint boundary: no src/ imports.
 */

import { describe, it, expect } from 'vitest';
import { generateScoreExercise } from './exerciseGenerator';

// ─── generateScoreExercise ────────────────────────────────────────────────────

describe('generateScoreExercise()', () => {
  const samplePitches = [
    { midiPitch: 60 },
    { midiPitch: 62 },
    { midiPitch: 64 },
    { midiPitch: 65 },
    { midiPitch: 67 },
  ];

  it('returns a PracticeExercise with notes.length === min(noteCount, pitches.length)', () => {
    const exercise = generateScoreExercise(80, samplePitches, 3);
    expect(exercise.notes).toHaveLength(3);
  });

  it('clamps to pitches.length when noteCount > pitches.length', () => {
    const exercise = generateScoreExercise(80, samplePitches, 100);
    expect(exercise.notes).toHaveLength(samplePitches.length);
  });

  it('each exercise note carries the corresponding midiPitch from the input array', () => {
    const exercise = generateScoreExercise(80, samplePitches, 5);
    exercise.notes.forEach((n, i) => {
      expect(n.midiPitch).toBe(samplePitches[i].midiPitch);
    });
  });

  it('expectedOnsetMs uses slotIndex × (60_000 / bpm) — same formula as generateExercise', () => {
    const bpm = 100;
    const msPerBeat = 60_000 / bpm;
    const exercise = generateScoreExercise(bpm, samplePitches, 4);
    exercise.notes.forEach((n, i) => {
      expect(n.expectedOnsetMs).toBeCloseTo(i * msPerBeat, 10);
    });
  });

  it('empty pitches input returns exercise with 0 notes', () => {
    const exercise = generateScoreExercise(80, [], 8);
    expect(exercise.notes).toHaveLength(0);
  });

  it('first note has slotIndex 0 and id ex-0', () => {
    const exercise = generateScoreExercise(80, samplePitches, 3);
    expect(exercise.notes[0].slotIndex).toBe(0);
    expect(exercise.notes[0].id).toBe('ex-0');
  });

  it('last note has slotIndex equal to notes.length - 1', () => {
    const exercise = generateScoreExercise(80, samplePitches, 4);
    const last = exercise.notes[exercise.notes.length - 1];
    expect(last.slotIndex).toBe(3);
  });

  it('bpm field in returned exercise matches the input bpm', () => {
    const exercise = generateScoreExercise(120, samplePitches, 3);
    expect(exercise.bpm).toBe(120);
  });

  it('noteCount of 1 returns a single-note exercise', () => {
    const exercise = generateScoreExercise(80, samplePitches, 1);
    expect(exercise.notes).toHaveLength(1);
    expect(exercise.notes[0].midiPitch).toBe(samplePitches[0].midiPitch);
  });
});
