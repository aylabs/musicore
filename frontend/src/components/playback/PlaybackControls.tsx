import React from 'react';
import type { PlaybackStatus } from '../../types/playback';
import './PlaybackControls.css';

/**
 * PlaybackControls component props
 */
export interface PlaybackControlsProps {
  /** Current playback status */
  status: PlaybackStatus;
  /** Whether the score has notes to play */
  hasNotes?: boolean;
  /** Handler for Play button click */
  onPlay: () => void;
  /** Handler for Pause button click */
  onPause: () => void;
  /** Handler for Stop button click */
  onStop: () => void;
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
  onPlay,
  onPause,
  onStop,
}) => {
  // US1 T027: Disable Play button if no notes
  const canPlay = status !== 'playing' && hasNotes;
  const canPause = status === 'playing';
  const canStop = status !== 'stopped';

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
    <div className="playback-controls">
      {/* US1 T026: Visual playback state indicator */}
      <div className={`playback-status ${statusClass[status]}`}>
        <span className="status-indicator"></span>
        <span className="status-label">{statusLabel[status]}</span>
      </div>

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
      </div>

      {/* US1 T027: Show message when no notes available */}
      {!hasNotes && (
        <div className="no-notes-message">
          No notes to play
        </div>
      )}
    </div>
  );
};
