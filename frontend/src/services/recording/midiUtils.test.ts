/**
 * Unit tests for midiUtils pure functions.
 *
 * T003 (Phase 1 — parallel with T002).
 * Covers all cases from tasks.md.
 */

import { describe, it, expect } from 'vitest';
import { midiNoteToLabel, parseMidiNoteOn } from './midiUtils';

// ─── midiNoteToLabel ──────────────────────────────────────────────────────────

describe('midiNoteToLabel', () => {
  it('converts middle C (60) to "C4"', () => {
    expect(midiNoteToLabel(60)).toBe('C4');
  });

  it('converts A4 (69) to "A4"', () => {
    expect(midiNoteToLabel(69)).toBe('A4');
  });

  it('converts C#4 (61) to "C#4"', () => {
    expect(midiNoteToLabel(61)).toBe('C#4');
  });

  it('converts C5 (72) to "C5"', () => {
    expect(midiNoteToLabel(72)).toBe('C5');
  });

  it('converts bottom of range: MIDI 0 → "C-1"', () => {
    expect(midiNoteToLabel(0)).toBe('C-1');
  });

  it('converts MIDI 21 (A0, lowest piano key) → "A0"', () => {
    expect(midiNoteToLabel(21)).toBe('A0');
  });

  it('converts MIDI 108 (C8, highest common piano key) → "C8"', () => {
    expect(midiNoteToLabel(108)).toBe('C8');
  });
});

// ─── parseMidiNoteOn ──────────────────────────────────────────────────────────

describe('parseMidiNoteOn', () => {
  const SESSION_START = 1000;
  const EVENT_TIME = 1500;

  /**
   * Helper: build a MIDI 3-byte message.
   * statusByte = (statusType | (channel - 1))
   */
  function msg(statusByte: number, note: number, velocity: number): Uint8Array {
    return new Uint8Array([statusByte, note, velocity]);
  }

  it('returns MidiNoteEvent for 0x90 (note-on) with velocity > 0', () => {
    const result = parseMidiNoteOn(msg(0x90, 69, 100), SESSION_START, EVENT_TIME);
    expect(result).not.toBeNull();
    expect(result!.noteNumber).toBe(69);
    expect(result!.velocity).toBe(100);
    expect(result!.channel).toBe(1);
    expect(result!.label).toBe('A4');
    expect(result!.timestampMs).toBe(500); // 1500 - 1000
  });

  it('returns null for velocity-0 note-on (MIDI note-off in disguise)', () => {
    expect(parseMidiNoteOn(msg(0x90, 60, 0), SESSION_START, EVENT_TIME)).toBeNull();
  });

  it('returns null for 0x80 (explicit note-off)', () => {
    expect(parseMidiNoteOn(msg(0x80, 60, 64), SESSION_START, EVENT_TIME)).toBeNull();
  });

  it('returns null for 0xB0 (Control Change)', () => {
    expect(parseMidiNoteOn(msg(0xb0, 7, 127), SESSION_START, EVENT_TIME)).toBeNull();
  });

  it('returns null for 0xC0 (Program Change)', () => {
    expect(parseMidiNoteOn(msg(0xc0, 0, 0), SESSION_START, EVENT_TIME)).toBeNull();
  });

  it('accepts note-on on channel 5 (status byte 0x94)', () => {
    const result = parseMidiNoteOn(msg(0x94, 60, 80), SESSION_START, EVENT_TIME);
    expect(result).not.toBeNull();
    expect(result!.channel).toBe(5);
  });

  it('accepts note-on on channel 16 (status byte 0x9F)', () => {
    const result = parseMidiNoteOn(msg(0x9f, 60, 80), SESSION_START, EVENT_TIME);
    expect(result).not.toBeNull();
    expect(result!.channel).toBe(16);
  });

  it('computes session-relative timestampMs correctly', () => {
    const result = parseMidiNoteOn(msg(0x90, 69, 100), 2000, 2750);
    expect(result!.timestampMs).toBe(750);
  });

  it('returns null for messages shorter than 3 bytes', () => {
    expect(parseMidiNoteOn(new Uint8Array([0x90, 69]), SESSION_START, EVENT_TIME)).toBeNull();
  });
});
