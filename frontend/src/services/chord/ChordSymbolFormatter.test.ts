/**
 * ChordSymbolFormatter Service Tests
 * 
 * Comprehensive tests for chord symbol formatting.
 * Tests all 84 combinations (12 roots × 7 chord types).
 */

import { describe, it, expect } from 'vitest';
import { ChordSymbolFormatter } from './ChordSymbolFormatter';
import type { ChordType } from '../../types/chord';

describe('ChordSymbolFormatter', () => {
  const formatter = new ChordSymbolFormatter();

  describe('getNoteName', () => {
    it('returns "C" for MIDI pitch 60 (C4)', () => {
      expect(formatter.getNoteName(60)).toBe('C');
    });

    it('returns "C#" for MIDI pitch 61 (C#4)', () => {
      expect(formatter.getNoteName(61)).toBe('C#');
    });

    it('returns correct names for all 12 pitch classes', () => {
      // Uses conventional spellings: flats for Eb, Ab, Bb
      const expectedNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      
      for (let i = 0; i < 12; i++) {
        const pitch = 60 + i; // C4 through B4
        expect(formatter.getNoteName(pitch)).toBe(expectedNames[i]);
      }
    });

    it('handles pitches across multiple octaves', () => {
      expect(formatter.getNoteName(48)).toBe('C'); // C3
      expect(formatter.getNoteName(60)).toBe('C'); // C4
      expect(formatter.getNoteName(72)).toBe('C'); // C5
      expect(formatter.getNoteName(84)).toBe('C'); // C6
    });
  });

  describe('format - all chord types', () => {
    describe('major chords', () => {
      const testCases: [number, string][] = [
        [60, 'C'], [61, 'C#'], [62, 'D'], [63, 'Eb'],
        [64, 'E'], [65, 'F'], [66, 'F#'], [67, 'G'],
        [68, 'Ab'], [69, 'A'], [70, 'Bb'], [71, 'B'],
      ];

      it.each(testCases)('formats MIDI pitch %i as major chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'major')).toBe(expected);
      });
    });

    describe('minor chords', () => {
      const testCases: [number, string][] = [
        [60, 'Cm'], [61, 'C#m'], [62, 'Dm'], [63, 'Ebm'],
        [64, 'Em'], [65, 'Fm'], [66, 'F#m'], [67, 'Gm'],
        [68, 'Abm'], [69, 'Am'], [70, 'Bbm'], [71, 'Bm'],
      ];

      it.each(testCases)('formats MIDI pitch %i as minor chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'minor')).toBe(expected);
      });
    });

    describe('diminished chords', () => {
      const testCases: [number, string][] = [
        [60, 'Cdim'], [61, 'C#dim'], [62, 'Ddim'], [63, 'Ebdim'],
        [64, 'Edim'], [65, 'Fdim'], [66, 'F#dim'], [67, 'Gdim'],
        [68, 'Abdim'], [69, 'Adim'], [70, 'Bbdim'], [71, 'Bdim'],
      ];

      it.each(testCases)('formats MIDI pitch %i as diminished chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'diminished')).toBe(expected);
      });
    });

    describe('augmented chords', () => {
      const testCases: [number, string][] = [
        [60, 'Caug'], [61, 'C#aug'], [62, 'Daug'], [63, 'Ebaug'],
        [64, 'Eaug'], [65, 'Faug'], [66, 'F#aug'], [67, 'Gaug'],
        [68, 'Abaug'], [69, 'Aaug'], [70, 'Bbaug'], [71, 'Baug'],
      ];

      it.each(testCases)('formats MIDI pitch %i as augmented chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'augmented')).toBe(expected);
      });
    });

    describe('dominant 7th chords', () => {
      const testCases: [number, string][] = [
        [60, 'C7'], [61, 'C#7'], [62, 'D7'], [63, 'Eb7'],
        [64, 'E7'], [65, 'F7'], [66, 'F#7'], [67, 'G7'],
        [68, 'Ab7'], [69, 'A7'], [70, 'Bb7'], [71, 'B7'],
      ];

      it.each(testCases)('formats MIDI pitch %i as dominant 7th chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'dominant7')).toBe(expected);
      });
    });

    describe('major 7th chords', () => {
      const testCases: [number, string][] = [
        [60, 'Cmaj7'], [61, 'C#maj7'], [62, 'Dmaj7'], [63, 'Ebmaj7'],
        [64, 'Emaj7'], [65, 'Fmaj7'], [66, 'F#maj7'], [67, 'Gmaj7'],
        [68, 'Abmaj7'], [69, 'Amaj7'], [70, 'Bbmaj7'], [71, 'Bmaj7'],
      ];

      it.each(testCases)('formats MIDI pitch %i as major 7th chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'major7')).toBe(expected);
      });
    });

    describe('minor 7th chords', () => {
      const testCases: [number, string][] = [
        [60, 'Cm7'], [61, 'C#m7'], [62, 'Dm7'], [63, 'Ebm7'],
        [64, 'Em7'], [65, 'Fm7'], [66, 'F#m7'], [67, 'Gm7'],
        [68, 'Abm7'], [69, 'Am7'], [70, 'Bbm7'], [71, 'Bm7'],
      ];

      it.each(testCases)('formats MIDI pitch %i as minor 7th chord "%s"', (pitch, expected) => {
        expect(formatter.format(pitch, 'minor7')).toBe(expected);
      });
    });
  });

  describe('format - comprehensive coverage', () => {
    it('formats all 84 combinations correctly (12 roots × 7 types)', () => {
      const roots = Array.from({ length: 12 }, (_, i) => 60 + i); // C4 through B4
      const types: ChordType[] = ['major', 'minor', 'diminished', 'augmented', 'dominant7', 'major7', 'minor7'];
      
      const suffixes = {
        major: '',
        minor: 'm',
        diminished: 'dim',
        augmented: 'aug',
        dominant7: '7',
        major7: 'maj7',
        minor7: 'm7',
      };

      let validCombinations = 0;
      
      for (const root of roots) {
        const noteName = formatter.getNoteName(root);
        
        for (const type of types) {
          const symbol = formatter.format(root, type);
          const expectedSymbol = noteName + suffixes[type];
          
          expect(symbol).toBe(expectedSymbol);
          validCombinations++;
        }
      }
      
      // Verify we tested all 84 combinations
      expect(validCombinations).toBe(84);
    });
  });
});
