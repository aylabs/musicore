/**
 * Pure utility functions for MIDI message parsing and note conversion.
 * No side effects, no React, no browser APIs — fully unit-testable.
 *
 * Feature: 029-midi-input
 */

import type { MidiNoteEvent } from '../../types/recording';

/** Chromatic pitch class names (C … B) using sharps */
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Converts a MIDI note number to a scientific pitch label.
 *
 * Formula: octave = floor(note / 12) - 1; pitchClass = note % 12
 * Examples: 60 → "C4", 69 → "A4", 61 → "C#4", 72 → "C5"
 *
 * @param noteNumber - MIDI note number 0–127
 * @returns Scientific pitch label, e.g. "A4"
 */
export function midiNoteToLabel(noteNumber: number): string {
  const pitchClass = PITCH_CLASSES[noteNumber % 12];
  const octave = Math.floor(noteNumber / 12) - 1;
  return `${pitchClass}${octave}`;
}

/**
 * Parses a raw MIDI message Uint8Array and returns a structured result.
 * Returns null for messages that are not note-on events (velocity > 0).
 *
 * Status byte parsing (MIDI 1.0):
 *   data[0] & 0xF0 === 0x90 and data[2] > 0  → note-on  (returned)
 *   data[0] & 0xF0 === 0x90 and data[2] === 0 → note-off disguised as note-on (null)
 *   data[0] & 0xF0 === 0x80                   → note-off (null)
 *   all other status bytes                    → null
 *
 * @param data            - Raw MIDI message bytes (minimum 3 bytes for note messages)
 * @param sessionStartMs  - Session start timestamp (ms) for relative time calculation
 * @param eventTimeMs     - Event timestamp from MIDIMessageEvent.timeStamp
 * @returns Parsed MidiNoteEvent or null if not a note-on
 */
export function parseMidiNoteOn(
  data: Uint8Array,
  sessionStartMs: number,
  eventTimeMs: number
): MidiNoteEvent | null {
  if (data.length < 3) return null;

  const statusByte = data[0];
  const noteNumber = data[1];
  const velocity = data[2];

  const statusType = statusByte & 0xf0;

  // Must be a note-on (0x90) with velocity > 0 to count as note-on
  if (statusType !== 0x90) return null;
  if (velocity === 0) return null; // velocity-0 note-on is a note-off in MIDI 1.0

  const channel = (statusByte & 0x0f) + 1; // channels are 1-based

  return {
    noteNumber,
    velocity,
    channel,
    timestampMs: eventTimeMs - sessionStartMs,
    label: midiNoteToLabel(noteNumber),
  };
}

/**
 * Parses a raw MIDI message and returns the note number if it is a note-off event.
 * Returns null for anything else.
 *
 * Note-off is either:
 *   data[0] & 0xF0 === 0x80  (explicit note-off status byte)
 *   data[0] & 0xF0 === 0x90 and data[2] === 0  (note-on with velocity 0)
 */
export function parseMidiNoteOff(
  data: Uint8Array,
): number | null {
  if (data.length < 3) return null;
  const statusType = data[0] & 0xf0;
  const noteNumber = data[1];
  const velocity = data[2];
  if (statusType === 0x80) return noteNumber;          // explicit note-off
  if (statusType === 0x90 && velocity === 0) return noteNumber; // velocity-0 note-on
  return null;
}
