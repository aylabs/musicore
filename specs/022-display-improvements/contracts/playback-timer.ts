/**
 * Contract: Playback Timer
 *
 * Defines the interfaces for the playback timer feature.
 * These types extend existing interfaces and define new components.
 *
 * Feature: 022-display-improvements
 */

// ─── Extended PlaybackState (from MusicTimeline.ts) ──────────────────────────

/**
 * Extended PlaybackState with total duration for timer display.
 * Added field: totalDurationTicks
 */
export interface PlaybackState {
  status: PlaybackStatus;
  currentTick: number;
  totalDurationTicks: number; // NEW — total score duration in ticks
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekToTick: (tick: number) => void;
  unpinStartTick: () => void;
}

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

// ─── Time Formatting Utility (new: timeFormatting.ts) ────────────────────────

/**
 * Formats a duration in seconds to a human-readable time string.
 *
 * @param seconds - Non-negative number of seconds
 * @returns Formatted string:
 *   - "M:SS" for durations < 10 minutes (e.g., "0:00", "3:45", "9:59")
 *   - "MM:SS" for durations 10-59 minutes (e.g., "12:30", "59:59")
 *   - "H:MM:SS" for durations >= 1 hour (e.g., "1:05:30", "12:00:00")
 *
 * @example
 * formatPlaybackTime(0)      // "0:00"
 * formatPlaybackTime(65)     // "1:05"
 * formatPlaybackTime(3725)   // "1:02:05"
 */
export function formatPlaybackTime(seconds: number): string;

// ─── PlaybackTimer Component Props ───────────────────────────────────────────

/**
 * Props for the PlaybackTimer component.
 * All time values are in seconds (pre-converted from ticks).
 */
export interface PlaybackTimerProps {
  /** Current elapsed time in seconds */
  elapsedSeconds: number;
  /** Total score duration in seconds */
  totalSeconds: number;
}

// ─── PlaybackControls Extended Props ─────────────────────────────────────────

/**
 * Extended PlaybackControls props to include timer data.
 * Added fields: currentTick, totalDurationTicks, tempo, tempoMultiplier
 */
export interface PlaybackControlsProps {
  status: PlaybackStatus;
  hasNotes: boolean;
  error: string | null;
  onPlay: () => Promise<void>;
  onPause: () => void;
  onStop: () => void;
  compact?: boolean;
  rightActions?: React.ReactNode;
  // NEW — timer data
  currentTick: number;
  totalDurationTicks: number;
  tempo: number;
  tempoMultiplier: number;
}

// ─── WasmImportResult Extended (from music-engine.ts) ────────────────────────

/**
 * Extended WasmImportResult to include metadata.
 * Added field: metadata
 */
export interface WasmImportResult {
  score: Score;
  statistics: ImportStatistics;
  warnings: ImportWarning[];
  partial_import: boolean;
  metadata: ImportMetadata; // NEW — includes work_title, composer
}

export interface ImportMetadata {
  format: string;
  file_name?: string;
  work_title?: string;
  composer?: string;
}

// ─── LayoutView Extended Props ───────────────────────────────────────────────

/**
 * Extended LayoutView props to pass playback status for TempoControl disabling.
 * Added field: playbackStatus
 */
export interface LayoutViewProps {
  score: Score;
  highlightedNoteIds?: Set<string>;
  onTogglePlayback?: () => void;
  onNoteClick?: (noteId: string) => void;
  selectedNoteId?: string;
  playbackStatus?: PlaybackStatus; // NEW — for TempoControl disabled state
}

// Type references (not redefined here)
type Score = import('../../frontend/src/types/score').Score;
type ImportStatistics = import('../../frontend/src/services/import/MusicXMLImportService').ImportStatistics;
type ImportWarning = import('../../frontend/src/services/import/MusicXMLImportService').ImportWarning;
