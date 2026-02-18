import React from 'react';
import type { PlaybackStatus } from '../../types/playback';
import TempoControl from './TempoControl';
import { PlaybackTimer } from './PlaybackTimer';
import { ticksToSeconds } from '../../services/playback/PlaybackScheduler';
import './PlaybackControls.css';

/**
 * PlaybackControls component props
 */
export interface PlaybackControlsProps {
  /** Current playback status */
  status: PlaybackStatus;
  /** Whether the score has notes to play */
  hasNotes?: boolean;
  /** Error message for autoplay policy or audio initialization failures (US3 T052) */
  error?: string | null;
  /** Handler for Play button click */
  onPlay: () => void;
  /** Handler for Pause button click */
  onPause: () => void;
  /** Handler for Stop button click */
  onStop: () => void;
  /** Compact mode - hides status indicator and tempo control (Feature 010) */
  compact?: boolean;
  /** Additional actions to render on the right side in compact mode (Feature 010) */
  rightActions?: React.ReactNode;
  /** Feature 022: Current playback position in ticks */
  currentTick?: number;
  /** Feature 022: Total score duration in ticks */
  totalDurationTicks?: number;
  /** Feature 022: Base tempo in BPM */
  tempo?: number;
  /** Feature 022: Tempo multiplier from TempoControl */
  tempoMultiplier?: number;
  /** Feature 026 (US3): Handler for Return to Start button — scrolls view to measure 1 */
  onReturnToStart?: () => void;
  /** Feature 027 (US1): Return to Instruments view — back navigation from full-screen Play view */
  onReturnToView?: () => void;
  /** Feature 027 (US3): Score title shown left of playback buttons in compact mode */
  title?: string;
}

/**
 * PlaybackControls - UI component for playback control buttons
 * 
 * Feature 003 - Music Playback: User Story 1
 * Provides Play/Pause/Stop buttons with appropriate disabled states
 * based on current playback status. Displays visual status indicator.
 * 
 * Button States:
 * - stopped: Play enabled, Pause disabled, Stop disabled
 * - playing: Play disabled, Pause enabled, Stop enabled
 * - paused: Play enabled, Pause disabled, Stop enabled
 * 
 * US1 T024: Basic component with buttons and disabled states
 * US1 T026: Visual playback state indicator
 * US1 T027: Handle empty score (no notes)
 * 
 * @example
 * ```typescript
 * <PlaybackControls
 *   status={playbackState.status}
 *   hasNotes={notes.length > 0}
 *   onPlay={playbackState.play}
 *   onPause={playbackState.pause}
 *   onStop={playbackState.stop}
 * />
 * ```
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  status,
  hasNotes = true,
  error = null, // US3 T052: Accept error message prop
  onPlay,
  onPause,
  onStop,
  compact = false, // Feature 010: Compact mode for stacked view
  rightActions = null, // Feature 010: Additional actions for right side
  onReturnToStart, // Feature 026 (US3): Return to Start handler
  onReturnToView, // Feature 027 (US1): Return to Instruments from full-screen
  title, // Feature 027 (US3): Score title in compact strip
  currentTick = 0, // Feature 022: Playback timer
  totalDurationTicks = 0,
  tempo = 120,
  tempoMultiplier = 1.0,
}) => {
  // US1 T027: Disable Play button if no notes
  const canPlay = status !== 'playing' && hasNotes;
  const canPause = status === 'playing';
  const canStop = status !== 'stopped';

  // Feature 022: Compute elapsed and total seconds for timer display
  const effectiveTempo = tempo * tempoMultiplier;
  const elapsedSeconds = ticksToSeconds(currentTick, effectiveTempo);
  const totalSeconds = ticksToSeconds(totalDurationTicks, effectiveTempo);

  /**
   * Map status to human-readable label for visual indicator
   */
  const statusLabel: Record<PlaybackStatus, string> = {
    stopped: 'Stopped',
    playing: 'Playing',
    paused: 'Paused',
  };

  /**
   * Map status to CSS class for styling
   */
  const statusClass: Record<PlaybackStatus, string> = {
    stopped: 'status-stopped',
    playing: 'status-playing',
    paused: 'status-paused',
  };

  return (
    <div className={`playback-controls ${compact ? 'compact' : ''}`}>
      {/* Feature 027 (US1 T009): Return-to-Instruments arrow — only in compact/play mode */}
      {compact && onReturnToView && (
        <button
          className="playback-button return-to-view-button"
          onClick={onReturnToView}
          aria-label="Return to instruments view"
          title="Back to Instruments"
        >
          ←
        </button>
      )}

      {/* Feature 027 (US3 T023): Score title truncated, left of buttons in compact mode */}
      {compact && title && (
        <span className="playback-title" title={title}>{title}</span>
      )}

      {/* US1 T026: Visual playback state indicator (hidden in compact mode) */}
      {!compact && (
        <div className={`playback-status ${statusClass[status]}`}>
          <span className="status-indicator"></span>
          <span className="status-label">{statusLabel[status]}</span>
        </div>
      )}

      {/* US1 T024: Control buttons with disabled states */}
      <div className="playback-buttons">
        <button
          className="playback-button play-button"
          onClick={onPlay}
          disabled={!canPlay}
          aria-label="Play"
          title={!hasNotes ? 'No notes to play' : 'Play'}
        >
          ▶ Play
        </button>

        <button
          className="playback-button pause-button"
          onClick={onPause}
          disabled={!canPause}
          aria-label="Pause"
          title="Pause"
        >
          ⏸ Pause
        </button>

        <button
          className="playback-button stop-button"
          onClick={onStop}
          disabled={!canStop}
          aria-label="Stop"
          title="Stop"
        >
          ⏹ Stop
        </button>

        {/* Feature 026 (US3): Return to Start — scroll view to measure 1 */}
        {onReturnToStart && (
          <button
            className="playback-button return-to-start-button"
            onClick={onReturnToStart}
            disabled={status === 'playing'}
            title="Return to Start"
            aria-label="Return to Start"
          >
            ⏮
          </button>
        )}
      </div>

      {/* Feature 022: Playback timer display (visible in all modes) */}
      {hasNotes && totalDurationTicks > 0 && (
        <PlaybackTimer elapsedSeconds={elapsedSeconds} totalSeconds={totalSeconds} />
      )}

      {/* Feature 010: Right actions slot for compact mode */}
      {compact && rightActions && (
        <div className="playback-right-actions">
          {rightActions}
        </div>
      )}

      {/* Feature 008 - Tempo Change: T014 Inline tempo display with controls */}
      {/* Feature 027 (T025): Show TempoControl in compact mode too (moved from LayoutView info bar) */}
      {/* Disable tempo changes during playback to avoid reschedule delays */}
      <TempoControl disabled={status === 'playing'} />

      {/* US1 T027: Show message when no notes available */}
      {!hasNotes && (
        <div className="no-notes-message">
          No notes to play
        </div>
      )}

      {/* US3 T052: Show autoplay policy error message */}
      {error && (
        <div className="playback-error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
