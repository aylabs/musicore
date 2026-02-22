/**
 * exerciseGenerator.test.ts — Unit tests for generateExercise.
 *
 * Feature: 001-piano-practice (T006)
 * TDD: these tests are written before the implementation.
 */

import { describe, it, expect } from 'vitest';
import { generateExercise } from './exerciseGenerator';

const VALID_PITCHES = new Set([60, 62, 64, 65, 67, 69, 71, 72]);
const DEFAULT_BPM = 80;

describe('generateExercise', () => {
  describe('structure', () => {
    it('returns exactly 8 notes', () => {
      const ex = generateExercise();
      expect(ex.notes).toHaveLength(8);
    });

    it('sets bpm to 80 by default', () => {
      const ex = generateExercise();
      expect(ex.bpm).toBe(DEFAULT_BPM);
    });

    it('uses the provided bpm', () => {
      const ex = generateExercise(120);
      expect(ex.bpm).toBe(120);
    });

    it('assigns slotIndex equal to array position for every note', () => {
      const ex = generateExercise();
      ex.notes.forEach((note, i) => {
        expect(note.slotIndex).toBe(i);
      });
    });
  });

  describe('pitches', () => {
    it('all midiPitch values are from the C4–C5 diatonic set', () => {
      const ex = generateExercise();
      ex.notes.forEach((note) => {
        expect(VALID_PITCHES.has(note.midiPitch)).toBe(true);
      });
    });

    it('uses the full pitch range (probabilistic: 8 notes × many trials)', () => {
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) {
        generateExercise().notes.forEach((n) => seen.add(n.midiPitch));
      }
      // After 1600 samples (200 × 8) the full set of 8 pitches should appear
      expect(seen.size).toBe(8);
    });
  });

  describe('timing', () => {
    it('computes expectedOnsetMs as slotIndex × (60_000 / bpm) for 80 BPM', () => {
      const ex = generateExercise(80);
      const msPerBeat = 60_000 / 80;
      ex.notes.forEach((note, i) => {
        expect(note.expectedOnsetMs).toBeCloseTo(i * msPerBeat, 5);
      });
    });

    it('computes expectedOnsetMs correctly for a custom BPM', () => {
      const ex = generateExercise(120);
      const msPerBeat = 60_000 / 120;
      ex.notes.forEach((note, i) => {
        expect(note.expectedOnsetMs).toBeCloseTo(i * msPerBeat, 5);
      });
    });
  });

  describe('determinism with seed', () => {
    it('produces the same sequence for the same seed', () => {
      const a = generateExercise(80, 42);
      const b = generateExercise(80, 42);
      expect(a.notes.map((n) => n.midiPitch)).toEqual(b.notes.map((n) => n.midiPitch));
    });

    it('produces different sequences for different seeds', () => {
      const a = generateExercise(80, 1);
      const b = generateExercise(80, 2);
      // With 8 notes from 8 pitches it is astronomically unlikely they match
      const aSeq = a.notes.map((n) => n.midiPitch).join(',');
      const bSeq = b.notes.map((n) => n.midiPitch).join(',');
      expect(aSeq).not.toBe(bSeq);
    });

    it('unseed calls are non-deterministic (probabilistic)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) {
        seen.add(generateExercise().notes.map((n) => n.midiPitch).join(','));
      }
      expect(seen.size).toBeGreaterThan(1);
    });
  });
});
