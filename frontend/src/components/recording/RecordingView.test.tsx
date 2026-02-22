/**
 * Tests for Recording View feature — User Story 1: Debug Gate
 *
 * TDD: These tests are written BEFORE implementation and must FAIL initially.
 * They cover:
 *   T005 - Record View button absent without ?debug=true
 *   T006 - Record View button visible with ?debug=true
 *   T007 - Clicking Record View button calls onShowRecording
 *   T008 - Back button in RecordingView calls onBack
 *
 * US1 Acceptance Scenarios (from spec.md):
 *   1. No Record View button or debug indicator visible without ?debug=true
 *   2. Record View button visible when ?debug=true
 *   3. Pressing Record View navigates to Recording View
 *   4. Back button returns to Instruments View
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreViewer } from '../../components/ScoreViewer';
import { RecordingView } from '../../components/recording/RecordingView';
import { FileStateProvider } from '../../services/state/FileStateContext';
import { TempoStateProvider } from '../../services/state/TempoStateContext';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../services/wasm/loader', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/wasm/music-engine', () => ({
  parseScore: vi.fn(),
  addInstrument: vi.fn(),
  getScore: vi.fn(),
}));

vi.mock('../../services/storage/local-storage', () => ({
  loadScoreFromIndexedDB: vi.fn().mockResolvedValue(null),
  saveScoreToIndexedDB: vi.fn(),
}));

vi.mock('../../services/score-api', () => ({
  apiClient: {
    getScore: vi.fn(),
    createScore: vi.fn(),
    addInstrument: vi.fn(),
  },
}));

vi.mock('../../services/import/MusicXMLImportService', () => ({
  MusicXMLImportService: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RenderScoreViewerOptions {
  debugMode?: boolean;
  onShowRecording?: () => void;
}

function renderScoreViewer(opts: RenderScoreViewerOptions = {}) {
  return render(
    <TempoStateProvider>
      <FileStateProvider>
        <ScoreViewer
          debugMode={opts.debugMode ?? false}
          onShowRecording={opts.onShowRecording ?? vi.fn()}
        />
      </FileStateProvider>
    </TempoStateProvider>
  );
}

// ─── User Story 1: Debug Gate ─────────────────────────────────────────────────

describe('US1 — Debug Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * T005 — Record View button is absent from ScoreViewer without ?debug=true
   * FR-001: The button MUST be completely absent from the DOM in production mode
   */
  it('T005 — hides Record View button when debugMode is false', () => {
    renderScoreViewer({ debugMode: false });
    expect(screen.queryByRole('button', { name: /record view/i })).toBeNull();
  });

  /**
   * T006 — Record View button is visible in ScoreViewer when debugMode=true
   * FR-001: The button MUST appear only when ?debug=true is present
   */
  it('T006 — shows Record View button when debugMode is true', () => {
    renderScoreViewer({ debugMode: true });
    expect(screen.getByRole('button', { name: /record view/i })).toBeInTheDocument();
  });

  /**
   * T007 — Pressing Record View button calls onShowRecording
   * FR-001: Button presses trigger navigation (state lift) to RecordingView
   */
  it('T007 — calls onShowRecording when Record View button is clicked', async () => {
    const user = userEvent.setup();
    const onShowRecording = vi.fn();
    renderScoreViewer({ debugMode: true, onShowRecording });
    await user.click(screen.getByRole('button', { name: /record view/i }));
    expect(onShowRecording).toHaveBeenCalledOnce();
  });

  /**
   * T008 — Back button in RecordingView calls onBack
   * US1 Scenario 4: navigating back returns to Instruments View
   */
  it('T008 — calls onBack when the ← Instruments button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<RecordingView onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: /instruments/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ─── T015: US2 Start/Stop integration ─────────────────────────────────────────

/**
 * T015 — RecordingView Start/Stop button toggle + recording-active indicator
 * US2 Acceptance Scenario: pressing Start Recording begins capture; button
 * becomes Stop Recording; pressing again stops capture and resets button.
 *
 * Depends on useAudioRecorder (T016) — fails until implementation exists.
 */
describe('RecordingView — Start/Stop toggle (T015)', () => {
  beforeEach(() => {
    // Stub getUserMedia so start() can proceed
    const track = { stop: vi.fn(), onended: null };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    };
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      writable: true,
      configurable: true,
    });
  });

  it('T015a — initial button label is "Start Recording"', () => {
    render(<RecordingView onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('T015b — after start(), button label changes to "Stop Recording"', async () => {
    const user = userEvent.setup();
    render(<RecordingView onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(await screen.findByRole('button', { name: /stop recording/i })).toBeInTheDocument();
  });

  it('T015c — recording-active indicator is visible while recording', async () => {
    const user = userEvent.setup();
    render(<RecordingView onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    // The recording-active element should be present (status dot or similar)
    expect(await screen.findByTestId('recording-active')).toBeInTheDocument();
  });

  it('T015d — after stop(), button label reverts to "Start Recording"', async () => {
    const user = userEvent.setup();
    render(<RecordingView onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    await screen.findByRole('button', { name: /stop recording/i });
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });
});

// ─── T022: US4 current-note display ───────────────────────────────────────────

/**
 * T022 — RecordingView current-note display
 * US4: Shows "—" when no pitch, shows note label when pitch detected.
 *
 * Depends on pitchDetection.ts (T023) and hook wiring (T024).
 */
describe('RecordingView — current pitch display (T022)', () => {
  it('T022a — shows "—" when no pitch is detected (idle state)', () => {
    render(<RecordingView onBack={vi.fn()} />);
    // The pitch display placeholder should be visible
    expect(screen.getByTestId('current-pitch-display')).toHaveTextContent('—');
  });
});
