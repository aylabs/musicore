/**
 * ScoreViewer component tests.
 *
 * Feature 033: Play Score Plugin removed the legacy full-screen play view from
 * this component. T004/T005/T006/T012 (viewMode, fullscreen, popstate, note-seek)
 * tests were deleted alongside the removed code.
 *
 * Remaining surface tested here:
 *   - Landing screen renders when no score is loaded
 *   - Instruments view renders when a score is loaded
 *   - Back button returns to landing page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreViewer } from './ScoreViewer';
import { FileStateProvider } from '../services/state/FileStateContext';
import { TempoStateProvider } from '../services/state/TempoStateContext';
import type { Score } from '../types/score';

// ─── Module mocks ──────────────────────────────────────────────────────────

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

// ─── Test helpers ──────────────────────────────────────────────────────────

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
              interval_events: [],
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Landing screen ────────────────────────────────────────────────────────

describe('Landing screen', () => {
  it('renders the landing screen when no score is loaded', () => {
    render(
      <TestWrapper>
        <ScoreViewer />
      </TestWrapper>,
    );
    // LandingScreen renders with its root testid
    expect(screen.getByTestId('landing-screen')).toBeInTheDocument();
  });

  it('renders core plugin launch buttons passed via corePlugins', () => {
    render(
      <TestWrapper>
        <ScoreViewer
          corePlugins={[{ id: 'play-score', name: 'Play Score', icon: '🎼' }]}
          onLaunchPlugin={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(screen.getByTestId('plugin-launch-play-score')).toBeInTheDocument();
  });
});

// ─── Instruments view ──────────────────────────────────────────────────────

describe('Instruments view', () => {
  async function renderWithScore() {
    const { loadScoreFromIndexedDB } = await import('../services/storage/local-storage');
    vi.mocked(loadScoreFromIndexedDB).mockResolvedValue(makeScore());

    render(
      <TestWrapper>
        <ScoreViewer scoreId="test-score-id" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(loadScoreFromIndexedDB).toHaveBeenCalledWith('test-score-id');
    });
  }

  it('shows the score header with tempo and time signature', async () => {
    await renderWithScore();
    await waitFor(() => {
      expect(screen.getByText(/120 BPM/i)).toBeInTheDocument();
      expect(screen.getByText(/4\/4/i)).toBeInTheDocument();
    });
  });

  it('shows a Back button to return to the landing page', async () => {
    await renderWithScore();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('Back button click returns to landing page', async () => {
    const user = userEvent.setup();
    await renderWithScore();

    await waitFor(() => screen.getByRole('button', { name: /back/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));

    // After clicking Back, the landing screen should appear
    await waitFor(() => {
      expect(screen.getByTestId('landing-screen')).toBeInTheDocument();
    });
  });
});
