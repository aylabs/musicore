/**
 * Playback Types
 * 
 * Type definitions for music playback state and scheduling.
 * Feature: 003-music-playback
 */

/**
 * Playback status indicating the current state of audio playback
 */
export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

/**
 * Complete playback state tracking position and status
 */
export interface PlaybackState {
  /** Current playback status */
  status: PlaybackStatus;
  
  /** Current playback position in ticks (0 to max score duration) */
  currentTick: number;
  
  /** Tone.now() timestamp when playback started (undefined when stopped) */
  startTime?: number;
  
  /** Tick position when paused (undefined when not paused) */
  pausedAt?: number;
}

/**
 * Scheduled note with both musical timing (ticks) and real-time timing (seconds)
 * Used internally by PlaybackScheduler to track scheduled audio events
 */
export interface ScheduledNote {
  /** Note entity ID for tracking */
  noteId: string;
  
  /** MIDI pitch (21-108 for piano) */
  pitch: number;
  
  /** Musical time position in ticks */
  startTick: number;
  
  /** Musical duration in ticks */
  durationTicks: number;
  
  /** Real-time scheduled start (Tone.now() + offset) */
  startTime: number;
  
  /** Real-time duration in seconds */
  durationSeconds: number;
}
