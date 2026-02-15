/**
 * Unit Tests for useNoteHighlight Hook
 * Feature 019 - Playback Note Highlighting
 * 
 * Tests the React hook that manages note highlighting state based on playback position.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNoteHighlight } from './useNoteHighlight';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

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
    instrument_id: 'test-instrument',
    staff_index: 0,
    voice_index: 0,
  } as Note;
}

describe('useNoteHighlight', () => {
  describe('Status-based behavior', () => {
    it('returns empty set when status is "stopped"', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];
      const currentTick = 500; // Middle of first note
      const status: PlaybackStatus = 'stopped';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      expect(result.current.size).toBe(0);
      expect(result.current).toEqual(new Set());
    });

    it('returns computed highlights when status is "playing"', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];
      const currentTick = 500; // Middle of first note
      const status: PlaybackStatus = 'playing';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      expect(result.current.size).toBe(1);
      expect(result.current.has('1')).toBe(true);
      expect(result.current).toEqual(new Set(['1']));
    });

    it('preserves last computed state when status is "paused"', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];
      const currentTick = 500; // Middle of first note
      const status: PlaybackStatus = 'paused';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      // Paused state should show highlights at the paused position
      expect(result.current.size).toBe(1);
      expect(result.current.has('1')).toBe(true);
    });
  });

  describe('CurrentTick updates during playback', () => {
    it('updates highlighted notes when currentTick changes during playback', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
        createTestNote('3', 1920, 960),
      ];
      const status: PlaybackStatus = 'playing';

      // Start at first note
      const { result, rerender } = renderHook(
        ({ tick }) => useNoteHighlight(notes, tick, status),
        { initialProps: { tick: 500 } }
      );

      expect(result.current).toEqual(new Set(['1']));

      // Move to second note
      rerender({ tick: 1400 });
      expect(result.current).toEqual(new Set(['2']));

      // Move to third note
      rerender({ tick: 2400 });
      expect(result.current).toEqual(new Set(['3']));
    });

    it('returns empty set when currentTick moves past all notes', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];
      const status: PlaybackStatus = 'playing';

      const { result, rerender } = renderHook(
        ({ tick }) => useNoteHighlight(notes, tick, status),
        { initialProps: { tick: 500 } }
      );

      expect(result.current.size).toBe(1);

      // Move past all notes
      rerender({ tick: 3000 });
      expect(result.current.size).toBe(0);
    });

    it('highlights multiple overlapping notes correctly', () => {
      const notes = [
        createTestNote('1', 0, 1920),    // Long note
        createTestNote('2', 960, 480),   // Short note overlapping with 1
        createTestNote('3', 1440, 480),  // Another short note overlapping with 1
      ];
      const status: PlaybackStatus = 'playing';

      // At tick 1000, notes 1 and 2 should be highlighted
      const { result } = renderHook(() => 
        useNoteHighlight(notes, 1000, status)
      );

      expect(result.current.size).toBe(2);
      expect(result.current.has('1')).toBe(true);
      expect(result.current.has('2')).toBe(true);
    });
  });

  describe('Status transitions', () => {
    it('clears highlights when transitioning from playing to stopped', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 500;

      const { result, rerender } = renderHook(
        ({ status }) => useNoteHighlight(notes, currentTick, status),
        { initialProps: { status: 'playing' as PlaybackStatus } }
      );

      expect(result.current.size).toBe(1);

      // Transition to stopped
      rerender({ status: 'stopped' as PlaybackStatus });
      expect(result.current.size).toBe(0);
    });

    it('preserves highlights when transitioning from playing to paused', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 500;

      const { result, rerender } = renderHook(
        ({ status }) => useNoteHighlight(notes, currentTick, status),
        { initialProps: { status: 'playing' as PlaybackStatus } }
      );

      const playingHighlights = result.current;
      expect(playingHighlights.size).toBe(1);

      // Transition to paused
      rerender({ status: 'paused' as PlaybackStatus });
      expect(result.current.size).toBe(1);
      expect(result.current.has('1')).toBe(true);
    });

    it('resumes highlighting when transitioning from paused to playing', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 500;

      const { result, rerender } = renderHook(
        ({ status }) => useNoteHighlight(notes, currentTick, status),
        { initialProps: { status: 'paused' as PlaybackStatus } }
      );

      expect(result.current.size).toBe(1);

      // Transition to playing
      rerender({ status: 'playing' as PlaybackStatus });
      expect(result.current.size).toBe(1);
      expect(result.current.has('1')).toBe(true);
    });
  });

  describe('Performance optimization (useMemo)', () => {
    it('returns same Set reference when inputs unchanged', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 500;
      const status: PlaybackStatus = 'playing';

      const { result, rerender } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      const firstResult = result.current;

      // Rerender with same inputs
      rerender();
      const secondResult = result.current;

      // Should return same reference (useMemo optimization)
      expect(secondResult).toBe(firstResult);
    });

    it('returns new Set reference when currentTick changes', () => {
      const notes = [
        createTestNote('1', 0, 960),
        createTestNote('2', 960, 960),
      ];
      const status: PlaybackStatus = 'playing';

      const { result, rerender } = renderHook(
        ({ tick }) => useNoteHighlight(notes, tick, status),
        { initialProps: { tick: 500 } }
      );

      const firstResult = result.current;

      // Change currentTick
      rerender({ tick: 1400 });
      const secondResult = result.current;

      // Should return different reference
      expect(secondResult).not.toBe(firstResult);
      expect(firstResult).toEqual(new Set(['1']));
      expect(secondResult).toEqual(new Set(['2']));
    });
  });

  describe('Edge cases', () => {
    it('handles empty notes array', () => {
      const notes: Note[] = [];
      const currentTick = 500;
      const status: PlaybackStatus = 'playing';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      expect(result.current.size).toBe(0);
    });

    it('handles currentTick at 0', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 0;
      const status: PlaybackStatus = 'playing';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      // Note should be highlighted at its start tick
      expect(result.current.size).toBe(1);
      expect(result.current.has('1')).toBe(true);
    });

    it('handles negative currentTick gracefully', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = -100;
      const status: PlaybackStatus = 'playing';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      // No notes should be highlighted before start
      expect(result.current.size).toBe(0);
    });

    it('handles very large currentTick values', () => {
      const notes = [createTestNote('1', 0, 960)];
      const currentTick = 1_000_000;
      const status: PlaybackStatus = 'playing';

      const { result } = renderHook(() => 
        useNoteHighlight(notes, currentTick, status)
      );

      // No notes should be highlighted far past the end
      expect(result.current.size).toBe(0);
    });
  });
});
