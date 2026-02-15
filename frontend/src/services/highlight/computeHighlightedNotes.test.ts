/**
 * Unit Tests for computeHighlightedNotes
 * Feature 019 - Playback Note Highlighting
 * 
 * Tests the core highlighting algorithm that determines which notes
 * are playing at a given tick position.
 */

import { describe, it, expect } from 'vitest';
import { computeHighlightedNotes } from './computeHighlightedNotes';
import type { Note } from '../../types/score';

/**
 * Helper function to create test notes
 */
function createTestNote(
  id: string,
  startTick: number,
  durationTicks: number,
  pitch = 60
): Note {
  return {
    id,
    start_tick: startTick,
    duration_ticks: durationTicks,
    pitch,
    // Add other required Note fields with defaults
    instrument_id: 'test-instrument',
    staff_index: 0,
    voice_index: 0,
  } as Note;
}

describe('computeHighlightedNotes', () => {
  describe('Empty set scenarios', () => {
    it('returns empty set when currentTick is before all notes', () => {
      const notes = [
        createTestNote('1', 960, 480),
        createTestNote('2', 1440, 480),
      ];

      const result = computeHighlightedNotes(notes, 0);

      expect(result.size).toBe(0);
      expect(result).toEqual(new Set());
    });

    it('returns empty set when currentTick is after all notes', () => {
      const notes = [
        createTestNote('1', 0, 480),
        createTestNote('2', 480, 480),
      ];

      const result = computeHighlightedNotes(notes, 1000);

      expect(result.size).toBe(0);
    });

    it('returns empty set for empty notes array', () => {
      const result = computeHighlightedNotes([], 500);

      expect(result.size).toBe(0);
    });

    it('returns empty set when currentTick is 0 and first note starts later', () => {
      const notes = [createTestNote('1', 960, 480)];

      const result = computeHighlightedNotes(notes, 0);

      expect(result.size).toBe(0);
    });
  });

  describe('Single note highlighting', () => {
    it('highlights single note when currentTick is within note range', () => {
      const notes = [
        createTestNote('1', 960, 480),
        createTestNote('2', 1440, 480),
      ];

      const result = computeHighlightedNotes(notes, 1000);

      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
      expect(result).toEqual(new Set(['1']));
    });

    it('highlights note when currentTick equals start_tick', () => {
      const notes = [createTestNote('1', 960, 480)];

      const result = computeHighlightedNotes(notes, 960);

      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });

    it('does NOT highlight note when currentTick equals end tick (boundary)', () => {
      const notes = [createTestNote('1', 960, 480)]; // Ends at 1440

      const result = computeHighlightedNotes(notes, 1440);

      expect(result.size).toBe(0);
      expect(result.has('1')).toBe(false);
    });

    it('highlights note when currentTick is one tick before end', () => {
      const notes = [createTestNote('1', 960, 480)]; // Ends at 1440

      const result = computeHighlightedNotes(notes, 1439);

      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });
  });

  describe('Multiple overlapping notes', () => {
    it('highlights multiple notes when they overlap in time', () => {
      const notes = [
        createTestNote('1', 0, 1920),    // Long note (2 quarter notes)
        createTestNote('2', 960, 480),   // Overlaps with note 1
        createTestNote('3', 1440, 480),  // Also overlaps with note 1
      ];

      const result = computeHighlightedNotes(notes, 1000);

      expect(result.size).toBe(2);
      expect(result.has('1')).toBe(true);
      expect(result.has('2')).toBe(true);
      expect(result.has('3')).toBe(false);
    });

    it('highlights all notes in a chord (same start_tick)', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 0, 960),
        createTestNote('3', 0, 960),
      ];

      const result = computeHighlightedNotes(notes, 500);

      expect(result.size).toBe(3);
      expect(result).toEqual(new Set(['1', '2', '3']));
    });

    it('highlights chord then unhighlights individual notes at different times', () => {
      const notes = [
        createTestNote('1', 0, 1920),  // Long whole note
        createTestNote('2', 0, 960),   // Quarter note
        createTestNote('3', 0, 480),   // Eighth note
      ];

      // All three playing at start
      let result = computeHighlightedNotes(notes, 100);
      expect(result.size).toBe(3);

      // Note 3 ended, 1 and 2 still playing
      result = computeHighlightedNotes(notes, 500);
      expect(result.size).toBe(2);
      expect(result).toEqual(new Set(['1', '2']));

      // Note 2 ended, only 1 still playing
      result = computeHighlightedNotes(notes, 1000);
      expect(result.size).toBe(1);
      expect(result).toEqual(new Set(['1']));

      // All notes ended
      result = computeHighlightedNotes(notes, 2000);
      expect(result.size).toBe(0);
    });
  });

  describe('Sequential notes (no overlap)', () => {
    it('highlights correct note in sequence', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
        createTestNote('3', 1920, 960),
      ];

      // First note playing
      let result = computeHighlightedNotes(notes, 500);
      expect(result).toEqual(new Set(['1']));

      // Second note playing
      result = computeHighlightedNotes(notes, 1500);
      expect(result).toEqual(new Set(['2']));

      // Third note playing
      result = computeHighlightedNotes(notes, 2500);
      expect(result).toEqual(new Set(['3']));
    });

    it('transitions correctly between sequential notes', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];

      // Last tick of first note
      let result = computeHighlightedNotes(notes, 959);
      expect(result).toEqual(new Set(['1']));

      // First tick of second note (exactly at transition)
      result = computeHighlightedNotes(notes, 960);
      expect(result).toEqual(new Set(['2']));
    });
  });

  describe('Edge cases', () => {
    it('handles very short notes (grace notes)', () => {
      const notes = [
        createTestNote('grace1', 100, 10),  // 10 tick grace note
        createTestNote('main', 110, 960),
      ];

      // Grace note playing
      const result = computeHighlightedNotes(notes, 105);
      expect(result).toEqual(new Set(['grace1']));

      // Grace note ended, main note playing
      const result2 = computeHighlightedNotes(notes, 500);
      expect(result2).toEqual(new Set(['main']));
    });

    it('handles notes with zero duration (theoretical edge case)', () => {
      const notes = [createTestNote('1', 960, 0)];

      // At start tick
      const result = computeHighlightedNotes(notes, 960);
      expect(result.size).toBe(0); // Zero duration means never highlighted
    });

    it('handles large note durations (whole notes, ties)', () => {
      const notes = [
        createTestNote('long', 0, 3840), // 4 quarter notes = whole note
        createTestNote('short', 1920, 480),
      ];

      // Check at various points in the long note
      expect(computeHighlightedNotes(notes, 0).has('long')).toBe(true);
      expect(computeHighlightedNotes(notes, 1000).has('long')).toBe(true);
      expect(computeHighlightedNotes(notes, 2000).has('long')).toBe(true);
      expect(computeHighlightedNotes(notes, 3000).has('long')).toBe(true);
      expect(computeHighlightedNotes(notes, 3839).has('long')).toBe(true);
      expect(computeHighlightedNotes(notes, 3840).has('long')).toBe(false);
    });

    it('handles many simultaneous notes (dense chord)', () => {
      const notes = Array.from({ length: 20 }, (_, i) => 
        createTestNote(`note-${i}`, 0, 960, 60 + i)
      );

      const result = computeHighlightedNotes(notes, 500);

      expect(result.size).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(result.has(`note-${i}`)).toBe(true);
      }
    });
  });

  describe('Performance considerations', () => {
    it('handles large note arrays efficiently', () => {
      // Create 1000 notes
      const notes = Array.from({ length: 1000 }, (_, i) => 
        createTestNote(`note-${i}`, i * 960, 480)
      );

      const startTime = performance.now();
      const result = computeHighlightedNotes(notes, 50000);
      const endTime = performance.now();

      // Should complete in < 5ms for 1000 notes
      expect(endTime - startTime).toBeLessThan(5);
      
      // Should find the correct note (around tick 50000)
      const expectedIndex = Math.floor(50000 / 960);
      expect(result.size).toBe(1);
      expect(result.has(`note-${expectedIndex}`)).toBe(true);
    });
  });
});
