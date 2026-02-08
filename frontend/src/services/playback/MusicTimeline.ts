import { useState, useCallback, useRef, useMemo } from 'react';
import { ToneAdapter } from './ToneAdapter';
import { PlaybackScheduler, secondsToTicks, ticksToSeconds } from './PlaybackScheduler';
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
  const playbackEndTimeoutRef = useRef<number | null>(null); // Timer for auto-stop when playback ends
  
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

      // Clear any existing playback end timeout
      if (playbackEndTimeoutRef.current !== null) {
        window.clearTimeout(playbackEndTimeoutRef.current);
        playbackEndTimeoutRef.current = null;
      }

      // Initialize audio context (required for browser autoplay policy)
      // US1 T021: Call ToneAdapter.init()
      await adapter.init();

      // Store start time for timeline tracking
      startTimeRef.current = adapter.getCurrentTime();

      // US2 T037: Schedule notes for playback
      scheduler.scheduleNotes(notes, tempo, currentTick);

      // Calculate when playback will end and auto-stop
      if (notes.length > 0) {
        // Find the last note end time
        const notesToPlay = notes.filter(note => note.start_tick >= currentTick);
        if (notesToPlay.length > 0) {
          const lastNote = notesToPlay.reduce((latest, note) => {
            const noteEndTick = note.start_tick + note.duration_ticks;
            const latestEndTick = latest.start_tick + latest.duration_ticks;
            return noteEndTick > latestEndTick ? note : latest;
          });
          
          const lastNoteEndTick = lastNote.start_tick + lastNote.duration_ticks;
          const ticksFromCurrent = lastNoteEndTick - currentTick;
          const playbackDurationSeconds = ticksToSeconds(ticksFromCurrent, tempo);
          
          // Add a small buffer (100ms) to ensure the last note completes
          const timeoutMs = (playbackDurationSeconds + 0.1) * 1000;
          
          playbackEndTimeoutRef.current = window.setTimeout(() => {
            setStatus('stopped');
            setCurrentTick(0);
            playbackEndTimeoutRef.current = null;
          }, timeoutMs);
        }
      }

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

    // Clear playback end timeout since we're manually pausing
    if (playbackEndTimeoutRef.current !== null) {
      window.clearTimeout(playbackEndTimeoutRef.current);
      playbackEndTimeoutRef.current = null;
    }

    // Calculate elapsed time since playback started
    const currentTime = adapter.getCurrentTime();
    const elapsedTime = currentTime - startTimeRef.current;
    
    // Convert elapsed time to ticks and add to currentTick to get new position
    const elapsedTicks = secondsToTicks(elapsedTime, tempo);
    const newCurrentTick = currentTick + elapsedTicks;
    
    // US2 T038: Clear all scheduled notes
    scheduler.clearSchedule();

    // Update currentTick for resume
    setCurrentTick(newCurrentTick);
    pausedAtRef.current = currentTime;

    // US1 T022: Transition status to 'paused'
    setStatus('paused');
  }, [status, adapter, scheduler, tempo, currentTick]);

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

    // Clear playback end timeout since we're manually stopping
    if (playbackEndTimeoutRef.current !== null) {
      window.clearTimeout(playbackEndTimeoutRef.current);
      playbackEndTimeoutRef.current = null;
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
