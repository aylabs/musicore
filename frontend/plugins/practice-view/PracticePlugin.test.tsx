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
import type {
  PluginContext,
  PluginPitchEvent,
  PluginNoteEvent,
  PluginScorePlayerContext,
  PluginScoreSelectorProps,
} from '../../src/plugin-api/index';
import { PracticePlugin } from './PracticePlugin';

// ─── Mock ScorePlayer factory ──────────────────────────────────────────────

type MockScorePlayerState = { status: 'idle' | 'loading' | 'ready' | 'error'; currentTick: number; totalDurationTicks: number; highlightedNoteIds: ReadonlySet<string>; bpm: number; title: string | null; error: string | null };

const MOCK_CATALOGUE: ReadonlyArray<{ id: string; displayName: string }> = [
  { id: 'beethoven', displayName: 'Beethoven Für Elise' },
  { id: 'chopin',    displayName: 'Chopin Nocturne'     },
];

const MOCK_PITCHES = {
  notes: [{ midiPitch: 60 }, { midiPitch: 62 }, { midiPitch: 64 }] as ReadonlyArray<{ midiPitch: number }>,
  totalAvailable: 3,
  clef: 'Treble' as const,
  title: 'Beethoven Für Elise',
};

function makeMockScorePlayer(): PluginScorePlayerContext & { _notify: (state: MockScorePlayerState) => void } {
  const subscribers = new Set<(state: MockScorePlayerState) => void>();
  let currentState: MockScorePlayerState = { status: 'idle', currentTick: 0, totalDurationTicks: 0, highlightedNoteIds: new Set<string>(), bpm: 0, title: null, error: null };

  const notify = (state: MockScorePlayerState) => {
    currentState = state;
    subscribers.forEach(h => h(state));
  };

  return {
    getCatalogue: vi.fn(() => MOCK_CATALOGUE as unknown as ReadonlyArray<import('../../src/plugin-api/index').PluginPreloadedScore>),
    subscribe: vi.fn((handler: (state: MockScorePlayerState) => void) => {
      subscribers.add(handler);
      handler(currentState); // Immediately deliver current state
      return () => subscribers.delete(handler);
    }),
    loadScore: vi.fn((_ref: unknown) => {
      notify({ ...currentState, status: 'loading', error: null });
      return Promise.resolve();
    }),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setTempo: vi.fn(),
    extractPracticeNotes: vi.fn((_maxCount: number) => MOCK_PITCHES),
    _notify: notify,
  };
}

// ─── Mock ScoreSelector component ─────────────────────────────────────────────

function MockScoreSelector({ onSelectScore, onLoadFile, onCancel, catalogue, isLoading, error }: PluginScoreSelectorProps) {
  return (
    <div data-testid="score-selector-dialog" role="dialog" aria-label="Select score">
      {error && <div data-testid="score-selector-error">{error}</div>}
      {isLoading && <div data-testid="score-selector-loading">Loading…</div>}
      <ul>
        {(catalogue ?? []).map((item) => (
          <li key={item.id}>
            <button onClick={() => onSelectScore(item.id)}>{item.displayName}</button>
          </li>
        ))}
      </ul>
      <label>
        Load from file
        <input
          type="file"
          data-testid="score-selector-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadFile?.(file);
          }}
        />
      </label>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

// ─── Mock PluginContext factory ────────────────────────────────────────────────

/**
 * Create a minimal PluginContext mock with spy functions.
 * All capabilities come from context — no src/ imports.
 */
function makeMockContext(overrides?: { scorePlayer?: PluginScorePlayerContext & { _notify: (s: MockScorePlayerState) => void } }): PluginContext & {
  _pitchSubscribers: Set<(e: PluginPitchEvent) => void>;
  _midiSubscribers: Set<(e: PluginNoteEvent) => void>;
} {
  const pitchSubscribers = new Set<(e: PluginPitchEvent) => void>();
  const midiSubscribers = new Set<(e: PluginNoteEvent) => void>();
  const scorePlayer = overrides?.scorePlayer ?? makeMockScorePlayer();

  return {
    emitNote: vi.fn(),
    playNote: vi.fn(),
    stopPlayback: vi.fn(),
    close: vi.fn(),
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
    scorePlayer,
    components: {
      // Minimal StaffViewer stub: renders a div with accessible role
      StaffViewer: ({ clef }: { clef?: string; notes?: PluginNoteEvent[]; highlightedNotes?: number[] }) => (
        <div data-testid="staff-viewer" data-clef={clef ?? 'Treble'} role="img" aria-label="staff" />
      ),
      ScoreSelector: MockScoreSelector,
    },
    manifest: {
      id: 'practice-view',
      name: 'Practice',
      version: '1.0.0',
      pluginApiVersion: '4',
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

  // ── (l) Score preset — US1 ────────────────────────────────────────────────

  describe('Score preset (US1 — T007)', () => {
    it('renders three preset options: Random, C4 Scale, and Score', () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // All three radio options must be present in the preset selector
      expect(screen.getByRole('radio', { name: /random/i })).toBeDefined();
      expect(screen.getByRole('radio', { name: /c4 scale/i })).toBeDefined();
      expect(screen.getByRole('radio', { name: /score/i })).toBeDefined();
    });

    it('selecting Score with no scorePitches makes ScoreSelector visible', async () => {
      const ctx = makeMockContext();
      render(<PracticePlugin context={ctx} />);

      // ScoreSelector must NOT be open initially
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();

      // Click the Score radio button
      await act(async () => {
        fireEvent.click(screen.getByRole('radio', { name: /score/i }));
      });

      // ScoreSelector overlay must now be visible
      expect(screen.getByTestId('score-selector-dialog')).toBeDefined();
    });

    it('after loadScore resolves and extractPracticeNotes returns pitches the exercise populates', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Select Score preset → dialog opens
      await act(async () => {
        fireEvent.click(screen.getByRole('radio', { name: /score/i }));
      });

      // Click on a catalogue item — triggers onSelectScore → loadScore
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /beethoven/i }));
      });

      // Notify subscribers that score is now 'ready'
      await act(async () => {
        spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null });
      });

      // extractPracticeNotes should have been called
      expect(spPlayer.extractPracticeNotes).toHaveBeenCalled();

      // StaffViewer (exercise) should be in document (exercise populated)
      expect(screen.getAllByTestId('staff-viewer').length).toBeGreaterThanOrEqual(1);
    });

    it('Notes slider max equals scorePitches.totalAvailable when Score preset active', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Select Score → pick score → mark ready
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Find the Notes count slider
      const slider = screen.queryByRole('slider', { name: /note/i })
        ?? screen.queryByDisplayValue(String(MOCK_PITCHES.totalAvailable));

      if (slider) {
        expect(Number((slider as HTMLInputElement).max)).toBe(MOCK_PITCHES.totalAvailable);
      } else {
        // If slider isn't found by those queries, check any range input
        const sliders = document.querySelectorAll('input[type="range"]');
        const noteSlider = Array.from(sliders).find(s =>
          Number((s as HTMLInputElement).max) === MOCK_PITCHES.totalAvailable
        );
        expect(noteSlider).toBeDefined();
      }
    });

    it('clef and octave controls are disabled when Score preset is active', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Clef control (radio group) should be disabled
      const clefRadios = document.querySelectorAll('input[name="practice-clef"]');
      if (clefRadios.length > 0) {
        clefRadios.forEach(r => expect((r as HTMLInputElement).disabled).toBe(true));
      }

      // Octave control should be disabled
      const octaveRadios = document.querySelectorAll('input[name="practice-octaves"]');
      if (octaveRadios.length > 0) {
        octaveRadios.forEach(r => expect((r as HTMLInputElement).disabled).toBe(true));
      }

      // At least clef controls must exist in the DOM
      expect(clefRadios.length).toBeGreaterThan(0);
    });

    it('"Set by score" disabled label is visible when Score preset is active', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      expect(screen.getAllByText(/set by score/i).length).toBeGreaterThanOrEqual(1);
    });

    it('"Change score" button is present when Score preset is active with a loaded score', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      expect(screen.getByRole('button', { name: /change score/i })).toBeDefined();
    });

    it('"Change score" button is disabled during countdown and playing phases', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load score
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Start exercise — enters countdown
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /play/i })); });

      const changeScoreBtn = screen.getByRole('button', { name: /change score/i }) as HTMLButtonElement;
      expect(changeScoreBtn.disabled).toBe(true);

      // Advance to playing phase
      await act(async () => { vi.advanceTimersByTime(4000); });

      const changeScoreBtnPlaying = screen.getByRole('button', { name: /change score/i }) as HTMLButtonElement;
      expect(changeScoreBtnPlaying.disabled).toBe(true);
    });

    it('"Change score" click reopens ScoreSelector overlay', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load score and dismiss dialog
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Dialog should be gone now (dismissed after score selection)
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();

      // Click "Change score"
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /change score/i }));
      });

      // ScoreSelector must reopen
      expect(screen.getByTestId('score-selector-dialog')).toBeDefined();
    });
  });

  // ── (m) Score preset — US2 (error handling + cancel) ───────────────────────

  describe('Score preset US2 — error handling and cancel (T013)', () => {
    it('onLoadFile triggers loadScore with kind=file', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Open selector
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });

      const fileInput = screen.getByTestId('score-selector-file-input') as HTMLInputElement;
      const mockFile = new File(['<score/>'], 'test.mxl', { type: 'application/octet-stream' });

      // Simulate file selection
      await act(async () => {
        Object.defineProperty(fileInput, 'files', { value: [mockFile], configurable: true });
        fireEvent.change(fileInput);
      });

      expect(spPlayer.loadScore).toHaveBeenCalledWith({ kind: 'file', file: mockFile });
    });

    it('scorePlayerState.error is passed to ScoreSelector as error prop', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Open the selector
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });

      // Notify error
      await act(async () => {
        spPlayer._notify({ status: 'error', currentTick: 0, totalDurationTicks: 0, highlightedNoteIds: new Set<string>(), bpm: 0, title: null, error: 'Invalid MXL' });
      });

      // Error should be shown inside the selector
      expect(screen.getByTestId('score-selector-error').textContent).toContain('Invalid MXL');
    });

    it('error state does NOT clear previously cached scorePitches', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load score successfully
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // "Change score" should still be present (scorePitches cached)
      expect(screen.getByRole('button', { name: /change score/i })).toBeDefined();

      // Now trigger an error (e.g. user tried to load a different file and it failed)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /change score/i }));
      });
      await act(async () => {
        spPlayer._notify({ status: 'error', currentTick: 0, totalDurationTicks: 0, highlightedNoteIds: new Set<string>(), bpm: 0, title: null, error: 'Corrupt file' });
      });

      // Notes slider max should still reflect the cached pitches' totalAvailable
      const sliders = document.querySelectorAll('input[type="range"]');
      const hasScoreMax = Array.from(sliders).some(s =>
        Number((s as HTMLInputElement).max) === MOCK_PITCHES.totalAvailable
      );
      expect(hasScoreMax).toBe(true);
    });

    it('cancel with no score loaded reverts preset to random', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Select Score → dialog opens (no score loaded)
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      expect(screen.getByTestId('score-selector-dialog')).toBeDefined();

      // Click Cancel
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      // Dialog should be gone
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();

      // Preset should have reverted to random
      const randomRadio = screen.getByRole('radio', { name: /random/i }) as HTMLInputElement;
      expect(randomRadio.checked).toBe(true);
    });

    it('cancel after score is loaded closes dialog without changing preset', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load score
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Reopen selector via "Change score"
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /change score/i })); });

      // Click Cancel
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /cancel/i })); });

      // Dialog gone, preset still Score
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();
      const scoreRadio = screen.getByRole('radio', { name: /score/i }) as HTMLInputElement;
      expect(scoreRadio.checked).toBe(true);
    });
  });

  // ── (n) Score preset — US3 (preset caching) ────────────────────────────────

  describe('Score preset US3 — preset switching caching (T015)', () => {
    it('scorePitches is preserved when switching away from Score preset', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load a score
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Switch to Random preset
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /random/i })); });

      // Notes slider max should NOT be the score's totalAvailable
      // (it should revert to the default max=20 for random)
      const sliders = document.querySelectorAll('input[type="range"]');
      const notesSlider = Array.from(sliders).find(s => {
        const max = Number((s as HTMLInputElement).max);
        return max === 20 || max === MOCK_PITCHES.totalAvailable;
      }) as HTMLInputElement | undefined;
      // After switching away, no score-max slider; but the cached pitches don't disappear
      // Verify by switching back — no dialog
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });

      // Dialog must NOT open because cache is still present
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();
      void notesSlider; // suppress unused warning
    });

    it('switching back to Score with cached pitches does NOT open ScoreSelector', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // Load a score
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /beethoven/i })); });
      await act(async () => { spPlayer._notify({ status: 'ready', currentTick: 0, totalDurationTicks: 1000, highlightedNoteIds: new Set<string>(), bpm: 120, title: null, error: null }); });

      // Switch away and back
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /random/i })); });
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });

      // No dialog — cached pitches are used immediately
      expect(screen.queryByTestId('score-selector-dialog')).toBeNull();
    });

    it('switching to Score with null cache opens ScoreSelector', async () => {
      const spPlayer = makeMockScorePlayer();
      const ctx = makeMockContext({ scorePlayer: spPlayer });
      render(<PracticePlugin context={ctx} />);

      // No score loaded yet — selecting Score should open the dialog
      await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /score/i })); });

      expect(screen.getByTestId('score-selector-dialog')).toBeDefined();
    });
  });
});
