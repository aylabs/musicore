/**
 * Chord Symbol Visualization Types
 * 
 * Type definitions for chord detection, analysis, and rendering.
 * Based on music theory and pitch class set analysis.
 */

import type { Note } from './score';

// ============================================================================
// Core Types (T005, T006)
// ============================================================================

/**
 * PitchClass - Semitone value within octave (0-11)
 * 
 * Maps MIDI pitch to chromatic pitch class:
 * 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F, 6=F#/Gb, 7=G, 8=G#/Ab, 9=A, 10=A#/Bb, 11=B
 */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * ChordType - Harmonic classification of a chord
 * 
 * Based on music theory interval patterns.
 * Extensible for future chord types (9ths, 11ths, altered chords).
 */
export type ChordType =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'dominant7'      // Dominant seventh (mixolydian seventh)
  | 'major7'         // Major seventh
  | 'minor7';        // Minor seventh

// ============================================================================
// Chord Pattern Database (T007, T008)
// ============================================================================

/**
 * ChordPattern - Interval pattern for chord type recognition
 */
export interface ChordPattern {
  /** Chord type identifier */
  type: ChordType;
  
  /** Intervals from root in semitones (pitch class set normalized to root=0) */
  intervals: number[];
  
  /** Display symbol suffix (e.g., "", "m", "dim", "7", "maj7") */
  symbolSuffix: string;
}

/**
 * Chord pattern database for recognition
 * Maps chord types to their interval patterns
 */
export const CHORD_PATTERNS: Record<ChordType, ChordPattern> = {
  major: {
    type: 'major',
    intervals: [0, 4, 7],           // Root, major third, perfect fifth
    symbolSuffix: '',
  },
  minor: {
    type: 'minor',
    intervals: [0, 3, 7],           // Root, minor third, perfect fifth
    symbolSuffix: 'm',
  },
  diminished: {
    type: 'diminished',
    intervals: [0, 3, 6],           // Root, minor third, diminished fifth
    symbolSuffix: 'dim',
  },
  augmented: {
    type: 'augmented',
    intervals: [0, 4, 8],           // Root, major third, augmented fifth
    symbolSuffix: 'aug',
  },
  dominant7: {
    type: 'dominant7',
    intervals: [0, 4, 7, 10],       // Root, M3, P5, minor seventh
    symbolSuffix: '7',
  },
  major7: {
    type: 'major7',
    intervals: [0, 4, 7, 11],       // Root, M3, P5, major seventh
    symbolSuffix: 'maj7',
  },
  minor7: {
    type: 'minor7',
    intervals: [0, 3, 7, 10],       // Root, m3, P5, minor seventh
    symbolSuffix: 'm7',
  },
};

// ============================================================================
// Domain Entities (T009, T010)
// ============================================================================

/**
 * ChordGroup - Collection of notes at the same tick position
 * 
 * Relationship: Contains multiple Note entities from same or different voices
 * Lifecycle: Created during chord detection, exists only in rendering context
 * 
 * Validation Rules:
 * - notes.length >= 2 (single note is not a chord)
 * - All notes have same start_tick value
 * - rootPitch must be present in notes pitch values
 * - symbol is non-empty string when chordType is not null
 */
export interface ChordGroup {
  /** Tick position where all notes start (960 PPQ resolution) */
  tick: number;
  
  /** Notes that comprise this group (2+ notes required) */
  notes: Note[];
  
  /** Identified chord type (null if unrecognized pattern) */
  chordType: ChordType | null;
  
  /** Root note MIDI pitch (e.g., 60 for C4) */
  rootPitch: number;
  
  /** Display symbol text (e.g., "C", "Am7", "Fdim") */
  symbol: string;
}

/**
 * ChordSymbolLayout - Positioning and display data for chord symbol
 * 
 * Calculated by layout engine, consumed by renderer
 */
export interface ChordSymbolLayout {
  /** Horizontal position (SVG x coordinate) */
  x: number;
  
  /** Vertical position (SVG y coordinate) */
  y: number;
  
  /** Symbol text to display (e.g., "C", "Am7") */
  text: string;
  
  /** Tick position (for mapping back to notes) */
  tick: number;
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Font weight (normal | bold) */
  fontWeight: 'normal' | 'bold';
}

// ============================================================================
// Helper Functions (T011, T012)
// ============================================================================

/**
 * Pitch class note names (enharmonic spelling simplified)
 */
export const PITCH_CLASS_NAMES: Record<PitchClass, string> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

/**
 * Convert MIDI pitch to pitch class
 * 
 * @param midiPitch - MIDI pitch value (0-127)
 * @returns Pitch class (0-11)
 */
export function toPitchClass(midiPitch: number): PitchClass {
  return (midiPitch % 12) as PitchClass;
}

/**
 * Get note name from pitch class
 * 
 * @param pitchClass - Pitch class (0-11)
 * @returns Note name (e.g., "C", "F#", "Bb")
 */
export function getPitchClassName(pitchClass: PitchClass): string {
  return PITCH_CLASS_NAMES[pitchClass];
}
