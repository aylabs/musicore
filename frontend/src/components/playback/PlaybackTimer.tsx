/**
 * PlaybackTimer Component - Elapsed/Total time display
 *
 * Feature 022 - Display Improvements: User Story 1 (Playback Timer)
 *
 * Displays the current playback position and total duration in MM:SS format.
 * Renders as "elapsed / total" (e.g., "1:23 / 4:05").
 */

import { formatPlaybackTime } from '../../utils/timeFormatting';
import './PlaybackTimer.css';

export interface PlaybackTimerProps {
  /** Current elapsed time in seconds */
  elapsedSeconds: number;
  /** Total score duration in seconds */
  totalSeconds: number;
}

export function PlaybackTimer({ elapsedSeconds, totalSeconds }: PlaybackTimerProps) {
  return (
    <span className="playback-timer" aria-label="Playback time">
      <span className="playback-timer-elapsed">{formatPlaybackTime(elapsedSeconds)}</span>
      <span className="playback-timer-separator"> / </span>
      <span className="playback-timer-total">{formatPlaybackTime(totalSeconds)}</span>
    </span>
  );
}
