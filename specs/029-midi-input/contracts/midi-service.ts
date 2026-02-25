/**
 * Service contracts for MIDI Input (feature 029-midi-input).
 *
 * These are the TypeScript interfaces that define the boundaries between
 * components and services. Implementation must satisfy these contracts exactly.
 * Tests MUST be written against these interfaces before any implementation.
 *
 * Related entities: MidiDevice, InputSource, MidiNoteEvent, MidiConnectionEvent
 * are defined in frontend/src/types/recording.ts (extension of existing file).
 */

// ─── Domain Types ────────────────────────────────────────────────────────────

/** A connected MIDI input device */
export interface MidiDevice {
  /** Unique port ID assigned by the browser */
  id: string;
  /** Human-readable device name; falls back to "Unknown Device" if empty */
  name: string;
  /** Manufacturer name; may be empty string */
  manufacturer: string;
  /** Current connection state */
  state: 'connected' | 'disconnected';
}

/** Active capture source — exactly one is active at any time */
export type InputSource =
  | { kind: 'microphone' }
  | { kind: 'midi'; deviceName: string; deviceId: string };

/** A single MIDI note-on event received from the active MIDI device */
export interface MidiNoteEvent {
  /** MIDI note number 0–127 */
  noteNumber: number;
  /** Key velocity 1–127 (events with velocity 0 are filtered out — they are note-offs) */
  velocity: number;
  /** MIDI channel 1–16; all channels are captured with no filtering */
  channel: number;
  /** Milliseconds elapsed since session startTimestamp */
  timestampMs: number;
  /** Derived scientific pitch name, e.g. "A4", "C#5" */
  label: string;
}

/** A device-level connection lifecycle event */
export interface MidiConnectionEvent {
  device: MidiDevice;
  kind: 'connected' | 'disconnected';
  timestamp: number;
}

// ─── useMidiInput hook ────────────────────────────────────────────────────────

/** Props / callbacks injected into useMidiInput */
export interface UseMidiInputCallbacks {
  /** Called for every MIDI note-on event (velocity > 0) on any channel */
  onNoteOn: (event: MidiNoteEvent) => void;
  /** Called when a device connects or disconnects (debounced 300 ms for connect; immediate for disconnect) */
  onConnectionChange: (event: MidiConnectionEvent) => void;
}

/** Return value of the useMidiInput hook */
export interface UseMidiInputResult {
  /** Currently connected MIDI input devices */
  devices: MidiDevice[];
  /** Human-readable error message, or null when no error */
  error: string | null;
  /**
   * True if the browser supports MIDI input access.
   * False on iOS Safari, Firefox for Android, and any browser without Web MIDI.
   */
  isSupported: boolean;
}

/**
 * useMidiInput — React hook
 *
 * Requests MIDI access on mount (sysex: false).
 * Subscribes to all connected MIDI input devices on all channels.
 * Emits note-on events and connection changes via callbacks.
 * Cleans up all handlers on unmount.
 *
 * Timeout: if MIDI access does not resolve within 3 seconds, the Promise
 * is treated as failed and `error` is set to "MIDI access timed out".
 * The caller (RecordingView) falls back to microphone on any error.
 *
 * @param callbacks - { onNoteOn, onConnectionChange }
 * @returns { devices, error, isSupported }
 */
export type UseMidiInput = (callbacks: UseMidiInputCallbacks) => UseMidiInputResult;

// ─── midiUtils pure functions ─────────────────────────────────────────────────

/**
 * Converts a MIDI note number to a scientific pitch label.
 *
 * Formula: octave = floor(note / 12) - 1; pitchClass = note % 12
 * Examples: 60 → "C4", 69 → "A4", 61 → "C#4", 72 → "C5"
 *
 * @param noteNumber - MIDI note number 0–127
 * @returns Scientific pitch label, e.g. "A4"
 */
export type MidiNoteToLabel = (noteNumber: number) => string;

/**
 * Parses a raw MIDI message Uint8Array and returns a structured result.
 * Returns null for messages that are not note-on events (velocity > 0).
 *
 * Uses standard MIDI 1.0 status byte parsing:
 *   data[0] & 0xF0 === 0x90 and data[2] > 0 → note-on
 *   data[0] & 0xF0 === 0x90 and data[2] === 0 → note-off (returns null)
 *   data[0] & 0xF0 === 0x80 → note-off (returns null)
 *   all other status bytes → returns null
 *
 * @param data - Raw MIDI message bytes (minimum 3 bytes for note messages)
 * @param sessionStartMs - Session start timestamp for relative time calculation
 * @param eventTimeMs - Event timestamp from MIDIMessageEvent.timeStamp
 * @returns Parsed MidiNoteEvent or null if not a note-on
 */
export type ParseMidiNoteOn = (
  data: Uint8Array,
  sessionStartMs: number,
  eventTimeMs: number
) => MidiNoteEvent | null;

// ─── InputSourceBadge component ───────────────────────────────────────────────

export interface InputSourceBadgeProps {
  /** The currently active input source */
  source: InputSource;
}

// ─── MidiDetectionDialog component ───────────────────────────────────────────

export interface MidiDetectionDialogProps {
  /** Detected MIDI devices to display in the dialog */
  devices: MidiDevice[];
  /** Called with 'switch' when user selects "Switch to MIDI" */
  onSwitch: (device: MidiDevice) => void;
  /** Called with 'keep' when user selects "Keep Microphone", presses Escape, or countdown expires */
  onKeep: () => void;
  /** Auto-dismiss countdown in seconds (default: 30) */
  countdownSeconds?: number;
}

// ─── MidiVisualizationPlaceholder component ───────────────────────────────────

export interface MidiVisualizationPlaceholderProps {
  /**
   * Optional label override. Defaults to "Waveform not available in MIDI mode".
   * Reserved as extension point for future MIDI-specific visualizations.
   */
  message?: string;
}

// ─── RecordingView extension (additions to existing props/state) ──────────────

/**
 * Shape of the MIDI-related state managed in RecordingView.
 * This documents the new state fields alongside existing RecordingSession state.
 * RecordingView is not exported as a typed interface — this is documentation only.
 */
export interface RecordingViewMidiState {
  /** Active input source; initialised after MIDI enumeration on mount */
  activeSource: InputSource;
  /**
   * True when a MIDI device is detected during microphone mode and
   * the MidiDetectionDialog should be shown.
   */
  showMidiDialog: boolean;
  /** Devices detected during hot-connect event; passed to MidiDetectionDialog */
  pendingMidiDevices: MidiDevice[];
}
