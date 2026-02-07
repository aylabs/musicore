import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackScheduler, ticksToSeconds } from './PlaybackScheduler';
import type { Note } from '../../types/score';

// Mock ToneAdapter to avoid loading tone.js in tests
vi.mock('./ToneAdapter', () => {
  const mockPlayNote = vi.fn();
  const mockStopAll = vi.fn();
  const mockInit = vi.fn().mockResolvedValue(undefined);
  const mockGetCurrentTime = vi.fn(() => 0);

  return {
    ToneAdapter: {
      getInstance: vi.fn(() => ({
        init: mockInit,
        playNote: mockPlayNote,
        stopAll: mockStopAll,
        getCurrentTime: mockGetCurrentTime,
        isInitialized: vi.fn(() => true),
      })),
    },
  };
});

/**
 * T029-T030: Unit tests for PlaybackScheduler
 * 
 * Feature 003 - Music Playback: User Story 2
 * Tests tick-to-time conversion and note scheduling with accurate timing.
 */
describe('PlaybackScheduler', () => {
  /**
   * T029: Unit tests for ticksToSeconds() conversion
   * 
   * Formula: seconds = ticks / (tempo/60 * PPQ)
   * PPQ = 960 (pulses per quarter note)
   */
  describe('ticksToSeconds', () => {
    it('should convert quarter note at 120 BPM to 0.5 seconds', () => {
      // At 120 BPM, one beat = 0.5 seconds
      // One quarter note = 960 ticks
      const seconds = ticksToSeconds(960, 120);
      expect(seconds).toBeCloseTo(0.5, 5);
    });

    it('should convert quarter note at 60 BPM to 1.0 second', () => {
      // At 60 BPM, one beat = 1.0 second
      // One quarter note = 960 ticks
      const seconds = ticksToSeconds(960, 60);
      expect(seconds).toBeCloseTo(1.0, 5);
    });

    it('should convert half note (1920 ticks) at 120 BPM to 1.0 second', () => {
      const seconds = ticksToSeconds(1920, 120);
      expect(seconds).toBeCloseTo(1.0, 5);
    });

    it('should convert eighth note (480 ticks) at 120 BPM to 0.25 seconds', () => {
      const seconds = ticksToSeconds(480, 120);
      expect(seconds).toBeCloseTo(0.25, 5);
    });

    it('should handle tick 0 as time 0', () => {
      const seconds = ticksToSeconds(0, 120);
      expect(seconds).toBe(0);
    });

    it('should scale linearly with different tick values', () => {
      // At 120 BPM:
      // 960 ticks = 0.5s, so 1920 ticks = 1.0s, 3840 ticks = 2.0s
      expect(ticksToSeconds(960, 120)).toBeCloseTo(0.5, 5);
      expect(ticksToSeconds(1920, 120)).toBeCloseTo(1.0, 5);
      expect(ticksToSeconds(3840, 120)).toBeCloseTo(2.0, 5);
    });

    it('should handle fast tempo (200 BPM)', () => {
      // At 200 BPM, one beat = 0.3 seconds
      const seconds = ticksToSeconds(960, 200);
      expect(seconds).toBeCloseTo(0.3, 5);
    });

    it('should handle slow tempo (40 BPM)', () => {
      // At 40 BPM, one beat = 1.5 seconds
      const seconds = ticksToSeconds(960, 40);
      expect(seconds).toBeCloseTo(1.5, 5);
    });
  });

  /**
   * T030: Unit tests for PlaybackScheduler.scheduleNotes()
   */
  describe('PlaybackScheduler', () => {
    let scheduler: PlaybackScheduler;
    let mockToneAdapter: any;

    beforeEach(async () => {
      // Clear all mocks before each test
      vi.clearAllMocks();

      // Get the mocked ToneAdapter instance
      const { ToneAdapter } = await import('./ToneAdapter');
      mockToneAdapter = ToneAdapter.getInstance();
      scheduler = new PlaybackScheduler(mockToneAdapter);
    });

    it('should schedule notes at correct times', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: 'note2', start_tick: 960, duration_ticks: 960, pitch: 62 },
        { id: 'note3', start_tick: 1920, duration_ticks: 960, pitch: 64 },
      ];

      scheduler.scheduleNotes(notes, 120, 0);

      // At 120 BPM: 960 ticks = 0.5s
      expect(mockToneAdapter.playNote).toHaveBeenCalledTimes(3);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(1, 60, 0.5, 0);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(2, 62, 0.5, 0.5);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(3, 64, 0.5, 1.0);
    });

    it('should calculate note durations correctly', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 1920, pitch: 60 }, // Half note
        { id: 'note2', start_tick: 1920, duration_ticks: 480, pitch: 62 }, // Eighth note
      ];

      scheduler.scheduleNotes(notes, 120, 0);

      // Half note duration = 1920 ticks = 1.0s at 120 BPM
      // Eighth note duration = 480 ticks = 0.25s at 120 BPM
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(1, 60, 1.0, 0);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(2, 62, 0.25, 1.0);
    });

    it('should apply currentTick offset to start times', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: 'note2', start_tick: 960, duration_ticks: 960, pitch: 62 },
      ];

      // Resume from tick 960 (0.5 seconds into the score)
      scheduler.scheduleNotes(notes, 120, 960);

      // Note 1 should not play (start_tick 0 < currentTick 960)
      // Note 2 should play immediately (start_tick 960 - currentTick 960 = 0)
      expect(mockToneAdapter.playNote).toHaveBeenCalledTimes(1);
      expect(mockToneAdapter.playNote).toHaveBeenCalledWith(62, 0.5, 0);
    });

    it('should handle simultaneous notes (same start_tick)', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: 'note2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // Chord
        { id: 'note3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // Chord
      ];

      scheduler.scheduleNotes(notes, 120, 0);

      // All three notes should schedule at exactly time 0
      expect(mockToneAdapter.playNote).toHaveBeenCalledTimes(3);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(1, 60, 0.5, 0);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(2, 64, 0.5, 0);
      expect(mockToneAdapter.playNote).toHaveBeenNthCalledWith(3, 67, 0.5, 0);
    });

    it('should enforce minimum duration for very short notes', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 10, pitch: 60 }, // Extremely short
      ];

      scheduler.scheduleNotes(notes, 120, 0);

      // Duration should be at least 0.05 seconds (50ms)
      const call = mockToneAdapter.playNote.mock.calls[0];
      expect(call[1]).toBeGreaterThanOrEqual(0.05);
    });

    it('should handle empty notes array', () => {
      scheduler.scheduleNotes([], 120, 0);

      expect(mockToneAdapter.playNote).not.toHaveBeenCalled();
    });

    it('should use default tempo of 120 BPM if tempo is invalid', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      ];

      // Test with 0 BPM (invalid)
      scheduler.scheduleNotes(notes, 0, 0);

      // Should use 120 BPM as fallback: 960 ticks = 0.5s
      expect(mockToneAdapter.playNote).toHaveBeenCalledWith(60, 0.5, 0);
    });

    it('should clear schedule when clearSchedule is called', () => {
      scheduler.clearSchedule();

      expect(mockToneAdapter.stopAll).toHaveBeenCalled();
    });
  });

  /**
   * T039: Verify PPQ constant is documented
   */
  describe('PPQ constant', () => {
    it('should use 960 ticks per quarter note', () => {
      // Verify the conversion formula uses PPQ = 960
      // At 60 BPM: 1 beat = 1 second, 1 quarter note = 960 ticks
      const seconds = ticksToSeconds(960, 60);
      expect(seconds).toBeCloseTo(1.0, 5);
    });
  });
});
