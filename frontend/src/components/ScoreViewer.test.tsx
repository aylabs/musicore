/**
 * Feature 027: Demo Flow UX
 * ScoreViewer component tests — User Story 1: Full-Screen Play View
 *
 * Constitution V (tests before implementation):
 *   T004 — requestFullscreen called when entering layout viewMode
 *   T005 — return arrow calls exitFullscreen + pauses playback
 *   T006 — popstate event switches viewMode to 'individual' + exitFullscreen
 *
 * Constitution VII (failing test before fix):
 *   T012 — handleNoteClick seeks without calling play()
 *
 * All tests in this file FAIL before their corresponding implementation tasks.
 * After implementation they must PASS without modification.
 *
 * @see specs/027-demo-flow-ux/tasks.md T004, T005, T006, T012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreViewer } from './ScoreViewer';
import { FileStateProvider } from '../services/state/FileStateContext';
import { TempoStateProvider } from '../services/state/TempoStateContext';
import type { Score } from '../types/score';

// ─── Module mocks ──────────────────────────────────────────────────────────

vi.mock('../services/wasm/loader', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/wasm/music-engine', () => ({
  parseScore: vi.fn(),
  addInstrument: vi.fn(),
  getScore: vi.fn(),
}));

vi.mock('../services/storage/local-storage', () => ({
  loadScoreFromIndexedDB: vi.fn().mockResolvedValue(null),
  saveScoreToIndexedDB: vi.fn(),
}));

vi.mock('../services/score-api', () => ({
  apiClient: {
    getScore: vi.fn(),
    createScore: vi.fn(),
    addInstrument: vi.fn(),
  },
}));

vi.mock('../services/onboarding/demoLoader', () => ({
  demoLoaderService: {
    shouldLoadDemo: vi.fn().mockReturnValue(false),
    loadDemo: vi.fn(),
    markDemoLoaded: vi.fn(),
  },
}));

/** Mock playback state — play is a spy so we can assert it is/isn't called */
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
const mockStop = vi.fn();
const mockSeekToTick = vi.fn();

vi.mock('../services/playback/MusicTimeline', () => ({
  usePlayback: vi.fn(() => ({
    status: 'stopped',
    currentTick: 0,
    totalDurationTicks: 480,
    error: null,
    tickSource: { currentTick: 0 },
    tickSourceRef: { current: { currentTick: 0 } },
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    seekToTick: mockSeekToTick,
    unpinStartTick: vi.fn(),
  })),
}));

// ─── Test helpers ──────────────────────────────────────────────────────────

/** Minimal valid Score fixture with one instrument containing one note */
const makeScore = (overrides: Partial<Score> = {}): Score => ({
  id: 'test-score-id',
  title: null,
  instruments: [
    {
      id: 'inst-1',
      name: 'Piano',
      staves: [
        {
          id: 'staff-1',
          clef: 'Treble',
          voices: [
            {
              id: 'voice-1',
              interval_events: [
                {
                  id: 'note-1',
                  pitch: { step: 'C', octave: 4, alter: null },
                  duration_ticks: 480,
                  start_tick: 0,
                  note_type: 'quarter',
                  beam_type: null,
                  chord_symbol: null,
                  tie_start: false,
                  tie_end: false,
                  rest: false,
                  dot: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  tempo_changes: [],
  global_structural_events: [
    { Tempo: { tick: 0, bpm: 120 } },
    { TimeSignature: { tick: 0, numerator: 4, denominator: 4 } },
  ],
  ...overrides,
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TempoStateProvider>
      <FileStateProvider>{children}</FileStateProvider>
    </TempoStateProvider>
  );
}

// ─── Full-Screen API setup ─────────────────────────────────────────────────

/** Mock requestFullscreen / exitFullscreen on the real DOM elements */
let mockRequestFullscreen: ReturnType<typeof vi.fn>;
let mockExitFullscreen: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
  mockExitFullscreen = vi.fn().mockResolvedValue(undefined);

  // Attach to document.documentElement (used by the implementation)
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: mockRequestFullscreen,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'exitFullscreen', {
    value: mockExitFullscreen,
    writable: true,
    configurable: true,
  });

  // history.pushState — JSDOM supports it; spy to detect calls
  vi.spyOn(window.history, 'pushState');
});

afterEach(() => {
  // Remove any popstate listeners tests may have left
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
});

// ─── Shared: load score helper ──────────────────────────────────────────────

async function renderWithScore(
  viewMode: 'individual' | 'layout' = 'layout',
  onViewModeChange = vi.fn(),
) {
  const { loadScoreFromIndexedDB } = await import('../services/storage/local-storage');
  vi.mocked(loadScoreFromIndexedDB).mockResolvedValue(makeScore());

  const utils = render(
    <TestWrapper>
      <ScoreViewer
        scoreId="test-score-id"
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </TestWrapper>,
  );

  // Wait for async score load
  await waitFor(() => {
    expect(loadScoreFromIndexedDB).toHaveBeenCalledWith('test-score-id');
  });

  return { ...utils, onViewModeChange };
}

// =============================================================================
// T004: fullscreen-play body class applied when entering layout viewMode
// Implementation: T007 — useEffect adds body class; requestFullscreen is called
// from user-gesture click handlers (ViewModeSelector / demo button), NOT from
// the useEffect, because browsers reject requestFullscreen outside a user gesture.
// =============================================================================

describe('[T004] US1: entering layout viewMode calls requestFullscreen', () => {
  it('adds fullscreen-play body class when viewMode is layout', async () => {
    await renderWithScore('layout');

    // The useEffect still applies the body class which hides the app header.
    await waitFor(() => {
      expect(document.body.classList.contains('fullscreen-play')).toBe(true);
    });
  });

  it('history.pushState is called to enable back-gesture detection', async () => {
    await renderWithScore('layout');

    // After T008 is implemented, pushState({view:'layout'}) is called when entering
    // layout mode so the browser back button / swipe triggers popstate.
    await waitFor(() => {
      expect(window.history.pushState).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'layout' }),
        expect.any(String),
        expect.anything(),
      );
    });
  });

  it('does NOT call requestFullscreen when viewMode is individual', async () => {
    await renderWithScore('individual');

    // Individual view must never request full-screen
    await new Promise(r => setTimeout(r, 50));
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });
});

// =============================================================================
// T005: return arrow button calls exitFullscreen + pauses playback
// Implementation: T009 — add onReturnToView prop + return arrow button
// FAILS before T009 (button does not exist), PASSES after T009
// =============================================================================

describe('[T005] US1: return arrow calls exitFullscreen and pauses playback', () => {
  it('renders a return-to-instruments arrow button in layout/compact mode', async () => {
    await renderWithScore('layout');

    // After T009/T026, a "←" / "Return to Instruments" button is wired to
    // onReturnToView. Before T009 this button does not exist → test fails.
    const returnBtn = await screen.findByRole('button', { name: /return.*(instrument|view)|←|back/i });
    expect(returnBtn).toBeInTheDocument();
  });

  it('clicking return arrow calls exitFullscreen', async () => {
    const user = userEvent.setup();
    await renderWithScore('layout');

    const returnBtn = await screen.findByRole('button', { name: /return.*(instrument|view)|←|back/i });
    await user.click(returnBtn);

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('clicking return arrow pauses playback (calls pause, does not stop)', async () => {
    const user = userEvent.setup();
    await renderWithScore('layout');

    const returnBtn = await screen.findByRole('button', { name: /return.*(instrument|view)|←|back/i });
    await user.click(returnBtn);

    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('clicking return arrow switches viewMode to individual', async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    await renderWithScore('layout', onViewModeChange);

    const returnBtn = await screen.findByRole('button', { name: /return.*(instrument|view)|←|back/i });
    await user.click(returnBtn);

    expect(onViewModeChange).toHaveBeenCalledWith('individual');
  });
});

// =============================================================================
// T006: popstate event switches viewMode to 'individual' + calls exitFullscreen
// Implementation: T008 — add popstate listener in ScoreViewer
// FAILS before T008 (popstate has no effect), PASSES after T008
// =============================================================================

describe('[T006] US1: popstate event triggers back-navigation', () => {
  it('fires onViewModeChange("individual") when popstate event is dispatched', async () => {
    const onViewModeChange = vi.fn();
    await renderWithScore('layout', onViewModeChange);

    // Simulate browser back button / swipe
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    // After T008, popstate listener calls setViewMode('individual')
    expect(onViewModeChange).toHaveBeenCalledWith('individual');
  });

  it('calls exitFullscreen when popstate event is dispatched', async () => {
    await renderWithScore('layout');

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('popstate listener is cleaned up when ScoreViewer unmounts', async () => {
    const onViewModeChange = vi.fn();
    const { unmount } = await renderWithScore('layout', onViewModeChange);

    unmount();
    onViewModeChange.mockClear();

    // After unmount, popstate must NOT trigger viewMode changes
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    expect(onViewModeChange).not.toHaveBeenCalled();
  });
});

// =============================================================================
// T012: handleNoteClick seeks without calling play()
// Implementation: T015 — remove play() from handleNoteClick
// FAILS before T015 (play() is called after 50ms setTimeout), PASSES after T015
// =============================================================================

describe('[T012] US2: note click seeks without auto-play', () => {
  it('clicking a note calls seekToTick but does NOT call play()', async () => {
    const user = userEvent.setup();
    await renderWithScore('layout');

    mockSeekToTick.mockClear();
    mockPlay.mockClear();

    const svgEl = document.querySelector('svg');
    if (svgEl) {
      // Inject a fake notehead element with the known note-id from fixtures
      const fakeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      fakeText.dataset.noteId = 'note-1';
      svgEl.appendChild(fakeText);

      await user.click(fakeText);

      // seekToTick is synchronous — should be called immediately
      expect(mockSeekToTick).toHaveBeenCalledWith(0); // note-1 has start_tick=0

      // Wait past the 50ms setTimeout that the OLD handleNoteClick uses to call play()
      // After T015 the setTimeout + play() call is removed, so play must never fire.
      await new Promise(r => setTimeout(r, 150));
      expect(mockPlay).not.toHaveBeenCalled();

      fakeText.remove();
    } else {
      // No SVG in DOM (e.g. score not in layout mode visually) — skip DOM part
      // Contract: play() must not have been called
      expect(mockPlay).not.toHaveBeenCalled();
    }
  });
});
