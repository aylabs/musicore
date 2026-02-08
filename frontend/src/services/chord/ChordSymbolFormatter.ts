/**
 * ChordSymbolFormatter Service
 * 
 * Formats chord information into display strings.
 * Uses music notation conventions.
 */

import type { ChordType } from '../../types/chord';
import { toPitchClass, getPitchClassName, CHORD_PATTERNS } from '../../types/chord';

/**
 * ChordSymbolFormatter - Formats chord information into display string
 */
export class ChordSymbolFormatter {
  /**
   * Get note name from MIDI pitch (enharmonic spelling)
   * 
   * Uses simplified enharmonic spelling based on pitch class.
   * Future enhancement: context-aware spelling based on key signature.
   * 
   * @param pitch - MIDI pitch
   * @returns Note name (e.g., "C", "F#", "Bb")
   */
  getNoteName(pitch: number): string {
    const pitchClass = toPitchClass(pitch);
    return getPitchClassName(pitchClass);
  }

  /**
   * Format chord as symbol string
   * 
   * Combines root note name with chord type suffix.
   * User Story 1: Basic formatting.
   * User Story 2: Uses CHORD_PATTERNS for all 7 chord types.
   * 
   * @param root - Root MIDI pitch
   * @param chordType - Identified chord type
   * @returns Symbol string (e.g., "C", "Am7", "F#dim")
   */
  format(root: number, chordType: ChordType): string {
    const noteName = this.getNoteName(root);
    const suffix = CHORD_PATTERNS[chordType].symbolSuffix;
    return noteName + suffix;
  }
}
