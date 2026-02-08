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
  private sampler: Tone.Sampler | null = null;
  private initialized = false;
  private useSampler = true; // Use piano samples for realistic sound
  private scheduledEventIds: number[] = []; // Track Transport event IDs for cancellation

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
      
      // Start Tone.Transport for scheduling (required for Transport.schedule)
      Tone.Transport.start();

      if (this.useSampler) {
        // US3: Use Salamander Grand Piano samples for realistic sound
        this.sampler = new Tone.Sampler({
          urls: {
            A0: "A0.mp3",
            C1: "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            A7: "A7.mp3",
            C8: "C8.mp3"
          },
          release: 1,
          baseUrl: "https://tonejs.github.io/audio/salamander/",
          volume: -5,
        }).toDestination();

        // Load samples asynchronously (don't block initialization)
        // Samples will stream in as needed - first notes may use synth fallback
        Tone.loaded().then(() => {
          console.log('Piano samples loaded');
        });
      } else {
        // Fallback: Basic synthesizer
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          volume: -8,
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 1.0,
          },
        }).toDestination();
      }

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
    // Cancel all scheduled events by ID
    for (const eventId of this.scheduledEventIds) {
      Tone.Transport.clear(eventId);
    }
    this.scheduledEventIds = [];

    // Stop currently playing notes
    if (this.sampler) {
      this.sampler.releaseAll();
    } else if (this.polySynth) {
      this.polySynth.releaseAll();
    }

    // Cancel any remaining scheduled events on Tone.Transport
    Tone.Transport.cancel();
  }

  /**
   * Play a single note with specified pitch, duration, and timing
   * 
   * US2 T034: Implement playNote() for actual note playback
   * US3 T046: Uses piano samples for realistic sound
   * US3 T048: Validates MIDI pitch range (21-108 standard piano)
   * US3 T051: Handles out-of-range notes gracefully
   * 
   * @param pitch - MIDI pitch number (0-127, where 60 = middle C)
   *                Standard piano range: 21 (A0) to 108 (C8)
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
    if (!this.initialized || (!this.sampler && !this.polySynth)) {
      console.warn('ToneAdapter not initialized. Call init() first.');
      return;
    }

    // US3 T048 & T051: Validate MIDI pitch range (21-108 = standard piano)
    const PIANO_MIN_PITCH = 21; // A0
    const PIANO_MAX_PITCH = 108; // C8
    
    if (pitch < PIANO_MIN_PITCH || pitch > PIANO_MAX_PITCH) {
      console.warn(
        `MIDI pitch ${pitch} is out of piano range (${PIANO_MIN_PITCH}-${PIANO_MAX_PITCH}). Skipping playback.`
      );
      return; // Skip playback silently without crashing
    }

    // Convert MIDI pitch to note name (e.g., 60 -> "C4")
    const noteName = Tone.Frequency(pitch, 'midi').toNote();
    
    // Schedule the note using Transport.schedule so it can be cancelled
    const eventId = Tone.Transport.schedule((scheduleTime) => {
      if (this.sampler) {
        // Use sampler for realistic piano sound
        this.sampler.triggerAttackRelease(noteName, duration, scheduleTime);
      } else if (this.polySynth) {
        // Fallback to synthesizer
        this.polySynth.triggerAttackRelease(noteName, duration, scheduleTime);
      }
    }, time);
    
    // Track the event ID so we can cancel it later
    this.scheduledEventIds.push(eventId);
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
