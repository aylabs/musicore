import * as Tone from 'tone';

/**
 * ToneAdapter - Singleton wrapper for Tone.js audio synthesis
 * 
 * Feature 003 - Music Playback: User Story 1 & 2
 * Provides a simplified interface to Tone.js for:
 * - Audio context initialization (handling autoplay policy)
 * - Polyphonic synthesis with configurable envelope
 * - Note scheduling and playback
 * - Audio context time management
 * 
 * @example
 * ```typescript
 * const adapter = ToneAdapter.getInstance();
 * await adapter.init(); // Must be called after user interaction
 * adapter.playNote(60, 0.5, 1.0); // Play middle C for 0.5s at time=1.0s
 * adapter.stopAll(); // Stop all playing notes
 * ```
 */
export class ToneAdapter {
  private static instance: ToneAdapter | null = null;
  private polySynth: Tone.PolySynth | null = null;
  private initialized = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {}

  /**
   * Get the singleton instance of ToneAdapter
   * 
   * @returns The ToneAdapter instance
   */
  public static getInstance(): ToneAdapter {
    if (!ToneAdapter.instance) {
      ToneAdapter.instance = new ToneAdapter();
    }
    return ToneAdapter.instance;
  }

  /**
   * Initialize Tone.js audio context and synthesizer
   * 
   * US1 T019: Implements audio initialization with Tone.start() and PolySynth creation
   * 
   * Must be called after a user interaction (click/keypress) to comply with
   * browser autoplay policies. Idempotent - safe to call multiple times.
   * 
   * @throws Error if audio context initialization fails
   * 
   * @example
   * ```typescript
   * button.addEventListener('click', async () => {
   *   await adapter.init();
   *   // Now safe to play audio
   * });
   * ```
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized, skip
    }

    try {
      // Start Tone.js audio context (required for browser autoplay policy)
      await Tone.start();

      // Create polyphonic synthesizer with 16 voices for playing chords
      // Basic ADSR envelope: 0.005s attack, 0.1s decay, 0.3 sustain, 1s release
      this.polySynth = new Tone.PolySynth(Tone.Synth, {
        volume: -8, // Reduce volume to prevent clipping
        envelope: {
          attack: 0.005,  // Fast attack for piano-like sound
          decay: 0.1,
          sustain: 0.3,
          release: 1.0,   // Longer release for natural decay
        },
      }).toDestination();

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw new Error(`Failed to initialize ToneAdapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current audio context time in seconds
   * 
   * US1 T018: getCurrentTime() method for timeline synchronization
   * 
   * @returns Current time in seconds since audio context started
   */
  public getCurrentTime(): number {
    return Tone.now();
  }

  /**
   * Stop all currently playing and scheduled notes
   * 
   * US1 T018: stopAll() method for playback control
   * US1 T023: Called by MusicTimeline.stop()
   * 
   * Safe to call even if not initialized.
   */
  public stopAll(): void {
    if (this.polySynth) {
      this.polySynth.releaseAll();
    }

    // Cancel all scheduled events on Tone.Transport
    Tone.Transport.cancel();
  }

  /**
   * Play a single note with specified pitch, duration, and timing
   * 
   * US2 T034: Implement playNote() for actual note playback
   * US1 T018: Stubbed for User Story 1 (implemented in US2)
   * 
   * @param pitch - MIDI pitch number (0-127, where 60 = middle C)
   * @param duration - Duration in seconds
   * @param time - Absolute time to play the note (seconds since audio context start)
   * 
   * @example
   * ```typescript
   * // Play middle C (MIDI 60) for 0.5s at time 1.0s
   * adapter.playNote(60, 0.5, 1.0);
   * ```
   */
  public playNote(pitch: number, duration: number, time: number): void {
    if (!this.initialized || !this.polySynth) {
      console.warn('ToneAdapter not initialized. Call init() first.');
      return;
    }

    // Convert MIDI pitch to frequency and schedule the note
    const frequency = Tone.Frequency(pitch, 'midi').toFrequency();
    this.polySynth.triggerAttackRelease(frequency, duration, time);
  }

  /**
   * Check if the audio context is initialized
   * 
   * @returns True if init() has been called successfully
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
