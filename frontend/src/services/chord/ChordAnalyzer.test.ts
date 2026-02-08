/**
 * ChordAnalyzer Service Tests
 * 
 * Tests for chord type identification and pitch analysis.
 * Following TDD approach - tests written before implementation.
 */

import { describe, it, expect } from 'vitest';
import { ChordAnalyzer } from './ChordAnalyzer';
import type { Note } from '../../types/score';

describe('ChordAnalyzer', () => {
  const analyzer = new ChordAnalyzer();

  // T015: Test findRoot - verify finds lowest pitch as root
  describe('findRoot', () => {
    it('finds lowest pitch as root', () => {
      const pitches = [67, 60, 64]; // G4, C4, E4
      const root = analyzer.findRoot(pitches);
      expect(root).toBe(60); // C4 is lowest
    });

    it('returns single pitch as root', () => {
      const pitches = [60];
      const root = analyzer.findRoot(pitches);
      expect(root).toBe(60);
    });

    it('handles pitches in ascending order', () => {
      const pitches = [60, 64, 67];
      const root = analyzer.findRoot(pitches);
      expect(root).toBe(60);
    });

    it('handles pitches in descending order', () => {
      const pitches = [76, 72, 69];
      const root = analyzer.findRoot(pitches);
      expect(root).toBe(69);
    });

    it('handles octave-spanning chords', () => {
      const pitches = [72, 60, 85]; // C5, C4, C#6
      const root = analyzer.findRoot(pitches);
      expect(root).toBe(60); // C4 is lowest
    });
  });

  describe('calculateIntervals', () => {
    it('calculates intervals from root', () => {
      const pitches = [60, 64, 67]; // C, E, G
      const root = 60;
      const intervals = analyzer.calculateIntervals(pitches, root);
      
      // Expected: [0, 4, 7] (root, major third, perfect fifth)
      expect(intervals).toEqual([0, 4, 7]);
    });

    it('handles octave-spanning pitches', () => {
      const pitches = [60, 76, 79]; // C4, E5, G5
      const root = 60;
      const intervals = analyzer.calculateIntervals(pitches, root);
      
      // Should normalize to pitch classes: [0, 4, 7]
      expect(intervals).toContain(0);
      expect(intervals).toContain(4);
      expect(intervals).toContain(7);
    });

    it('deduplicates same pitch class at different octaves', () => {
      const pitches = [60, 72, 84]; // C4, C5, C6
      const root = 60;
      const intervals = analyzer.calculateIntervals(pitches, root);
      
      // All map to pitch class 0 (C), should get single [0]
      expect(intervals).toEqual([0]);
    });
  });

  describe('identify', () => {
    it('identifies basic chord from notes', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.tick).toBe(0);
      expect(chord?.notes).toEqual(notes);
      expect(chord?.rootPitch).toBe(60);
      expect(chord?.notes).toHaveLength(3);
    });

    it('returns null for single note', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      ];

      const chord = analyzer.identify(notes);

      expect(chord).toBeNull();
    });

    it('handles notes at different octaves', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 48 }, // C3
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 79 }, // G5
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.rootPitch).toBe(48); // C3 is lowest
    });

    it('extracts correct tick from notes', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 1920, duration_ticks: 480, pitch: 60 },
        { id: '2', start_tick: 1920, duration_ticks: 480, pitch: 64 },
      ];

      const chord = analyzer.identify(notes);

      expect(chord?.tick).toBe(1920);
    });
  });

  // ========================================================================
  // User Story 2 Tests (T038-T045): Chord Type Recognition
  // ========================================================================

  describe('identify - chord type recognition (US2)', () => {
    // T038: C major chord
    it('identifies C major chord (C+E+G → "C")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('major');
      expect(chord?.symbol).toBe('C');
    });

    // T039: C minor chord
    it('identifies C minor chord (C+Eb+G → "Cm")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 63 }, // Eb4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('minor');
      expect(chord?.symbol).toBe('Cm');
    });

    // T040: C diminished chord
    it('identifies C diminished chord (C+Eb+Gb → "Cdim")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 63 }, // Eb4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 66 }, // Gb4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('diminished');
      expect(chord?.symbol).toBe('Cdim');
    });

    // T041: C augmented chord
    it('identifies C augmented chord (C+E+G# → "Caug")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 68 }, // G#4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('augmented');
      expect(chord?.symbol).toBe('Caug');
    });

    // T042: C dominant 7th chord
    it('identifies C dominant 7th chord (C+E+G+Bb → "C7")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
        { id: '4', start_tick: 0, duration_ticks: 960, pitch: 70 }, // Bb4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('dominant7');
      expect(chord?.symbol).toBe('C7');
    });

    // T043: C major 7th chord
    it('identifies C major 7th chord (C+E+G+B → "Cmaj7")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
        { id: '4', start_tick: 0, duration_ticks: 960, pitch: 71 }, // B4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('major7');
      expect(chord?.symbol).toBe('Cmaj7');
    });

    // T044: C minor 7th chord
    it('identifies C minor 7th chord (C+Eb+G+Bb → "Cm7")', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 63 }, // Eb4
        { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
        { id: '4', start_tick: 0, duration_ticks: 960, pitch: 70 }, // Bb4
      ];

      const chord = analyzer.identify(notes);

      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBe('minor7');
      expect(chord?.symbol).toBe('Cm7');
    });

    // T045: Unrecognized pattern
    it('returns null chord type for unrecognized pattern (C+C#)', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 61 }, // C#4
      ];

      const chord = analyzer.identify(notes);

      // Should still create ChordGroup but with null chordType
      expect(chord).not.toBeNull();
      expect(chord?.chordType).toBeNull();
      expect(chord?.symbol).toBe(''); // No symbol for unrecognized
    });
  });
});
