/**
 * Feature 026: Playback UI Fixes — User Story 1
 * Regression tests: natural-end playback cleanup
 *
 * Constitution Principle V: Test-First Development
 * These tests FAIL before Fix T003 is applied to MusicTimeline.ts.
 *
 * Root cause: the natural-end window.setTimeout callback only sets React state
 * but does NOT call adapter.stopAll() or scheduler.clearSchedule().
 * When play() is called again, Tone.js schedules notes over the still-active
 * transport, producing overlapping / mixed audio.
 *
 * Fix (T003): add scheduler.clearSchedule(), adapter.stopAll(), and ref resets
 * inside the timeout callback before the state setters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayback } from '../../src/services/playback/MusicTimeline';
import type { Note } from '../../src/types/score';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Use vi.hoisted so variables are available inside vi.mock factory (which is hoisted)
const { mockStopAll, mockStartTransport, mockGetCurrentTime, mockInit, mockScheduleNotes, mockClearSchedule } = vi.hoisted(() => ({
  mockStopAll: vi.fn(),
  mockStartTransport: vi.fn(),
  mockGetCurrentTime: vi.fn(() => 0),
  mockInit: vi.fn().mockResolvedValue(undefined),
  mockScheduleNotes: vi.fn().mockResolvedValue(undefined),
  mockClearSchedule: vi.fn(),
}));

// Mock Tone.js (already mocked globally in setup.ts for all tests)
// Mock ToneAdapter singleton
vi.mock('../../src/services/playback/ToneAdapter', () => ({
  ToneAdapter: {
    getInstance: vi.fn(() => ({
      init: mockInit,
      startTransport: mockStartTransport,
      stopAll: mockStopAll,
      getCurrentTime: mockGetCurrentTime,
    })),
  },
}));

// Mock PlaybackScheduler
vi.mock('../../src/services/playback/PlaybackScheduler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/playback/PlaybackScheduler')>();
  class MockPlaybackScheduler {
    scheduleNotes = mockScheduleNotes;
    clearSchedule = mockClearSchedule;
  }
  return {
    ...actual,
    PlaybackScheduler: MockPlaybackScheduler,
  };
});

// Mock TempoStateContext
vi.mock('../../src/services/state/TempoStateContext', () => ({
  useTempoState: () => ({
    tempoState: { tempoMultiplier: 1.0, tempo: 120 },
    setTempoMultiplier: vi.fn(),
  }),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

/**
 * A single quarter note at tempo 120 BPM (PPQ=960).
 * Duration: 960 ticks = 0.5 seconds → natural-end timeout = (0.5 + 0.1) * 1000 = 600ms
 */
const QUARTER_NOTE: Note[] = [
  { id: 'n1', pitch: 60, start_tick: 0, duration_ticks: 960 },
];

/**
 * Two notes — second note ends at tick 3840 (2 seconds at 120 BPM).
 * Timeout = (2.0 + 0.1) * 1000 = 2100ms
 */
const TWO_NOTES: Note[] = [
  { id: 'n1', pitch: 60, start_tick: 0, duration_ticks: 960 },
  { id: 'n2', pitch: 64, start_tick: 960, duration_ticks: 2880 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPlayback(notes: Note[] = QUARTER_NOTE) {
  return renderHook(() => usePlayback(notes, 120));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MusicTimeline — Natural-End Playback Cleanup (Feature 026 US1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetCurrentTime.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── T002-A: adapter.stopAll() called on natural end ─────────────────────────
  it('T002-A: calls adapter.stopAll() when natural-end timeout fires', async () => {
    const { result } = renderPlayback();

    await act(async () => {
      await result.current.play();
    });

    expect(mockStopAll).not.toHaveBeenCalled(); // Not called during play

    await act(async () => {
      vi.advanceTimersByTime(700); // 600ms timeout + margin
    });

    expect(mockStopAll).toHaveBeenCalledOnce();
  });

  // ── T002-B: scheduler.clearSchedule() called on natural end ─────────────────
  it('T002-B: calls scheduler.clearSchedule() when natural-end timeout fires', async () => {
    const { result } = renderPlayback();

    await act(async () => {
      await result.current.play();
    });

    // clearSchedule may have been called during scheduleNotes setup — reset count
    mockClearSchedule.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(mockClearSchedule).toHaveBeenCalledOnce();
  });

  // ── T002-C: status transitions to 'stopped' after natural end ───────────────
  it('T002-C: status becomes "stopped" after natural-end timeout', async () => {
    const { result } = renderPlayback();

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.status).toBe('playing');

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(result.current.status).toBe('stopped');
  });

  // ── T002-D: tick resets to 0 after natural end ──────────────────────────────
  it('T002-D: currentTick resets to 0 after natural-end timeout', async () => {
    const { result } = renderPlayback();

    await act(async () => {
      await result.current.play();
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(result.current.currentTick).toBe(0);
  });

  // ── T002-E: replay after natural end does not overlap previous transport ─────
  it('T002-E: startTransport called exactly once per play() after natural end (no overlap)', async () => {
    const { result } = renderPlayback();

    // First play
    await act(async () => {
      await result.current.play();
    });

    expect(mockStartTransport).toHaveBeenCalledTimes(1);

    // Let natural end fire
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    // Verify transport was stopped (stopAll called)
    expect(mockStopAll).toHaveBeenCalledTimes(1);

    // Reset spy counters before second play
    mockStartTransport.mockClear();
    mockStopAll.mockClear();
    mockScheduleNotes.mockClear();

    // Second play (replay)
    await act(async () => {
      await result.current.play();
    });

    // startTransport must be called exactly once for the new session
    expect(mockStartTransport).toHaveBeenCalledTimes(1);
    // scheduleNotes must be called fresh for the new session
    expect(mockScheduleNotes).toHaveBeenCalledTimes(1);
  });

  // ── T002-F: natural end cleanup works for multi-note scores ─────────────────
  it('T002-F: stopAll and clearSchedule called after longer score ends naturally', async () => {
    const { result } = renderHook(() => usePlayback(TWO_NOTES, 120));

    await act(async () => {
      await result.current.play();
    });

    mockClearSchedule.mockClear();

    // TWO_NOTES ends at tick 3840 = 2s → timeout = 2100ms
    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    expect(mockStopAll).toHaveBeenCalledOnce();
    expect(mockClearSchedule).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('stopped');
  });
});
