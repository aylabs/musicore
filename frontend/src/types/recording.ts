/**
 * Recording domain types for the debug-mode Recording View feature.
 * All entities are in-memory only; no persistence.
 */

/** State of an active recording session */
export type RecordingSessionState =
  | 'idle'         // No recording active, no error
  | 'requesting'   // Awaiting getUserMedia permission
  | 'recording'    // AudioWorklet active, mic open
  | 'error';       // Capture failed or resources unavailable

/** Active microphone capture session */
export interface RecordingSession {
  state: RecordingSessionState;
  /** Epoch ms when recording started; null when not recording */
  startTimestamp: number | null;
  /** Human-readable error description; null when no error */
  errorMessage: string | null;
}

/**
 * PCM sample buffer posted from AudioWorklet processor to main thread.
 * Batched at 2048 samples (≈46 ms at 44100 Hz).
 */
export interface AudioFrame {
  /** Raw PCM samples, range [-1, 1] */
  buffer: Float32Array;
  /** Sample rate in Hz (always 44100) */
  sampleRate: number;
}

/**
 * Output of one pitch detection cycle (McLeod Pitch Method via pitchy).
 * Only produced when clarity >= CONFIDENCE_THRESHOLD.
 */
export interface PitchSample {
  /** Detected fundamental frequency in Hz */
  hz: number;
  /** Detection confidence in [0, 1]; values >= 0.9 are considered reliable */
  confidence: number;
  /** Note name with accidental, e.g. "A", "C#" */
  note: string;
  /** Scientific octave number, e.g. 4 for A4 */
  octave: number;
  /** Full note label, e.g. "A4", "C#5" */
  label: string;
}

/**
 * A note onset appended to the note history list.
 * Created when pitch changes or a 300 ms silence gap elapses between identical pitches.
 */
export interface NoteOnset {
  /** Full note label, e.g. "A4" */
  label: string;
  /** Note name, e.g. "A" */
  note: string;
  /** Octave number */
  octave: number;
  /** Detection confidence at time of onset */
  confidence: number;
  /** Elapsed ms since session startTimestamp */
  elapsedMs: number;
}

/** Current waveform buffer used to render the oscilloscope */
export interface OscilloscopeState {
  /** Latest PCM amplitude values (Float32Array slice), or null when not recording */
  waveform: Float32Array | null;
}
