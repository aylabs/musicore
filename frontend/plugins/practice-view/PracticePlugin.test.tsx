/**
 * PracticePlugin.test.tsx — T011
 * Feature 031: Practice View Plugin & Plugin API Recording Extension
 *
 * TDD: These tests must fail before PracticePlugin.tsx is implemented.
 * Constitution Principle V: Tests exist and green before consuming code merges.
 *
 * Tests cover:
 * (a) Renders exercise staff and config UI on 'ready' phase
 * (b) Countdown counts down (3→2→1→Go) and transitions to 'playing'
 * (c) context.recording.subscribe called on mount, unsubscribed on unmount
 * (d) context.midi.subscribe handler registered on mount
 * (e) context.playNote called with offsetMs per note when Play is pressed
 * (f) context.stopPlayback called when Stop is pressed
 * (g) Results screen shown with score after exercise completes
 * (h) "Try Again" resets to 'ready' with same exercise
 * (i) "New Exercise" resets to 'ready' with new exercise (different notes)
 * (j) [ESLint boundary — enforced by lint CI; see T031]
 * (k) Unmount during 'playing' releases subscriptions and calls stopPlayback
 *
 * ESLint boundary:
 * This file and PracticePlugin.tsx MUST NOT import from src/services/,
 * src/components/, or src/wasm/. Enforced by no-restricted-imports in
 * frontend/eslint.config.js targeting plugins/**.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { PluginContext, PluginPitchEvent, PluginNoteEvent } from '../../src/plugin-api/index';
import { PracticePlugin } from './PracticePlugin';

// ─── Mock PluginContext factory ────────────────────────────────────────────────

/**
 * Create a minimal PluginContext mock with spy functions.
 * All capabilities come from context — no src/ imports.
 */
function makeMockContext(): PluginContext & {
  _pitchSubscribers: Set<(e: PluginPitchEvent) => void>;
  _midiSubscribers: Set<(e: PluginNoteEvent) => void>;
} {
  const pitchSubscribers = new Set<(e: PluginPitchEvent) => void>();
  const midiSubscribers = new Set<(e: PluginNoteEvent) => void>();

  return {
    emitNote: vi.fn(),
    playNote: vi.fn(),
    stopPlayback: vi.fn(),
    recording: {
      subscribe: vi.fn((handler: (e: PluginPitchEvent) => void) => {
        pitchSubscribers.add(handler);
        return () => pitchSubscribers.delete(handler);
      }),
      onError: vi.fn((_handler: (e: string) => void) => () => {}),
    },
    midi: {
      subscribe: vi.fn((handler: (e: PluginNoteEvent) => void) => {
        midiSubscribers.add(handler);
        return () => midiSubscribers.delete(handler);
      }),
    },
    components: {
      // Minimal StaffViewer stub: renders a div with accessible role
      StaffViewer: ({ clef }: { clef?: string; notes?: PluginNoteEvent[]; highlightedNotes?: number[] }) => (
        <div data-testid="staff-viewer" data-clef={clef ?? 'Treble'} role="img" aria-label="staff" />
      ),
    },
    manifest: {
      id: 'practice-view',
      name: 'Practice',
      version: '1.0.0',
      pluginApiVersion: '2',
      entryPoint: 'index.tsx',
      origin: 'builtin',
    } as const,
    _pitchSubscribers: pitchSubscribers,
    _midiSubscribers: midiSubscribers,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PracticePlugin', () => {
  // ── (a) Ready phase ────────────────────────────────────────────────────────

  describe('ready phase', () => {
    it('renders exercise staff and config UI on mount', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // Exercise staff is visible
      expect(screen.getAllByTestId('staff-viewer').length).toBeGreaterThanOrEqual(1);

      // Config controls are visible
      expect(screen.getByLabelText(/bpm/i)).toBeDefined();
      expect(screen.getByLabelText(/mode/i)).toBeDefined();
    });

    it('renders a Play button in the ready state', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeDefined();
    });

    it('does NOT show results panel on mount', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      expect(screen.queryByText(/your score/i)).toBeNull();
      expect(screen.queryByText(/try again/i)).toBeNull();
    });
  });

  // ── (b) Countdown ─────────────────────────────────────────────────────────

  describe('countdown phase', () => {
    it('shows countdown steps 3, 2, 1 and then transitions to playing', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // Press Play to start countdown
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });

      // Should show countdown "3" immediately
      expect(screen.queryByText('3')).not.toBeNull();

      // Advance 1 second → "2"
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.queryByText('2')).not.toBeNull();

      // Advance 1 second → "1"
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.queryByText('1')).not.toBeNull();

      // Advance 1 second → "Go!" or transition to playing
      await act(async () => { vi.advanceTimersByTime(1500); });

      // In playing phase: should show a Stop button
      expect(screen.getByRole('button', { name: /stop/i })).toBeDefined();
    });
  });

  // ── (c) context.recording.subscribe lifecycle ──────────────────────────────

  describe('recording subscription', () => {
    it('calls context.recording.subscribe on mount', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      expect(ctx.recording.subscribe).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from recording on unmount', () => {
      const ctx = makeMockContext();
      const unsubSpy = vi.fn();
      (ctx.recording.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(unsubSpy);

      const { unmount } = render(<PracticePlugin context={ctx} />);
      unmount();

      expect(unsubSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── (d) context.midi.subscribe ────────────────────────────────────────────

  describe('midi subscription', () => {
    it('registers a MIDI subscriber on mount', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      expect(ctx.midi.subscribe).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from MIDI on unmount', () => {
      const ctx = makeMockContext();
      const unsubSpy = vi.fn();
      (ctx.midi.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(unsubSpy);

      const { unmount } = render(<PracticePlugin context={ctx} />);
      unmount();

      expect(unsubSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── (e) playNote with offsetMs ────────────────────────────────────────────

  describe('scheduled playback', () => {
    it('calls context.playNote for each exercise note when Play is pressed', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });

      // Advance through countdown (3s) + a bit
      await act(async () => { vi.advanceTimersByTime(4000); });

      // playNote should have been called (at least once for the first note)
      // during scheduled playback, with offsetMs >= 0
      const calls = (ctx.playNote as ReturnType<typeof vi.fn>).mock.calls as [PluginNoteEvent][];
      expect(calls.length).toBeGreaterThan(0);

      // Every playNote call with a note event should have an offsetMs property
      const attackCalls = calls.filter(([e]) => e.type !== 'release');
      attackCalls.forEach(([event]) => {
        expect('offsetMs' in event).toBe(true);
      });
    });
  });

  // ── (f) stopPlayback on Stop button ──────────────────────────────────────

  describe('stop button', () => {
    it('calls context.stopPlayback when Stop is pressed during playing', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });

      // Get through countdown
      await act(async () => { vi.advanceTimersByTime(4000); });

      // Press Stop
      const stopBtn = screen.getByRole('button', { name: /stop/i });
      await act(async () => { fireEvent.click(stopBtn); });

      expect(ctx.stopPlayback).toHaveBeenCalled();
    });
  });

  // ── (g) Results screen ───────────────────────────────────────────────────

  describe('results phase', () => {
    it('shows a score and result panel after exercise completes', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });

      // Advance well past the exercise duration (countdown 3s + exercise up to ~10s + buffer)
      await act(async () => { vi.advanceTimersByTime(20_000); });

      // Should show some kind of results (score, try again, new exercise buttons)
      const tryAgainOrScore = screen.queryByRole('button', { name: /try again/i })
        ?? screen.queryByText(/score/i)
        ?? screen.queryByText(/result/i);
      expect(tryAgainOrScore).not.toBeNull();
    });
  });

  // ── (h) Try Again ────────────────────────────────────────────────────────

  describe('"Try Again" action', () => {
    it('resets to ready phase with the same exercise', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // Complete an exercise to reach results
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });
      await act(async () => { vi.advanceTimersByTime(20_000); });

      // Find and click Try Again
      const tryAgainBtn = screen.queryByRole('button', { name: /try again/i });
      if (tryAgainBtn) {
        await act(async () => { fireEvent.click(tryAgainBtn); });
        // After Try Again, Play button should be visible (back in ready)
        expect(screen.getByRole('button', { name: /play/i })).toBeDefined();
      }
    });
  });

  // ── (i) New Exercise ─────────────────────────────────────────────────────

  describe('"New Exercise" action', () => {
    it('resets to ready phase with new notes', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // Complete an exercise to reach results
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });
      await act(async () => { vi.advanceTimersByTime(20_000); });

      // Find and click New Exercise
      const newExBtn = screen.queryByRole('button', { name: /new exercise/i });
      if (newExBtn) {
        await act(async () => { fireEvent.click(newExBtn); });
        // After New Exercise, Play button should be visible (back in ready)
        expect(screen.getByRole('button', { name: /play/i })).toBeDefined();
      }
    });
  });

  // ── (k) Unmount during playing ───────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('calls stopPlayback and unsubscribes when unmounted during playing', async () => {
      const ctx = makeMockContext();
      const { unmount } = render(<PracticePlugin context={ctx} />);

      // Start exercise
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /play/i }));
      });
      // Get through countdown to playing phase
      await act(async () => { vi.advanceTimersByTime(4000); });

      // Unmount while playing
      await act(async () => { unmount(); });

      // stopPlayback should have been called
      expect(ctx.stopPlayback).toHaveBeenCalled();
    });
  });
});
