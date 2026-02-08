# Data Model: Chord Symbol Visualization

**Feature**: 005-chord-symbols  
**Date**: 2026-02-08  
**Reference**: [spec.md](spec.md), [research.md](research.md)

## Overview

This document defines the data structures for chord detection and visualization. All types are TypeScript interfaces for frontend implementation. No backend data model changes required for P1/P2 (chord detection happens client-side).

---

## Core Entities

### ChordGroup

Represents a collection of notes that occur at the same tick position and may form a chord.

```typescript
/**
 * ChordGroup - Collection of notes at the same tick position
 * 
 * Relationship: Contains multiple Note entities from same or different voices
 * Lifecycle: Created during chord detection, exists only in rendering context
 */
interface ChordGroup {
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
```

**Validation Rules**:
- `notes.length >= 2` (single note is not a chord)
- All `notes` have same `start_tick` value
- `rootPitch` must be present in `notes` pitch values
- `symbol` is non-empty string when `chordType` is not null

---

### ChordType

Classification of chord based on interval structure.

```typescript
/**
 * ChordType - Harmonic classification of a chord
 * 
 * Based on music theory interval patterns
 * Extensible for future chord types (9ths, 11ths, altered chords)
 */
type ChordType =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'dominant7'      // Dominant seventh (mixolydian seventh)
  | 'major7'         // Major seventh
  | 'minor7';        // Minor seventh

/**
 * ChordPattern - Interval pattern for chord type recognition
 */
interface ChordPattern {
  /** Chord type identifier */
  type: ChordType;
  
  /** Intervals from root in semitones (pitch class set normalized to root=0) */
  intervals: number[];
  
  /** Display symbol suffix (e.g., "", "m", "dim", "7", "maj7") */
  symbolSuffix: string;
}

/**
 * Chord pattern database for recognition
 */
const CHORD_PATTERNS: Record<ChordType, ChordPattern> = {
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
```

---

### ChordSymbolLayout

Layout data for rendering chord symbol in staff notation.

```typescript
/**
 * ChordSymbolLayout - Positioning and display data for chord symbol
 * 
 * Calculated by layout engine, consumed by renderer
 */
interface ChordSymbolLayout {
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
```

---

##Helper Types

### PitchClass

Pitch class representation for chord analysis (0-11 semitone system).

```typescript
/**
 * PitchClass - Semitone value within octave (0-11)
 * 
 * Maps MIDI pitch to chromatic pitch class:
 * 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F, 6=F#/Gb, 7=G, 8=G#/Ab, 9=A, 10=A#/Bb, 11=B
 */
type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Convert MIDI pitch to pitch class
 */
function toPitchClass(midiPitch: number): PitchClass {
  return (midiPitch % 12) as PitchClass;
}

/**
 * Pitch class note names (enharmonic spelling simplified)
 */
const PITCH_CLASS_NAMES: Record<PitchClass, string> = {
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
```

---

## Service Interfaces

### ChordDetector

Service for detecting chords from note arrays.

```typescript
/**
 * ChordDetector - Detects potential chords from notes
 * 
 * Pure function service (no state, no dependencies)
 */
interface IChordDetector {
  /**
   * Group notes by tick position
   * 
   * @param notes Array of notes to analyze
   * @returns Map of tick position to notes at that tick
   */
  groupByTick(notes: Note[]): Map<number, Note[]>;
  
  /**
   * Filter groups that have 2+ notes (potential chords)
   * 
   * @param groups Map from groupByTick
   * @returns Array of note groups with 2+ notes
   */
  filterChordCandidates(groups: Map<number, Note[]>): Array<{ tick: number; notes: Note[] }>;
}
```

### ChordAnalyzer

Service for identifying chord types from pitch collections.

```typescript
/**
 * ChordAnalyzer - Analyzes pitch collections to identify chord types
 * 
 * Pure function service (music theory calculations)
 */
interface IChordAnalyzer {
  /**
   * Identify chord type from notes
   * 
   * @param notes Array of notes (2+ notes required)
   * @returns ChordGroup with type and symbol, or null if unrecognized
   */
  identify(notes: Note[]): ChordGroup | null;
  
  /**
   * Calculate interval pattern from root
   * 
   * @param pitches Array of MIDI pitches
   * @param root Root pitch
   * @returns Array of intervals in semitones
   */
  calculateIntervals(pitches: number[], root: number): number[];
  
  /**
   * Find root note (lowest pitch by default, future: stability heuristics)
   * 
   * @param pitches Array of MIDI pitches
   * @returns Root MIDI pitch
   */
  findRoot(pitches: number[]): number;
}
```

### ChordSymbolFormatter

Service for formatting chord symbols for display.

```typescript
/**
 * ChordSymbolFormatter - Formats chord information into display string
 */
interface IChordSymbolFormatter {
  /**
   * Format chord as symbol string
   * 
   * @param root Root MIDI pitch
   * @param chordType Identified chord type
   * @returns Symbol string (e.g., "C", "Am7", "F#dim")
   */
  format(root: number, chordType: ChordType): string;
  
  /**
   * Get note name from MIDI pitch (enharmonic spelling)
   * 
   * @param pitch MIDI pitch
   * @returns Note name (e.g., "C", "F#", "Bb")
   */
  getNoteName(pitch: number): string;
}
```

---

## Component Props

### ChordSymbol Component

React component for rendering chord symbols.

```typescript
/**
 * ChordSymbol - Component for rendering chord symbols above staff notation
 * 
 * Composes with StaffNotation, handles detection and rendering
 */
interface ChordSymbolProps {
  /** Notes to analyze for chords */
  notes: Note[];
  
  /** Staff configuration for positioning */
  staffConfig: StaffConfig;
  
  /** Viewport width for horizontal positioning */
  viewportWidth: number;
  
  /** Optional: Override default vertical offset (default: 30px above staff) */
  verticalOffset?: number;
  
  /** Optional: Font size in pixels (default: 14) */
  fontSize?: number;
}
```

---

## Data Flow

```
User adds notes at same tick
         ↓
StaffNotation renders with notes prop
         ↓
ChordSymbol component receives notes
         ↓
ChordDetector.groupByTick(notes) → groups by tick
         ↓
ChordDetector.filterChordCandidates(groups) → 2+ note groups
         ↓
ChordAnalyzer.identify(noteGroup) → ChordGroup with type/symbol
         ↓
ChordSymbolFormatter.format(root, type) → "C", "Am7", etc.
         ↓
Calculate layout positions (x, y) for SVG <text>
         ↓
Render SVG text elements above staff
```

---

## Persistence

**Note**: No persistence changes required. Chords are derived from existing Note entities.

- **Save**: Note data (pitch, tick, duration) already persisted in score files
- **Load**: Chord symbols recalculated on render from notes
- **Rationale**: Chords are computed visualization, not domain data. Storing computed data violates DRY and introduces sync issues.

---

## Extension Points

Future enhancements can extend these types:

1. **Extended Chords**: Add to ChordType enum: `'dominant9' | 'major9' | 'added9' | 'suspended2' | 'suspended4'`
2. **Inversions**: Add `inversion?: 'root' | 'first' | 'second'` to ChordGroup (e.g., "C/E" for first inversion)
3. **Slash Chords**: Add `bassNote?: number` to ChordGroup (e.g., "C/G" for C chord with G bass)
4. **Display Preferences**: Add `ChordDisplayPreferences` interface for font, color, visibility toggles
5. **Backend Analysis**: Add `POST /api/scores/:id/analyze-chords` endpoint returning `ChordGroup[]` (optimization)

---

## Validation & Testing

### Unit Test Coverage

- `toPitchClass()`: Verify correct modulo 12 calculation
- `ChordDetector.groupByTick()`: Test grouping correctness, edge cases (single note, empty array)
- `ChordAnalyzer.identify()`: Test all 7 chord types with various voicings/octaves
- `ChordSymbolFormatter.format()`: Test all 12 roots × 7 types = 84 symbol variations

### Integration Test Scenarios

- Add notes C4, E4, G4 at tick 0 → renders "C" symbol
- Add notes C4, Eb4, G4 at tick 0 → renders "Cm" symbol  
- Add notes C4, E4, G4, Bb4 at tick 0 → renders "C7" symbol
- Add notes C3, E4, G5 (octave spread) → correctly identifies C major
- Add notes at different ticks → renders multiple symbols without overlap
- Remove note from chord → symbol updates or disappears

---

## Summary

- **7 ChordTypes** defined (meets FR-007 minimum)
- **Pure function services** (ChordDetector, ChordAnalyzer, ChordSymbolFormatter) - testable, no side effects
- **No backend changes** - frontend-only implementation for P1/P2
- **Extensible design** - easy to add new chord types, inversions, preferences
- **Follows DDD** - ChordGroup is domain concept, services use music theory terminology
- **Supports constitution** - no precision loss, pure functions, test-friendly

