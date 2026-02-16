import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ToneAdapter } from './ToneAdapter';
import { PlaybackScheduler, secondsToTicks, ticksToSeconds } from './PlaybackScheduler';
import { useTempoState } from '../state/TempoStateContext';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

/**
 * PlaybackState interface for usePlayback hook return value
 */
export interface PlaybackState {
  status: PlaybackStatus;
  currentTick: number;
  totalDurationTicks: number; // Feature 022: Total score duration in ticks for timer display
  error: string | null; // US3 T052: Error message for autoplay policy failures
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekToTick: (tick: number) => void; // Feature 009: Seek to specific tick position
  unpinStartTick: () => void; // Feature 009: Clear pinned start position
}

/**
 * MusicTimeline - React hook for managing playback state
 * 
 * Feature 003 - Music Playback: User Story 1
 * Feature 008 - Tempo Change: T015 Added tempo multiplier support
 * 
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
  
  // Feature 008 - Tempo Change: T015 Get tempo multiplier from context
  const { tempoState } = useTempoState();
  
  // Refs to track timing information
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const playbackStartTickRef = useRef<number>(0); // Feature 009: Track tick position when playback started
  const playbackEndTimeoutRef = useRef<number | null>(null); // Timer for auto-stop when playback ends
  const pinnedStartTickRef = useRef<number | null>(null); // Feature 009: Pinned start position from selected note
  
  // Feature 022: Calculate total duration from all notes
  const totalDurationTicks = useMemo(() => {
    if (notes.length === 0) return 0;
    return Math.max(...notes.map(n => n.start_tick + n.duration_ticks));
  }, [notes]);

  // Get ToneAdapter singleton
  const adapter = ToneAdapter.getInstance();

  // US2 T037: Create PlaybackScheduler instance (memoized to persist across renders)
  const scheduler = useMemo(() => new PlaybackScheduler(adapter), [adapter]);

  // Feature 009 - Playback Scroll and Highlight: T006
  // Broadcast currentTick updates at 60 Hz during playback for smooth scroll/highlight
  useEffect(() => {
    if (status !== 'playing') {
      return undefined;
    }

    const intervalId = setInterval(() => {
      const currentTime = adapter.getCurrentTime();
      const elapsedTime = currentTime - startTimeRef.current;
      
      // Convert elapsed time to ticks, accounting for tempo multiplier
      const elapsedTicks = secondsToTicks(elapsedTime, tempo) * tempoState.tempoMultiplier;
      
      // Calculate absolute position: starting tick + elapsed ticks
      const newCurrentTick = playbackStartTickRef.current + elapsedTicks;
      
      setCurrentTick(newCurrentTick);
    }, 16); // 60 Hz = ~16ms interval (matches 60 FPS target)

    return () => clearInterval(intervalId);
  }, [status, adapter, tempo, tempoState.tempoMultiplier]);

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

      // If starting from the beginning (currentTick = 0), skip to the first note
      // This avoids playing through rest measures at the start of the score
      // Feature 009: If there's a pinned position from note selection, use that instead
      let playbackStartTick = currentTick;
      if (pinnedStartTickRef.current !== null) {
        // Use pinned position from selected note
        playbackStartTick = pinnedStartTickRef.current;
        setCurrentTick(playbackStartTick);
      } else if (currentTick === 0 && notes.length > 0) {
        const firstNote = notes.reduce((earliest, note) => 
          note.start_tick < earliest.start_tick ? note : earliest
        );
        playbackStartTick = firstNote.start_tick;
        setCurrentTick(playbackStartTick);
      }

      // Feature 009: Store the tick position where playback starts for scroll calculations
      playbackStartTickRef.current = playbackStartTick;

      // Initialize audio context (required for browser autoplay policy)
      // US1 T021: Call ToneAdapter.init()
      await adapter.init();

      // Start Transport fresh for this playback
      adapter.startTransport();

      // Store start time for timeline tracking
      startTimeRef.current = adapter.getCurrentTime();

      // US1 T021: Transition status to 'playing' immediately for responsive UI
      setStatus('playing');

      // US2 T037: Schedule notes for playback
      // Feature 008 - Tempo Change: T015 Pass tempo multiplier to scheduler
      await scheduler.scheduleNotes(notes, tempo, playbackStartTick, tempoState.tempoMultiplier);

      // Calculate when playback will end and auto-stop
      if (notes.length > 0) {
        // Find the last note end time
        const notesToPlay = notes.filter(note => note.start_tick >= playbackStartTick);
        if (notesToPlay.length > 0) {
          const lastNote = notesToPlay.reduce((latest, note) => {
            const noteEndTick = note.start_tick + note.duration_ticks;
            const latestEndTick = latest.start_tick + latest.duration_ticks;
            return noteEndTick > latestEndTick ? note : latest;
          });
          
          const lastNoteEndTick = lastNote.start_tick + lastNote.duration_ticks;
          const ticksFromCurrent = lastNoteEndTick - playbackStartTick;
          let playbackDurationSeconds = ticksToSeconds(ticksFromCurrent, tempo);
          
          // Feature 008 - Tempo Change: T015 Adjust timeout for tempo multiplier
          playbackDurationSeconds = playbackDurationSeconds / tempoState.tempoMultiplier;
          
          // Add a small buffer (100ms) to ensure the last note completes
          const timeoutMs = (playbackDurationSeconds + 0.1) * 1000;
          
          playbackEndTimeoutRef.current = window.setTimeout(() => {
            setStatus('stopped');
            setCurrentTick(0);
            playbackEndTimeoutRef.current = null;
          }, timeoutMs);
        }
      }
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
  }, [adapter, scheduler, notes, tempo, currentTick, tempoState.tempoMultiplier]);

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

    // Calculate exact tick position at the moment of pause
    // (same calculation as the 60 Hz interval for consistency)
    const currentTime = adapter.getCurrentTime();
    const elapsedTime = currentTime - startTimeRef.current;
    
    // Convert elapsed time to ticks, accounting for tempo multiplier
    const elapsedTicks = secondsToTicks(elapsedTime, tempo) * tempoState.tempoMultiplier;
    
    // Calculate absolute position: starting tick + elapsed ticks
    const newCurrentTick = playbackStartTickRef.current + elapsedTicks;
    
    // US2 T038: Clear all scheduled notes
    scheduler.clearSchedule();

    // Update currentTick to exact pause position for resume
    setCurrentTick(newCurrentTick);
    pausedAtRef.current = currentTime;

    // US1 T022: Transition status to 'paused'
    setStatus('paused');
  }, [status, adapter, scheduler, tempo, tempoState.tempoMultiplier]);

  /**
   * US1 T023: Implement stop() - Stop playback, reset to initial state
   * US2 T038: Clear scheduled notes
   * 
   * Stops all audio, resets currentTick to 0, and transitions to 'stopped'.
   * Feature 009: If a note is pinned (selected), reset to that position instead.
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

    // Feature 009: Reset currentTick to pinned position if set, otherwise 0
    const resetTick = pinnedStartTickRef.current !== null ? pinnedStartTickRef.current : 0;
    setCurrentTick(resetTick);

    // US1 T023: Transition to 'stopped'
    setStatus('stopped');

    // Reset timing refs
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
  }, [status, adapter, scheduler]);

  /**
   * Feature 009: Seek to specific tick position
   * 
   * Sets the playback position to a specific tick. If currently playing,
   * stops playback and sets status to paused so user can continue from
   * the new position with play button.
   * 
   * This also "pins" the start position - pressing Stop will return to this
   * position instead of tick 0, and Play will always start from here until
   * unpinStartTick() is called.
   * 
   * @param tick - The tick position to seek to
   */
  const seekToTick = useCallback((tick: number) => {
    // Clear any scheduled notes if playing
    if (status === 'playing') {
      scheduler.clearSchedule();
      adapter.stopAll();
    }

    // Clear playback end timeout
    if (playbackEndTimeoutRef.current !== null) {
      window.clearTimeout(playbackEndTimeoutRef.current);
      playbackEndTimeoutRef.current = null;
    }

    // Set the tick position and pin it
    setCurrentTick(tick);
    pinnedStartTickRef.current = tick;

    // If currently playing, transition to paused so user can resume
    if (status === 'playing') {
      setStatus('paused');
    }
  }, [status, adapter, scheduler]);

  /**
   * Feature 009: Clear pinned start position
   * 
   * Removes the pinned start position set by seekToTick(). After calling this,
   * Stop will reset to tick 0 and Play will start from the first note as normal.
   * 
   * Called when a note is deselected in the UI.
   */
  const unpinStartTick = useCallback(() => {
    pinnedStartTickRef.current = null;
    // If stopped, reset to tick 0
    if (status === 'stopped') {
      setCurrentTick(0);
    }
  }, [status]);

  return {
    status,
    currentTick,
    totalDurationTicks, // Feature 022: Total score duration for timer
    error, // US3 T052: Expose error message for UI display
    play,
    pause,
    stop,
    seekToTick,
    unpinStartTick,
  };
}
