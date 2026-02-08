/**
 * ChordDetector Service Tests
 * 
 * Tests for tick-based chord detection and grouping.
 * Following TDD approach - tests written before implementation.
 */

import { describe, it, expect } from 'vitest';
import { ChordDetector } from './ChordDetector';
import type { Note } from '../../types/score';

describe('ChordDetector', () => {
  const detector = new ChordDetector();

  // T013: Test groupByTick - verify groups notes by start_tick
  describe('groupByTick', () => {
    it('groups notes by tick position', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },      // C4 at tick 0
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },      // E4 at tick 0
        { id: '3', start_tick: 960, duration_ticks: 960, pitch: 67 },    // G4 at tick 960
      ];

      const groups = detector.groupByTick(notes);

      expect(groups.size).toBe(2);
      expect(groups.get(0)).toHaveLength(2);
      expect(groups.get(960)).toHaveLength(1);
      expect(groups.get(0)).toEqual([
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
      ]);
    });

    it('handles notes at multiple different ticks', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 480, pitch: 60 },
        { id: '2', start_tick: 480, duration_ticks: 480, pitch: 62 },
        { id: '3', start_tick: 960, duration_ticks: 480, pitch: 64 },
        { id: '4', start_tick: 960, duration_ticks: 480, pitch: 67 },
        { id: '5', start_tick: 960, duration_ticks: 480, pitch: 71 },
      ];

      const groups = detector.groupByTick(notes);

      expect(groups.size).toBe(3);
      expect(groups.get(0)).toHaveLength(1);
      expect(groups.get(480)).toHaveLength(1);
      expect(groups.get(960)).toHaveLength(3);
    });

    it('returns empty map for empty notes array', () => {
      const notes: Note[] = [];
      const groups = detector.groupByTick(notes);
      expect(groups.size).toBe(0);
    });

    it('handles single note (no grouping)', () => {
      const notes: Note[] = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      ];

      const groups = detector.groupByTick(notes);

      expect(groups.size).toBe(1);
      expect(groups.get(0)).toHaveLength(1);
    });
  });

  // T014: Test filterChordCandidates - verify filters groups with 2+ notes
  describe('filterChordCandidates', () => {
    it('filters groups with 2+ notes', () => {
      const groups = new Map<number, Note[]>([
        [0, [
          { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
          { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
          { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 },
        ]],
        [960, [
          { id: '4', start_tick: 960, duration_ticks: 960, pitch: 69 },
        ]],
        [1920, [
          { id: '5', start_tick: 1920, duration_ticks: 960, pitch: 65 },
          { id: '6', start_tick: 1920, duration_ticks: 960, pitch: 69 },
        ]],
      ]);

      const candidates = detector.filterChordCandidates(groups);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].tick).toBe(0);
      expect(candidates[0].notes).toHaveLength(3);
      expect(candidates[1].tick).toBe(1920);
      expect(candidates[1].notes).toHaveLength(2);
    });

    it('returns empty array when all groups have single notes', () => {
      const groups = new Map<number, Note[]>([
        [0, [{ id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }]],
        [960, [{ id: '2', start_tick: 960, duration_ticks: 960, pitch: 62 }]],
      ]);

      const candidates = detector.filterChordCandidates(groups);

      expect(candidates).toHaveLength(0);
    });

    it('returns empty array for empty map', () => {
      const groups = new Map<number, Note[]>();
      const candidates = detector.filterChordCandidates(groups);
      expect(candidates).toHaveLength(0);
    });

    it('includes groups with exactly 2 notes', () => {
      const groups = new Map<number, Note[]>([
        [0, [
          { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
          { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
        ]],
      ]);

      const candidates = detector.filterChordCandidates(groups);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].notes).toHaveLength(2);
    });
  });
});
