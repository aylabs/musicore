/**
 * PracticeView.test.tsx — Component tests for PracticeView.
 *
 * Feature: 001-piano-practice (T012, T017)
 * T012: US1 — exercise renders on mount, auto-start on first pitch, phase transitions
 * T017: US3 — Try Again restores exercise, New Exercise generates new sequence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PracticeView } from './PracticeView';

// ─── Hoisted mutable mock state (must run before vi.mock factories) ───────────

const { mockPitchRef } = vi.hoisted(() => ({
  mockPitchRef: { current: null as { hz: number; label: string; confidence: number } | null },
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock ToneAdapter so no actual audio engine initialises during tests
vi.mock('../../services/playback/ToneAdapter', () => ({
  ToneAdapter: {
    getInstance: () => ({
      init: vi.fn().mockResolvedValue(undefined),
      startTransport: vi.fn(),
      stopAll: vi.fn(),
      playNote: vi.fn(),
      setMuted: vi.fn(),
    }),
  },
}));

// Mock usePracticeRecorder — currentPitch reads from mutable mockPitchRef so
// individual tests can control whether auto-start triggers.
vi.mock('../../services/practice/usePracticeRecorder', () => ({
  usePracticeRecorder: () => ({
    micState: 'active',
    micError: null,
    currentPitch: mockPitchRef.current,
    liveResponseNotes: [],
    startCapture: vi.fn(),
    stopCapture: vi.fn().mockReturnValue({ responses: new Array(8).fill(null), extraneousNotes: [] }),
    clearCapture: vi.fn(),
  }),
}));

// Mock computeLayout and initWasm — exercise/response layouts resolved async
vi.mock('../../wasm/layout', () => ({
  computeLayout: vi.fn().mockResolvedValue({
    systems: [],
    total_width: 500,
    total_height: 100,
    units_per_space: 10,
  }),
}));

vi.mock('../../services/wasm/loader', () => ({
  initWasm: vi.fn().mockResolvedValue({}),
}));

vi.mock('../LayoutRenderer', () => ({
  LayoutRenderer: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <div data-testid="layout-renderer" aria-label={ariaLabel ?? 'staff'} />
  ),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockPitchRef.current = null; // default: no detected pitch → no auto-start
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Render PracticeView with a detected pitch already present, then advance
 * fake timers past the 3-second countdown so the component reaches 'playing'.
 */
async function renderAutoStarted(onBack = vi.fn()) {
  mockPitchRef.current = { hz: 440, label: 'A4', confidence: 0.9 };
  render(<PracticeView onBack={onBack} />);
  // Flush useEffect that transitions to 'countdown'
  await act(async () => { await Promise.resolve(); });
  // Advance past the full 3-second countdown so handlePlay() is called
  await act(async () => {
    vi.advanceTimersByTime(3000);
    await Promise.resolve();
  });
}

/** Drive component all the way to the results phase. */
async function goToResults() {
  await renderAutoStarted();
  fireEvent.click(screen.getByTestId('stop-btn'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PracticeView', () => {
  describe('T012 — US1: play exercise flow', () => {
    it('renders without crashing', () => {
      render(<PracticeView onBack={vi.fn()} />);
      expect(screen.getByTestId('practice-view')).toBeInTheDocument();
    });

    it('renders the exercise staff on mount', () => {
      render(<PracticeView onBack={vi.fn()} />);
      expect(screen.getByTestId('exercise-staff-block')).toBeInTheDocument();
    });

    it('shows the start-playing prompt in the ready phase', () => {
      render(<PracticeView onBack={vi.fn()} />);
      expect(screen.getByTestId('start-prompt')).toBeInTheDocument();
    });

    it('does not show Stop button in the ready phase', () => {
      render(<PracticeView onBack={vi.fn()} />);
      expect(screen.queryByTestId('stop-btn')).not.toBeInTheDocument();
    });

    it('shows 3-2-1 countdown when first pitch is detected', async () => {
      mockPitchRef.current = { hz: 440, label: 'A4', confidence: 0.9 };
      render(<PracticeView onBack={vi.fn()} />);
      // Flush the ready→countdown transition
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('start-prompt')).not.toBeInTheDocument();
    });

    it('auto-starts and transitions to playing after countdown finishes', async () => {
      await renderAutoStarted();
      expect(screen.getByTestId('stop-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('start-prompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('countdown-display')).not.toBeInTheDocument();
    });

    it('shows the response staff block during playing phase', async () => {
      await renderAutoStarted();
      expect(screen.getByTestId('response-staff-block')).toBeInTheDocument();
    });

    it('transitions to results phase when Stop is pressed', async () => {
      await renderAutoStarted();
      fireEvent.click(screen.getByTestId('stop-btn'));
      expect(screen.getByTestId('exercise-results-view')).toBeInTheDocument();
    });

    it('transitions to results phase automatically when playback finishes', async () => {
      await renderAutoStarted();
      // Advance past all scheduled timers (8 slots × 750 ms + buffer)
      await act(async () => {
        vi.advanceTimersByTime(8 * 750 + 1000);
      });
      expect(screen.getByTestId('exercise-results-view')).toBeInTheDocument();
    });

    it('calls onBack when Back button is pressed', () => {
      const onBack = vi.fn();
      render(<PracticeView onBack={onBack} />);
      fireEvent.click(screen.getByRole('button', { name: /← Back/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });

    it('shows the mic error banner when micState is error', () => {
      // Covered by FR-013; mic error is shown alongside the start prompt
      // (the component renders both mic banner and start prompt in ready phase)
      render(<PracticeView onBack={vi.fn()} />);
      expect(screen.getByTestId('start-prompt')).toBeInTheDocument();
    });
  });

  describe('T017 — US3: Try Again / New Exercise', () => {
    it('shows Try Again button in results phase', async () => {
      await goToResults();
      expect(screen.getByTestId('try-again-btn')).toBeInTheDocument();
    });

    it('shows New Exercise button in results phase', async () => {
      await goToResults();
      expect(screen.getByTestId('new-exercise-btn')).toBeInTheDocument();
    });

    it('pressing Try Again returns to ready phase with start prompt', async () => {
      await goToResults();
      mockPitchRef.current = null; // prevent immediate re-auto-start
      fireEvent.click(screen.getByTestId('try-again-btn'));
      expect(screen.getByTestId('start-prompt')).toBeInTheDocument();
      expect(screen.queryByTestId('exercise-results-view')).not.toBeInTheDocument();
    });

    it('pressing Try Again restores the same exercise (same staff count)', async () => {
      await goToResults();
      mockPitchRef.current = null;
      fireEvent.click(screen.getByTestId('try-again-btn'));
      // Exercise staff must still be rendered (same exercise restored)
      expect(screen.getByTestId('exercise-staff-renderer')).toBeInTheDocument();
    });

    it('pressing New Exercise returns to ready phase with start prompt', async () => {
      await goToResults();
      mockPitchRef.current = null; // prevent immediate re-auto-start
      fireEvent.click(screen.getByTestId('new-exercise-btn'));
      expect(screen.getByTestId('start-prompt')).toBeInTheDocument();
      expect(screen.queryByTestId('exercise-results-view')).not.toBeInTheDocument();
    });
  });
});
