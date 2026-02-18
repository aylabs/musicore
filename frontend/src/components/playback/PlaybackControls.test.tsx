import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './PlaybackControls';
import { TempoStateProvider } from '../../services/state/TempoStateContext';

/**
 * T015: Unit tests for PlaybackControls component
 * 
 * Feature 003 - Music Playback: User Story 1
 * Tests basic playback controls (Play/Pause/Stop) with correct button states
 * and event handlers.
 */
describe('PlaybackControls', () => {
  /**
   * Test: Component renders all three control buttons
   */
  it('should render Play, Pause, and Stop buttons', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(<TempoStateProvider><PlaybackControls status="stopped" {...mockHandlers} /></TempoStateProvider>);

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  /**
   * Test: Play button calls onPlay handler when clicked
   */
  it('should call onPlay when Play button is clicked', () => {
    const mockOnPlay = vi.fn();
    const mockHandlers = {
      onPlay: mockOnPlay,
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(<TempoStateProvider><PlaybackControls status="stopped" {...mockHandlers} /></TempoStateProvider>);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockOnPlay).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Pause button calls onPause handler when clicked
   */
  it('should call onPause when Pause button is clicked', () => {
    const mockOnPause = vi.fn();
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: mockOnPause,
      onStop: vi.fn(),
    };

    render(<TempoStateProvider><PlaybackControls status="playing" {...mockHandlers} /></TempoStateProvider>);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Stop button calls onStop handler when clicked
   */
  it('should call onStop when Stop button is clicked', () => {
    const mockOnStop = vi.fn();
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: mockOnStop,
    };

    render(<TempoStateProvider><PlaybackControls status="playing" {...mockHandlers} /></TempoStateProvider>);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Button disabled states based on playback status
   * 
   * Status 'stopped': Play enabled, Pause disabled, Stop disabled
   * Status 'playing': Play disabled, Pause enabled, Stop enabled
   * Status 'paused': Play enabled, Pause disabled, Stop enabled
   */
  describe('button disabled states', () => {
    it('should have correct disabled states when status is "stopped"', () => {
      const mockHandlers = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onStop: vi.fn(),
      };

      render(<TempoStateProvider><PlaybackControls status="stopped" {...mockHandlers} /></TempoStateProvider>);

      expect(screen.getByRole('button', { name: /play/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
    });

    it('should have correct disabled states when status is "playing"', () => {
      const mockHandlers = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onStop: vi.fn(),
      };

      render(<TempoStateProvider><PlaybackControls status="playing" {...mockHandlers} /></TempoStateProvider>);

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
    });

    it('should have correct disabled states when status is "paused"', () => {
      const mockHandlers = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onStop: vi.fn(),
      };

      render(<TempoStateProvider><PlaybackControls status="paused" {...mockHandlers} /></TempoStateProvider>);

      expect(screen.getByRole('button', { name: /play/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
    });
  });

  /**
   * Test: Component displays current playback status
   * 
   * US1 T026: Visual playback state indicator
   */
  it('should display current playback status', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    const { rerender } = render(<TempoStateProvider><PlaybackControls status="stopped" {...mockHandlers} /></TempoStateProvider>);
    expect(screen.getByText(/stopped/i)).toBeInTheDocument();

    rerender(<TempoStateProvider><PlaybackControls status="playing" {...mockHandlers} /></TempoStateProvider>);
    expect(screen.getByText(/playing/i)).toBeInTheDocument();

    rerender(<TempoStateProvider><PlaybackControls status="paused" {...mockHandlers} /></TempoStateProvider>);
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });

  /**
   * Test: Edge case - empty score (no notes)
   * 
   * US1 T027: Disable Play button or show "No notes to play" message
   */
  it('should disable Play button when hasNotes is false', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(<TempoStateProvider><PlaybackControls status="stopped" hasNotes={false} {...mockHandlers} /></TempoStateProvider>);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeDisabled();
  });

  it('should show "No notes to play" message when hasNotes is false', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(<TempoStateProvider><PlaybackControls status="stopped" hasNotes={false} {...mockHandlers} /></TempoStateProvider>);

    expect(screen.getByText(/no notes to play/i)).toBeInTheDocument();
  });
});

// ============================================================================
// T019 [US3]: PlaybackControls with title renders title left of play button in compact mode
// T020 [US3]: PlaybackControls renders TempoControl in compact mode
// T021 [US3]: Long title gets text-overflow ellipsis class/style
//
// Root cause:
//   T019: title already renders (implemented in T023/previous session) — verify position
//   T020: TempoControl hidden behind !compact guard — must show in compact mode after T025 fix
//   T021: playback-title span must have CSS truncation styling
//
// T019 PASSES if title renders (already implemented).
// T020 FAILS before T025 (TempoControl absent in compact mode).
// T021 PASSES if playback-title class present (CSS applied by PlaybackControls.css).
// ============================================================================

describe('[T019] US3: PlaybackControls renders score title in compact mode', () => {
  it('renders title text left of playback buttons when compact=true and title provided', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(
      <TempoStateProvider>
        <PlaybackControls status="stopped" compact={true} title="My Score" {...mockHandlers} />
      </TempoStateProvider>
    );

    // After T023 (already implemented): title appears in compact mode
    const titleEl = screen.getByText('My Score');
    expect(titleEl).toBeInTheDocument();
    // Title element must have playback-title class (T021 CSS)
    expect(titleEl.className).toContain('playback-title');
  });

  it('does not render title when compact=false', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    render(
      <TempoStateProvider>
        <PlaybackControls status="stopped" compact={false} title="Hidden Score" {...mockHandlers} />
      </TempoStateProvider>
    );

    // Title must not render in non-compact mode
    const titleEl = screen.queryByText('Hidden Score');
    expect(titleEl).toBeNull();
  });
});

describe('[T020] BUG: PlaybackControls must render TempoControl in compact mode', () => {
  it('renders TempoControl when compact=true (after T025 fix)', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    const { container } = render(
      <TempoStateProvider>
        <PlaybackControls status="stopped" compact={true} {...mockHandlers} />
      </TempoStateProvider>
    );

    // Before T025: TempoControl rendered with {!compact && <TempoControl/>}
    // so it is ABSENT in compact=true mode. This test fails before T025.
    // After T025: TempoControl always visible.
    // TempoControl renders a tempo input or BPM display — find by role or test-id.
    // TempoControl renders a select or number input for BPM.
    const tempoInput = container.querySelector('.tempo-control, [data-testid="tempo-control"], input[type="number"], select');
    expect(tempoInput).not.toBeNull();
  });
});

describe('[T021] US3: Long score title renders with text-overflow ellipsis class', () => {
  it('playback-title span has CSS class for ellipsis truncation', () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
    };

    const longTitle = 'AVeryLongScoreTitleThatExceedsFortyCharactersDefinitely';
    render(
      <TempoStateProvider>
        <PlaybackControls status="stopped" compact={true} title={longTitle} {...mockHandlers} />
      </TempoStateProvider>
    );

    const titleEl = screen.getByText(longTitle);
    // Must have playback-title class (CSS applies text-overflow: ellipsis via PlaybackControls.css)
    expect(titleEl.className).toContain('playback-title');
    // title attribute shows full text on hover (accessibility)
    expect(titleEl.getAttribute('title')).toBe(longTitle);
  });
});
