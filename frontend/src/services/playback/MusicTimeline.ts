import { useState, useCallback, useRef, useMemo } from 'react';
import { ToneAdapter } from './ToneAdapter';
import { PlaybackScheduler } from './PlaybackScheduler';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

/**
 * PlaybackState interface for usePlayback hook return value
 */
export interface PlaybackState {
  status: PlaybackStatus;
  currentTick: number;
  error: string | null; // US3 T052: Error message for autoplay policy failures
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
}

/**
 * MusicTimeline - React hook for managing playback state
 * 
 * Feature 003 - Music Playback: User Story 1
 * Manages playback lifecycle: stopped → playing → paused → stopped
 * Coordinates with ToneAdapter for audio initialization and control.
 * 
 * @param notes - Array of notes to play
 * @param tempo - Tempo in BPM (beats per minute)
 * @returns PlaybackState with status, currentTick, and control functions
 * 
 * @example
 * ```typescript
 * const { status, currentTick, play, pause, stop } = usePlayback(notes, 120);
 * 
 * <button onClick={play} disabled={status === 'playing'}>Play</button>
 * <button onClick={pause} disabled={status !== 'playing'}>Pause</button>
 * <button onClick={stop} disabled={status === 'stopped'}>Stop</button>
 * ```
 */
export function usePlayback(notes: Note[], tempo: number): PlaybackState {
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [error, setError] = useState<string | null>(null); // US3 T052: Track autoplay errors
  
  // Refs to track timing information
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  
  // Get ToneAdapter singleton
  const adapter = ToneAdapter.getInstance();

  // US2 T037: Create PlaybackScheduler instance (memoized to persist across renders)
  const scheduler = useMemo(() => new PlaybackScheduler(adapter), [adapter]);

  /**
   * US1 T021: Implement play() - Initialize audio and transition to 'playing'
   * US2 T037: Integrate PlaybackScheduler to schedule notes
   * US3 T052: Handle browser autoplay policy errors with user-friendly message
   * 
   * Initializes Tone.js audio context (if not already initialized) and
   * transitions playback status to 'playing'. Handles resume from paused state.
   * Catches autoplay policy errors and displays user-friendly message.
   */
  const play = useCallback(async () => {
    try {
      // Clear any previous errors
      setError(null);

      // Initialize audio context (required for browser autoplay policy)
      // US1 T021: Call ToneAdapter.init()
      await adapter.init();

      // Store start time for timeline tracking
      startTimeRef.current = adapter.getCurrentTime();

      // US2 T037: Schedule notes for playback
      scheduler.scheduleNotes(notes, tempo, currentTick);

      // Transition to playing state
      // US1 T021: Transition status to 'playing'
      setStatus('playing');
    } catch (error) {
      // US3 T052: Handle browser autoplay policy errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is an autoplay policy error
      if (errorMessage.includes('autoplay') || 
          errorMessage.includes('user interaction') ||
          errorMessage.includes('gesture')) {
        setError('Audio playback requires user interaction. Please try clicking Play again.');
      } else {
        setError('Failed to initialize audio playback. Please refresh the page and try again.');
      }
      
      console.error('Failed to initialize audio:', error);
      // Stay in stopped/paused state if initialization fails
      throw error;
    }
  }, [adapter, scheduler, notes, tempo, currentTick]);

  /**
   * US1 T022: Implement pause() - Pause playback and track currentTick
   * US2 T038: Clear scheduled notes
   * 
   * Transitions to 'paused' state and preserves currentTick for resume capability.
   * In US2, this also stops note scheduling.
   */
  const pause = useCallback(() => {
    if (status !== 'playing') {
      return; // Only pause if currently playing
    }

    // Preserve current playback position for resume
    const currentTime = adapter.getCurrentTime();
    
    // US2 T038: Clear all scheduled notes
    scheduler.clearSchedule();

    // Convert elapsed time to ticks (US2: will use real conversion)
    // For US1, we preserve currentTick value
    pausedAtRef.current = currentTime;

    // US1 T022: Transition status to 'paused'
    setStatus('paused');
  }, [status, adapter, scheduler]);

  /**
   * US1 T023: Implement stop() - Stop playback, reset to initial state
   * US2 T038: Clear scheduled notes
   * 
   * Stops all audio, resets currentTick to 0, and transitions to 'stopped'.
   */
  const stop = useCallback(() => {
    if (status === 'stopped') {
      return; // Already stopped
    }

    // US2 T038: Clear all scheduled notes
    scheduler.clearSchedule();

    // US1 T023: Call ToneAdapter.stopAll()
    adapter.stopAll();

    // US1 T023: Reset currentTick to 0
    setCurrentTick(0);

    // US1 T023: Transition to 'stopped'
    setStatus('stopped');

    // Reset timing refs
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
  }, [status, adapter, scheduler]);

  return {
    status,
    currentTick,
    error, // US3 T052: Expose error message for UI display
    play,
    pause,
    stop,
  };
}
