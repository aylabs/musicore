/**
 * ChordAnalyzer Service
 * 
 * Analyzes pitch collections to identify chord types.
 * Uses pitch class set approach with interval matching.
 */

import type { Note } from '../../types/score';
import type { ChordGroup, ChordType } from '../../types/chord';
import { toPitchClass, CHORD_PATTERNS } from '../../types/chord';
import { ChordSymbolFormatter } from './ChordSymbolFormatter';

/**
 * ChordAnalyzer - Analyzes pitch collections to identify chord types
 * 
 * Pure function service (music theory calculations)
 */
export class ChordAnalyzer {
  /**
   * Find root note (lowest pitch by default)
   * 
   * In User Story 1, we use simple lowest-pitch heuristic.
   * User Story 2 may add stability analysis for inversions.
   * 
   * @param pitches - Array of MIDI pitches
   * @returns Root MIDI pitch
   */
  findRoot(pitches: number[]): number {
    return Math.min(...pitches);
  }

  /**
   * Calculate interval pattern from root
   * 
   * Converts pitches to pitch classes (0-11), then calculates
   * intervals from root. Deduplicates same pitch class at different octaves.
   * 
   * @param pitches - Array of MIDI pitches
   * @param root - Root pitch
   * @returns Array of intervals in semitones (sorted, deduplicated)
   */
  calculateIntervals(pitches: number[], root: number): number[] {
    const rootPitchClass = toPitchClass(root);
    
    // Convert all pitches to pitch classes and calculate intervals
    const pitchClasses = pitches.map(pitch => toPitchClass(pitch));
    
    // Calculate intervals from root (normalized to 0-11)
    const intervals = pitchClasses.map(pc => {
      const interval = (pc - rootPitchClass + 12) % 12;
      return interval;
    });
    
    // Deduplicate and sort
    const uniqueIntervals = Array.from(new Set(intervals)).sort((a, b) => a - b);
    
    return uniqueIntervals;
  }

  /**
   * Check if two interval arrays match
   * 
   * Used for chord pattern recognition.
   * 
   * @param intervals1 - First interval array
   * @param intervals2 - Second interval array
   * @returns true if arrays have same length and elements
   */
  private intervalsMatch(intervals1: number[], intervals2: number[]): boolean {
    if (intervals1.length !== intervals2.length) {
      return false;
    }
    
    return intervals1.every((interval, index) => interval === intervals2[index]);
  }

  /**
   * Identify chord type from notes
   * 
   * Uses pitch class set approach with interval matching.
   * Matches calculated intervals against CHORD_PATTERNS database.
   * 
   * @param notes - Array of notes (2+ notes required)
   * @returns ChordGroup with type and symbol, or null if invalid
   */
  identify(notes: Note[]): ChordGroup | null {
    // Validation: need at least 2 notes for a chord
    if (notes.length < 2) {
      return null;
    }

    // Extract pitches and find root
    const pitches = notes.map(note => note.pitch);
    const rootPitch = this.findRoot(pitches);
    
    // Get tick from first note (all notes should have same tick)
    const tick = notes[0].start_tick;
    
    // Calculate interval pattern
    const intervals = this.calculateIntervals(pitches, rootPitch);
    
    // Match against CHORD_PATTERNS (US2)
    const formatter = new ChordSymbolFormatter();
    
    for (const [typeName, pattern] of Object.entries(CHORD_PATTERNS)) {
      if (this.intervalsMatch(intervals, pattern.intervals)) {
        return {
          tick,
          notes,
          chordType: typeName as ChordType,
          rootPitch,
          symbol: formatter.format(rootPitch, typeName as ChordType),
        };
      }
    }
    
    // No match found - unrecognized pattern (US2: NFR-011)
    return {
      tick,
      notes,
      chordType: null,
      rootPitch,
      symbol: '',
    };
  }
}
