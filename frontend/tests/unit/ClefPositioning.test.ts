/**
 * Unit tests for clef-based note positioning logic
 * Feature 007: Clef Notation Support in UI
 * 
 * Tests verify that MIDI pitches are correctly mapped to staff positions
 * for different clef types (Treble, Bass, Alto, Tenor).
 */

import { describe, it, expect } from 'vitest';
import { NotationLayoutEngine } from '../../src/services/notation/NotationLayoutEngine';

describe('ClefPositioning - Bass Clef (User Story 1)', () => {
  describe('T011: Basic Bass clef positioning', () => {
    it('should position MIDI 48 (C3) correctly in bass clef', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(48, 'Bass');
      expect(result).toBe(-1); // C3 in bass clef is space below middle line
    });
  });

  describe('T012: Bass clef diatonic mappings', () => {
    it('should position C3 (MIDI 48) on space below middle line', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(48, 'Bass');
      expect(result).toBe(-1);
    });

    it('should position F3 (MIDI 53) on fourth line from bottom', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(53, 'Bass');
      expect(result).toBe(2); // Fourth line from bottom (line 4)
    });

    it('should position C4 (Middle C, MIDI 60) on ledger line above staff', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(60, 'Bass');
      expect(result).toBe(6); // Ledger line above staff
    });

    it('should position D3 (MIDI 50) on middle line', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(50, 'Bass');
      expect(result).toBe(0); // Middle line
    });

    it('should position G2 (MIDI 43) on bottom line', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(43, 'Bass');
      expect(result).toBe(-4); // Bottom line
    });

    it('should position A3 (MIDI 57) on top line', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(57, 'Bass');
      expect(result).toBe(4); // Top line
    });

    it('should position E2 (MIDI 40) on ledger line below staff', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(40, 'Bass');
      expect(result).toBe(-6); // Ledger line below
    });

    it('should position B3 (MIDI 59) on space above top line', () => {
      const result = NotationLayoutEngine.midiPitchToStaffPosition(59, 'Bass');
      expect(result).toBe(5); // Space above top line
    });
  });

  describe('Bass clef vs Treble clef comparison', () => {
    it('should position same pitch differently in Bass vs Treble', () => {
      const pitchC4 = 60; // Middle C
      
      const treblePosition = NotationLayoutEngine.midiPitchToStaffPosition(pitchC4, 'Treble');
      const bassPosition = NotationLayoutEngine.midiPitchToStaffPosition(pitchC4, 'Bass');
      
      // Middle C is below staff in Treble, above staff in Bass
      expect(treblePosition).toBe(-6); // Ledger line below in treble
      expect(bassPosition).toBe(6);    // Ledger line above in bass
      expect(treblePosition).not.toBe(bassPosition);
    });

    it('should position F3 (fourth line in bass) much lower in treble', () => {
      const pitchF3 = 65; // F4 in context, not F3 (MIDI)
      
      // Note: This test checks that the same absolute pitch appears at different heights
      const treblePosF4 = NotationLayoutEngine.midiPitchToStaffPosition(65, 'Treble');
      const bassPosF3 = NotationLayoutEngine.midiPitchToStaffPosition(53, 'Bass');
      
      expect(treblePosF4).toBe(-3); // Space in treble
      expect(bassPosF3).toBe(2);    // Line 4 in bass
    });
  });

  describe('Accidentals in Bass clef', () => {
    it('should identify F# (MIDI 42) as sharp in bass clef', () => {
      const accidental = NotationLayoutEngine.getAccidental(42, 'Bass');
      expect(accidental).toBe('sharp');
    });

    it('should have no accidental for G2 (MIDI 43) in bass clef - white key', () => {
      const accidental = NotationLayoutEngine.getAccidental(43, 'Bass');
      expect(accidental).toBeUndefined();
    });

    it('should have no accidental for D3 (MIDI 50) in bass clef - white key', () => {
      const accidental = NotationLayoutEngine.getAccidental(50, 'Bass');
      expect(accidental).toBeUndefined();
    });
  });
});

describe('ClefPositioning - Treble Clef (existing functionality)', () => {
  it('should position B4 (MIDI 71) on middle line in treble', () => {
    const result = NotationLayoutEngine.midiPitchToStaffPosition(71, 'Treble');
    expect(result).toBe(0); // Middle line
  });

  it('should position E4 (MIDI 64) on bottom line in treble', () => {
    const result = NotationLayoutEngine.midiPitchToStaffPosition(64, 'Treble');
    expect(result).toBe(-4); // Bottom line
  });
});
