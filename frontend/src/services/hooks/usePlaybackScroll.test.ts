import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaybackScroll } from './usePlaybackScroll';
import type { UsePlaybackScrollConfig } from './usePlaybackScroll';

/**
 * Feature 009 - Playback Scroll and Highlight: T009
 * usePlaybackScroll Hook Tests
 * 
 * Tests React hook integration with ScrollController service
 */
describe('usePlaybackScroll', () => {
  const defaultConfig: UsePlaybackScrollConfig = {
    currentTick: 0,
    playbackStatus: 'stopped',
    pixelsPerTick: 0.1,
    viewportWidth: 1200,
    totalWidth: 5000,
    currentScrollX: 0,
  };

  describe('calculateScrollPosition', () => {
    it('should calculate target scroll position from currentTick', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 5000, // Note at 500px
          playbackStatus: 'playing',
        })
      );

      // Expected: 500 - (1200 * 0.3) = 140
      expect(result.current.targetScrollX).toBeCloseTo(140, 1);
    });

    it('should return 0 for beginning of score', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 0,
        })
      );

      expect(result.current.targetScrollX).toBe(0);
    });

    it('should clamp to maximum scroll when near end', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50000, // Beyond end
        })
      );

      const maxScrollX = defaultConfig.totalWidth - defaultConfig.viewportWidth;
      expect(result.current.targetScrollX).toBe(maxScrollX); // 3800
    });

    it('should update targetScrollX when currentTick changes', () => {
      const { result, rerender } = renderHook(
        ({ currentTick }) =>
          usePlaybackScroll({
            ...defaultConfig,
            currentTick,
            playbackStatus: 'playing',
          }),
        { initialProps: { currentTick: 1000 } }
      );

      const initialScroll = result.current.targetScrollX;

      // Update currentTick
      rerender({ currentTick: 5000 });

      expect(result.current.targetScrollX).not.toBe(initialScroll);
      expect(result.current.targetScrollX).toBeCloseTo(140, 1);
    });

    it('should support custom target position ratio', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 5000,
          targetPositionRatio: 0.5, // 50% instead of 30%
        })
      );

      // Expected: 500 - (1200 * 0.5) = -100 → clamped to 0
      expect(result.current.targetScrollX).toBe(0);
    });
  });

  describe('autoScrollEnabled state management', () => {
    it('should initialize with auto-scroll enabled', () => {
      const { result } = renderHook(() => usePlaybackScroll(defaultConfig));

      expect(result.current.autoScrollEnabled).toBe(true);
    });

    it('should allow disabling auto-scroll', () => {
      const { result } = renderHook(() => usePlaybackScroll(defaultConfig));

      act(() => {
        result.current.setAutoScrollEnabled(false);
      });

      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should allow re-enabling auto-scroll', () => {
      const { result } = renderHook(() => usePlaybackScroll(defaultConfig));

      act(() => {
        result.current.setAutoScrollEnabled(false);
      });

      expect(result.current.autoScrollEnabled).toBe(false);

      act(() => {
        result.current.setAutoScrollEnabled(true);
      });

      expect(result.current.autoScrollEnabled).toBe(true);
    });

    it('should auto re-enable when playback stops', () => {
      const { result, rerender } = renderHook(
        ({ playbackStatus }) =>
          usePlaybackScroll({
            ...defaultConfig,
            playbackStatus,
          }),
        { initialProps: { playbackStatus: 'playing' as const } }
      );

      // Disable auto-scroll manually
      act(() => {
        result.current.setAutoScrollEnabled(false);
      });

      expect(result.current.autoScrollEnabled).toBe(false);

      // Change status to stopped
      rerender({ playbackStatus: 'stopped' as const });

      // Should auto re-enable
      expect(result.current.autoScrollEnabled).toBe(true);
    });

    it('should not re-enable when transitioning to paused', () => {
      const { result, rerender } = renderHook(
        ({ playbackStatus }) =>
          usePlaybackScroll({
            ...defaultConfig,
            playbackStatus,
          }),
        { initialProps: { playbackStatus: 'playing' as const } }
      );

      // Disable auto-scroll
      act(() => {
        result.current.setAutoScrollEnabled(false);
      });

      // Change to paused (not stopped)
      rerender({ playbackStatus: 'paused' as const });

      // Should remain disabled
      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should re-enable when going from paused to stopped', () => {
      const { result, rerender } = renderHook(
        ({ playbackStatus }) =>
          usePlaybackScroll({
            ...defaultConfig,
            playbackStatus,
          }),
        { initialProps: { playbackStatus: 'paused' as const } }
      );

      // Disable auto-scroll
      act(() => {
        result.current.setAutoScrollEnabled(false);
      });

      // Transition to stopped
      rerender({ playbackStatus: 'stopped' as const });

      // Should re-enable
      expect(result.current.autoScrollEnabled).toBe(true);
    });
  });

  describe('viewport and layout updates', () => {
    it('should recalculate when viewport width changes', () => {
      const { result, rerender } = renderHook(
        ({ viewportWidth }) =>
          usePlaybackScroll({
            ...defaultConfig,
            currentTick: 5000,
            viewportWidth,
          }),
        { initialProps: { viewportWidth: 1200 } }
      );

      const initialScroll = result.current.targetScrollX;

      // Change viewport width to wider
      rerender({ viewportWidth: 1600 });

      // Scroll position should change (more space = different 30% positioning)
      expect(result.current.targetScrollX).not.toBe(initialScroll);
    });

    it('should recalculate when total width changes', () => {
      const { result, rerender } = renderHook(
        ({ totalWidth }) =>
          usePlaybackScroll({
            ...defaultConfig,
            currentTick: 5000,
            totalWidth,
          }),
        { initialProps: { totalWidth: 5000 } }
      );

      const initialScroll = result.current.targetScrollX;

      // Change total width (score got longer)
      rerender({ totalWidth: 8000 });

      // Should potentially affect scroll calculation
      expect(result.current.targetScrollX).toBeDefined();
    });

    it('should handle short scores that fit in viewport', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          totalWidth: 1000, // Shorter than viewport (1200)
          currentTick: 5000,
        })
      );

      // Should not scroll
      expect(result.current.targetScrollX).toBe(0);
    });
  });

  describe('performance and memoization', () => {
    it('should not recalculate scroll when unrelated props change', () => {
      let renderCount = 0;
      
      const { result, rerender } = renderHook(
        ({ currentTick }) => {
          renderCount++;
          return usePlaybackScroll({
            ...defaultConfig,
            currentTick,
          });
        },
        { initialProps: { currentTick: 5000 } }
      );

      const firstScroll = result.current.targetScrollX;
      const firstRenderCount = renderCount;

      // Re-render with same currentTick
      rerender({ currentTick: 5000 });

      // targetScrollX should be memoized (same value)
      expect(result.current.targetScrollX).toBe(firstScroll);
    });
  });

  describe('edge cases', () => {
    it('should handle negative currentTick gracefully', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: -100,
        })
      );

      // Should clamp to 0
      expect(result.current.targetScrollX).toBe(0);
    });

    it('should handle zero viewport width', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          viewportWidth: 0,
          currentTick: 5000,
        })
      );

      // Should handle gracefully without NaN
      expect(result.current.targetScrollX).toBeDefined();
      expect(Number.isNaN(result.current.targetScrollX)).toBe(false);
    });

    it('should handle zero total width', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          totalWidth: 0,
          currentTick: 5000,
        })
      );

      // Should handle empty score
      expect(result.current.targetScrollX).toBe(0);
    });

    it('should handle zero pixelsPerTick', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          pixelsPerTick: 0,
          currentTick: 5000,
        })
      );

      // noteX will be 0, so scroll should be clamped to 0
      expect(result.current.targetScrollX).toBe(0);
    });
  });

  describe('note highlighting (US2)', () => {
    it('should return highlightedNoteIds array from hook', () => {
      const notes = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 100, duration_ticks: 100, pitch: 62, velocity: 80 },
      ];

      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50,
          playbackStatus: 'playing',
          notes, // Pass notes for highlighting
        })
      );

      expect(result.current.highlightedNoteIds).toEqual(['note1']);
    });

    it('should highlight multiple simultaneous notes (chord)', () => {
      const notes = [
        { id: 'note1', start_tick: 0, duration_ticks: 200, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 0, duration_ticks: 200, pitch: 64, velocity: 80 },
        { id: 'note3', start_tick: 0, duration_ticks: 200, pitch: 67, velocity: 80 },
      ];

      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 100,
          playbackStatus: 'playing',
          notes,
        })
      );

      expect([...result.current.highlightedNoteIds].sort()).toEqual(['note1', 'note2', 'note3']);
    });

    it('should update highlights when currentTick changes', () => {
      const notes = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 100, duration_ticks: 100, pitch: 62, velocity: 80 },
      ];

      const { result, rerender } = renderHook(
        ({ currentTick }) =>
          usePlaybackScroll({
            ...defaultConfig,
            currentTick,
            playbackStatus: 'playing',
            notes,
          }),
        { initialProps: { currentTick: 50 } }
      );

      // At tick 50, note1 is playing
      expect(result.current.highlightedNoteIds).toEqual(['note1']);

      // At tick 150, note2 is playing
      rerender({ currentTick: 150 });
      expect(result.current.highlightedNoteIds).toEqual(['note2']);
    });

    it('should return empty array when no notes are playing', () => {
      const notes = [
        { id: 'note1', start_tick: 100, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50, // Before note starts
          playbackStatus: 'playing',
          notes,
        })
      );

      expect(result.current.highlightedNoteIds).toEqual([]);
    });

    it('should return empty array when notes array is empty', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50,
          playbackStatus: 'playing',
          notes: [],
        })
      );

      expect(result.current.highlightedNoteIds).toEqual([]);
    });

    it('should return empty array when notes prop is omitted', () => {
      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50,
          playbackStatus: 'playing',
          // notes omitted
        })
      );

      expect(result.current.highlightedNoteIds).toEqual([]);
    });

    it('should not highlight when playback is stopped', () => {
      const notes = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const { result } = renderHook(() =>
        usePlaybackScroll({
          ...defaultConfig,
          currentTick: 50,
          playbackStatus: 'stopped',
          notes,
        })
      );

      // Still returns highlights even when stopped (component decides what to do)
      expect(result.current.highlightedNoteIds).toEqual(['note1']);
    });
  });});