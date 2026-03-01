/**
 * Contract: InputSource Type Extension
 * Feature 001-practice-virtual-keyboard
 *
 * Extends the Practice plugin's InputSource union type to include 'virtual-keyboard'.
 * This file documents the contract between PracticePlugin.tsx and PracticeVirtualKeyboard.tsx.
 *
 * No Plugin API version bump is needed — this contract is internal to the practice-view plugin.
 */

// ---------------------------------------------------------------------------
// InputSource (extended from Feature 031 baseline)
// ---------------------------------------------------------------------------

/**
 * The active note input source within the Practice plugin.
 *
 * Exactly one value is active at a time (mutual exclusion).
 *
 * Feature 001 adds 'virtual-keyboard' to the existing union.
 */
export type InputSource =
  | 'midi'              // Physical MIDI device connected and has sent at least one event
  | 'mic'               // Microphone pitch detection active, at least one note detected
  | 'virtual-keyboard'  // On-screen virtual keyboard panel is open (Feature 001)
  | null;               // No input source detected yet (initial state)

// ---------------------------------------------------------------------------
// PracticeVirtualKeyboard props contract
// ---------------------------------------------------------------------------

/**
 * Props for the PracticeVirtualKeyboard component.
 *
 * The component renders the piano keyboard UI and fires callbacks on key events.
 * Audio playback is handled inside the component via context.playNote.
 * Scoring/capture is the responsibility of the parent (PracticePlugin).
 *
 * Constitution Principle VI: This component MUST NOT perform coordinate
 * calculations. It emits only midiNote integers to the parent via callbacks.
 */
export interface PracticeVirtualKeyboardProps {
  /**
   * Plugin context — used ONLY for context.playNote (audio feedback).
   * The component MUST NOT call context.emitNote, context.recording, or
   * context.midi — those are the parent's concern.
   */
  context: {
    playNote: (event: { midiNote: number; timestamp: number; type: 'attack' | 'release' }) => void;
  };

  /**
   * Called when a key is pressed down.
   * @param midiNote  MIDI note number (0–127).
   * @param timestamp Date.now() at the moment of press.
   */
  onKeyDown: (midiNote: number, timestamp: number) => void;

  /**
   * Called when a key is released.
   * @param midiNote   MIDI note number (0–127).
   * @param attackedAt Timestamp of the matching key-down event (from onKeyDown).
   */
  onKeyUp: (midiNote: number, attackedAt: number) => void;
}

// ---------------------------------------------------------------------------
// Octave shift contract
// ---------------------------------------------------------------------------

/** Minimum allowed octave shift offset (−2 = C1–B2 at base C3). */
export const OCTAVE_SHIFT_MIN = -2;

/** Maximum allowed octave shift offset (+2 = C5–B6 at base C3). */
export const OCTAVE_SHIFT_MAX = 2;

/**
 * The MIDI note of the lowest key at octave shift = 0.
 * Matches VirtualKeyboard.tsx: C3 = MIDI 48.
 */
export const KEYBOARD_BASE_NOTE = 48; // C3

/**
 * Number of semitones in the displayed range (two octaves).
 * White keys: 14; Black keys: 10.
 */
export const KEYBOARD_RANGE_SEMITONES = 24;

/**
 * Given an octave shift value, returns the [lowestMidi, highestMidi] of the
 * displayed keyboard range.
 */
export function keyboardRange(octaveShift: number): [number, number] {
  const base = KEYBOARD_BASE_NOTE + octaveShift * 12;
  return [base, base + KEYBOARD_RANGE_SEMITONES - 1];
}

// ---------------------------------------------------------------------------
// InputSource guard helpers (for mic/MIDI subscription handlers)
// ---------------------------------------------------------------------------

/**
 * Returns true if the given inputSource means that mic/MIDI events should be
 * ignored (i.e. virtual keyboard is active).
 */
export function isMicMidiSuspended(source: InputSource): boolean {
  return source === 'virtual-keyboard';
}

/**
 * Returns true if the virtual keyboard is the active input source.
 */
export function isVirtualKeyboardActive(source: InputSource): boolean {
  return source === 'virtual-keyboard';
}
