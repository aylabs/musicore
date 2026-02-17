/**
 * Feature 024: Playback & Display Performance Optimization
 * Unit tests for HighlightIndex
 *
 * @see tasks.md T009
 */

import { describe, it, expect } from 'vitest';
import { HighlightIndex } from './HighlightIndex';

describe('HighlightIndex', () => {
  describe('build()', () => {
    it('builds an index with correct noteCount', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
        { id: 'n2', start_tick: 480, duration_ticks: 480 },
        { id: 'n3', start_tick: 960, duration_ticks: 960 },
      ]);
      expect(index.noteCount).toBe(3);
    });

    it('computes maxDuration correctly', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
        { id: 'n2', start_tick: 480, duration_ticks: 960 },
        { id: 'n3', start_tick: 960, duration_ticks: 240 },
      ]);
      expect(index.maxDuration).toBe(960);
    });

    it('handles empty notes array', () => {
      const index = new HighlightIndex();
      index.build([]);
      expect(index.noteCount).toBe(0);
      expect(index.maxDuration).toBe(0);
    });
  });

  describe('findPlayingNoteIds()', () => {
    it('returns empty array for empty index', () => {
      const index = new HighlightIndex();
      index.build([]);
      expect(index.findPlayingNoteIds(100)).toEqual([]);
    });

    it('returns empty array when tick is before all notes', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 480, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(0)).toEqual([]);
    });

    it('returns note ID when tick is during a single note', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(240)).toEqual(['n1']);
    });

    it('returns note ID at exact start tick', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 480, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(480)).toEqual(['n1']);
    });

    it('returns empty array at exact end tick (exclusive end)', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(480)).toEqual([]);
    });

    it('returns empty array when tick is after all notes', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(960)).toEqual([]);
    });

    it('finds all notes in a chord (same startTick)', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'c1', start_tick: 960, duration_ticks: 480 },
        { id: 'c2', start_tick: 960, duration_ticks: 480 },
        { id: 'c3', start_tick: 960, duration_ticks: 480 },
        { id: 'c4', start_tick: 960, duration_ticks: 480 },
      ]);
      const result = index.findPlayingNoteIds(1000);
      expect(result).toHaveLength(4);
      expect(new Set(result)).toEqual(new Set(['c1', 'c2', 'c3', 'c4']));
    });

    it('handles non-overlapping sequential notes', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
        { id: 'n2', start_tick: 480, duration_ticks: 480 },
        { id: 'n3', start_tick: 960, duration_ticks: 480 },
      ]);
      expect(index.findPlayingNoteIds(240)).toEqual(['n1']);
      expect(index.findPlayingNoteIds(600)).toEqual(['n2']);
      expect(index.findPlayingNoteIds(1200)).toEqual(['n3']);
    });

    it('handles long pedal tone overlapping rapid notes', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'pedal', start_tick: 0, duration_ticks: 3840 }, // 4 beats
        { id: 'fast1', start_tick: 480, duration_ticks: 240 },
        { id: 'fast2', start_tick: 720, duration_ticks: 240 },
        { id: 'fast3', start_tick: 960, duration_ticks: 240 },
      ]);
      // At tick 500: pedal + fast1 should be playing
      const result = index.findPlayingNoteIds(500);
      expect(new Set(result)).toEqual(new Set(['pedal', 'fast1']));

      // At tick 800: pedal + fast2
      const result2 = index.findPlayingNoteIds(800);
      expect(new Set(result2)).toEqual(new Set(['pedal', 'fast2']));
    });

    it('handles notes with varying durations', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'short', start_tick: 0, duration_ticks: 120 },  // 32nd note
        { id: 'medium', start_tick: 0, duration_ticks: 480 }, // quarter note
        { id: 'long', start_tick: 0, duration_ticks: 1920 },  // whole note
      ]);
      // At tick 100: all three
      expect(index.findPlayingNoteIds(100)).toHaveLength(3);
      // At tick 200: medium + long only
      const result = index.findPlayingNoteIds(200);
      expect(new Set(result)).toEqual(new Set(['medium', 'long']));
      // At tick 1000: long only
      expect(index.findPlayingNoteIds(1000)).toEqual(['long']);
    });
  });

  describe('clear()', () => {
    it('releases all data', () => {
      const index = new HighlightIndex();
      index.build([
        { id: 'n1', start_tick: 0, duration_ticks: 480 },
      ]);
      expect(index.noteCount).toBe(1);

      index.clear();
      expect(index.noteCount).toBe(0);
      expect(index.maxDuration).toBe(0);
      expect(index.findPlayingNoteIds(240)).toEqual([]);
    });
  });

  describe('performance', () => {
    it('findPlayingNoteIds completes in < 0.1ms for 10,000 notes', () => {
      const index = new HighlightIndex();
      const notes = Array.from({ length: 10_000 }, (_, i) => ({
        id: `n${i}`,
        start_tick: i * 240,
        duration_ticks: 480,
      }));
      index.build(notes);

      // Warm up
      index.findPlayingNoteIds(1200000);
      index.findPlayingNoteIds(600000);

      // Measure
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        index.findPlayingNoteIds((i * 2400) % (10_000 * 240));
      }
      const elapsed = performance.now() - start;
      const perQuery = elapsed / iterations;

      expect(perQuery).toBeLessThan(0.1);
    });
  });
});
