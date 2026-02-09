import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './PlaybackControls';
import { TempoStateProvider } from '../../services/state/TempoStateContext';
import React, { type ReactNode } from 'react';

// Wrapper to provide TempoStateContext for TempoControl component
const wrapper = ({ children }: { children: ReactNode }) => (
  <TempoStateProvider>{children}</TempoStateProvider>
);

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
