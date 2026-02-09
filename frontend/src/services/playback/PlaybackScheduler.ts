import { ToneAdapter } from './ToneAdapter';
import type { Note } from '../../types/score';

/**
 * PPQ - Pulses Per Quarter Note
 * 
 * Feature 003 - Music Playback: US2 T039
 * 
 * Musicore uses 960 ticks per quarter note (PPQ) for high timing precision.
 * This allows accurate representation of tuplets, dotted notes, and complex rhythms.
 * 
 * Examples at 120 BPM (one beat = 0.5 seconds):
 * - Quarter note: 960 ticks = 0.5s
 * - Half note: 1920 ticks = 1.0s
 * - Eighth note: 480 ticks = 0.25s
 * - Sixteenth note: 240 ticks = 0.125s
 */
export const PPQ = 960;

/**
 * Minimum note duration in seconds
 * 
 * US2 T040: Ensures extremely short notes still produce audible sound.
 * Notes shorter than this threshold are extended to MIN_NOTE_DURATION.
 */
export const MIN_NOTE_DURATION = 0.05; // 50 milliseconds

/**
 * Default tempo in BPM
 * 
 * US2 T042: Fallback tempo when score tempo is invalid or undefined.
 */
export const DEFAULT_TEMPO = 120;

/**
 * Convert musical time (ticks) to real time (seconds)
 * 
 * Feature 003 - Music Playback: US2 T033
 * 
 * Formula: seconds = ticks / (tempo/60 * PPQ)
 * 
 * Derivation:
 * - tempo (BPM) = beats per minute
 * - beats per second = tempo / 60
 * - ticks per second = (tempo / 60) * PPQ
 * - seconds per tick = 1 / (tempo/60 * PPQ)
 * - seconds = ticks * seconds_per_tick
 * 
 * @param ticks - Musical time in ticks (0-based)
 * @param tempo - Tempo in beats per minute (BPM)
 * @returns Time in seconds
 * 
 * @example
 * ```typescript
 * // Quarter note at 120 BPM
 * ticksToSeconds(960, 120); // 0.5 seconds
 * 
 * // Half note at 60 BPM
 * ticksToSeconds(1920, 60); // 2.0 seconds
 * ```
 */
export function ticksToSeconds(ticks: number, tempo: number): number {
  // US2 T042: Apply tempo fallback for invalid values
  const validTempo = tempo > 0 && tempo <= 400 ? tempo : DEFAULT_TEMPO;
  
  // Convert ticks to seconds using PPQ constant
  const beatsPerSecond = validTempo / 60;
  const ticksPerSecond = beatsPerSecond * PPQ;
  const seconds = ticks / ticksPerSecond;
  
  return seconds;
}

/**
 * Convert real time (seconds) to musical time (ticks)
 * 
 * Feature 003 - Music Playback: Pause/Resume
 * 
 * Formula: ticks = seconds * (tempo/60 * PPQ)
 * 
 * @param seconds - Time in seconds
 * @param tempo - Tempo in beats per minute (BPM)
 * @returns Musical time in ticks
 * 
 * @example
 * ```typescript
 * // 0.5 seconds at 120 BPM = quarter note
 * secondsToTicks(0.5, 120); // 960 ticks
 * ```
 */
export function secondsToTicks(seconds: number, tempo: number): number {
  // Apply tempo fallback for invalid values
  const validTempo = tempo > 0 && tempo <= 400 ? tempo : DEFAULT_TEMPO;
  
  // Convert seconds to ticks using PPQ constant
  const beatsPerSecond = validTempo / 60;
  const ticksPerSecond = beatsPerSecond * PPQ;
  const ticks = seconds * ticksPerSecond;
  
  return Math.round(ticks); // Round to nearest tick
}

/**
 * PlaybackScheduler - Manages note scheduling and timing
 * 
 * Feature 003 - Music Playback: US2 T032
 * 
 * Coordinates with ToneAdapter to schedule notes at precise times.
 * Handles tick-to-time conversion, duration calculation, and playback offset.
 * 
 * Performance: Synchronous scheduling is fast enough even for large scores
 * (4000+ notes schedule in < 20ms).
 * 
 * @example
 * ```typescript
 * const adapter = ToneAdapter.getInstance();
 * const scheduler = new PlaybackScheduler(adapter);
 * 
 * // Schedule notes from beginning
 * await scheduler.scheduleNotes(notes, 120, 0);
 * 
 * // Resume from tick 960 (0.5s into score at 120 BPM)
 * await scheduler.scheduleNotes(notes, 120, 960);
 * 
 * // Clear all scheduled notes
 * scheduler.clearSchedule();
 * ```
 */
export class PlaybackScheduler {
  private toneAdapter: ToneAdapter;

  /**
   * Create a new PlaybackScheduler
   * 
   * @param toneAdapter - ToneAdapter instance for audio playback
   */
  constructor(toneAdapter: ToneAdapter) {
    this.toneAdapter = toneAdapter;
  }

  /**
   * Schedule notes for playback with accurate timing
   * 
   * Feature 003 - Music Playback: US2 T035
   * Feature 008 - Tempo Change: T013 Added tempo multiplier support
   * 
   * Converts each note's tick-based timing to real-time seconds and schedules
   * playback through ToneAdapter. Handles currentTick offset for pause/resume.
   * 
   * Performance: Synchronous scheduling is fast (< 20ms for 4000 notes) and
   * provides instant playback start without complex background scheduling.
   * 
   * @param notes - Array of notes to schedule
   * @param tempo - Tempo in beats per minute (BPM)
   * @param currentTick - Current playback position in ticks (for resume from pause)
   * @param tempoMultiplier - Tempo multiplier (0.5 to 2.0, default 1.0)
   *                          2.0 = twice as fast, 0.5 = half as fast
   * 
   * Edge cases handled:
   * - US2 T040: Notes with duration < 50ms extended to MIN_NOTE_DURATION
   * - US2 T041: Simultaneous notes (same start_tick) all schedule at same time
   * - US2 T042: Invalid tempo defaults to 120 BPM
   * - T013: Tempo multiplier scales timing (default 1.0 for backward compatibility)
   * 
   * @returns Promise that resolves when all notes are scheduled
   */
  public async scheduleNotes(
    notes: Note[],
    tempo: number,
    currentTick: number,
    tempoMultiplier: number = 1.0
  ): Promise<void> {
    // US2 T042: Apply tempo fallback
    const validTempo = tempo > 0 && tempo <= 400 ? tempo : DEFAULT_TEMPO;

    // Use Transport-relative timing (Transport starts at 0 when startTransport() is called)
    // No need to get audio context time - Transport.schedule() uses Transport time
    
    // Simple synchronous scheduling - fast enough even for 4000+ notes (< 20ms)
    for (const note of notes) {
      // Skip notes that are already past
      if (note.start_tick < currentTick) {
        continue;
      }
      
      // Calculate start time relative to currentTick
      const ticksFromCurrent = note.start_tick - currentTick;
      let startTimeSeconds = ticksToSeconds(ticksFromCurrent, validTempo);
      
      // Apply tempo multiplier if changed
      if (tempoMultiplier !== 1.0) {
        startTimeSeconds = startTimeSeconds / tempoMultiplier;
      }
      
      // Use Transport-relative time (no need to add getCurrentTime())
      const transportTime = startTimeSeconds;
      
      // Calculate note duration
      let durationSeconds = ticksToSeconds(note.duration_ticks, validTempo);
      
      // Apply tempo multiplier to duration
      if (tempoMultiplier !== 1.0) {
        durationSeconds = durationSeconds / tempoMultiplier;
      }
      
      // Enforce minimum duration for very short notes
      if (durationSeconds < MIN_NOTE_DURATION) {
        durationSeconds = MIN_NOTE_DURATION;
      }
      
      // Schedule note playback with Transport-relative time
      this.toneAdapter.playNote(note.pitch, durationSeconds, transportTime);
    }
  }

  /**
   * Clear all scheduled notes and stop playback
   * 
   * Feature 003 - Music Playback: US2 T036
   * 
   * Stops all currently playing notes and cancels any scheduled future notes.
   * Used when pausing or stopping playback.
   */
  public clearSchedule(): void {
    // US2 T036: Stop all audio and clear transport schedule
    this.toneAdapter.stopAll();
  }
}
