/**
 * Play Score Plugin — Playback Toolbar (T015)
 * Feature 033: Play Score Plugin
 *
 * Renders Back button, score title, Play/Pause toggle, Stop button,
 * elapsed time display, and tempo control placeholder.
 *
 * US1 (T011): Back button and title.
 * US2 (T015): Full playback controls and timer.
 * US7 (T027): Tempo slider completed.
 *
 * Timer formula (mirrors PlaybackScheduler.ticksToSeconds but without host imports):
 *   PPQ = 960 ticks per quarter note
 *   seconds = ticks / ((bpm / 60) * PPQ)
 */

import type { PluginPlaybackStatus } from '../../src/plugin-api/index';

// Mirror of PlaybackScheduler.PPQ — no host imports in plugin code
const PPQ = 960;

function ticksToElapsedSeconds(ticks: number, bpm: number): number {
  if (bpm <= 0 || ticks < 0) return 0;
  return ticks / ((bpm / 60) * PPQ);
}

function formatElapsedTime(seconds: number): string {
  const totalSec = Math.floor(seconds);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface PlaybackToolbarProps {
  /** Show/hide the Back button (hidden on selection screen, shown on player screen) */
  showBack: boolean;
  scoreTitle: string | null;
  status: PluginPlaybackStatus;
  currentTick: number;
  totalDurationTicks: number;
  bpm: number;
  /** Tempo multiplier [0.5–2.0] */
  tempoMultiplier: number;
  onBack: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onTempoChange: (multiplier: number) => void;
}

export function PlaybackToolbar({
  showBack,
  scoreTitle,
  status,
  currentTick,
  bpm,
  onBack,
  onPlay,
  onPause,
  onStop,
  tempoMultiplier,
  onTempoChange,
}: PlaybackToolbarProps) {
  const isPlaying = status === 'playing';
  const isActive = status === 'playing' || status === 'paused' || status === 'ready';
  const elapsedSeconds = ticksToElapsedSeconds(currentTick, bpm);
  const elapsedFormatted = formatElapsedTime(elapsedSeconds);

  return (
    <div className="play-score__toolbar" role="toolbar" aria-label="Playback controls">
      {/* Back button — shown in player view */}
      {showBack && (
        <button
          className="play-score__toolbar-btn play-score__toolbar-btn--back"
          onClick={onBack}
          aria-label="Back"
        >
          ← Back
        </button>
      )}

      {/* Score title */}
      {scoreTitle && (
        <span className="play-score__toolbar-title">{scoreTitle}</span>
      )}

      {/* Play/Pause toggle */}
      {isPlaying ? (
        <button
          className="play-score__toolbar-btn play-score__toolbar-btn--pause"
          onClick={onPause}
          aria-label="Pause"
          disabled={!isActive}
        >
          ⏸ Pause
        </button>
      ) : (
        <button
          className="play-score__toolbar-btn play-score__toolbar-btn--play"
          onClick={onPlay}
          aria-label="Play"
          disabled={status === 'idle' || status === 'loading' || status === 'error'}
        >
          ▶ Play
        </button>
      )}

      {/* Stop button */}
      <button
        className="play-score__toolbar-btn play-score__toolbar-btn--stop"
        onClick={onStop}
        aria-label="Stop"
        disabled={!isActive}
      >
        ⏹ Stop
      </button>

      {/* Elapsed timer */}
      <span className="play-score__toolbar-timer" aria-label="Elapsed time">
        {elapsedFormatted}
      </span>

      {/* Tempo control (T027 — placeholder for now) */}
      <div className="play-score__toolbar-tempo">
        <label htmlFor="play-score-tempo" className="play-score__toolbar-tempo-label">
          {Math.round(tempoMultiplier * 100)}%
        </label>
        <input
          id="play-score-tempo"
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={tempoMultiplier}
          onChange={e => onTempoChange(parseFloat(e.target.value))}
          aria-label="Tempo"
          className="play-score__toolbar-tempo-slider"
          disabled={status === 'loading'}
        />
        <span className="play-score__toolbar-bpm">{bpm > 0 ? `${bpm} BPM` : ''}</span>
      </div>
    </div>
  );
}
