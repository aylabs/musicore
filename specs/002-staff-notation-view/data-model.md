# Data Model: Staff Notation Visualization

**Feature**: 002-staff-notation-view  
**Date**: 2026-02-06  
**Purpose**: Define TypeScript interfaces, geometry structures, and layout algorithms for music notation rendering

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MusicTimeline Component                     │
│  (Data Source: fetches Score from API, extracts Voice data)     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Voice, Notes, StructuralEvents
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NotationLayoutEngine Service                    │
│     (Geometry Calculation: pure TypeScript, no React/DOM)       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ LayoutGeometry
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NotationRenderer Component                     │
│        (SVG Rendering: React component, handles events)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Types

### StaffConfig

Configuration object for staff rendering, passed to layout engine.

```typescript
/**
 * Configuration for staff notation rendering
 */
export interface StaffConfig {
  /** Distance between staff lines in pixels (default: 10) */
  staffSpace: number;
  
  /** Horizontal scaling: pixels per tick (default: 0.1 = 1px per 10 ticks) */
  pixelsPerTick: number;
  
  /** Minimum horizontal spacing between note centers in pixels (default: 15) */
  minNoteSpacing: number;
  
  /** Viewport width in pixels for windowing calculations */
  viewportWidth: number;
  
  /** Viewport height in pixels */
  viewportHeight: number;
  
  /** Current horizontal scroll position in pixels */
  scrollX: number;
  
  /** Fixed left margin width for clef and key signature (default: 60) */
  marginLeft: number;
  
  /** Width allocated for clef symbol (default: 40) */
  clefWidth: number;
  
  /** Width per accidental in key signature (default: 15) */
  keySignatureWidthPerAccidental: number;
  
  /** Width of barline stroke (default: 2) */
  barlineWidth: number;
  
  /** Buffer region outside viewport to render (default: 200px on each side) */
  renderBuffer: number;
  
  /** Font size for SMuFL glyphs relative to staff space (default: 4.0) */
  glyphFontSizeMultiplier: number;
}

/** Default configuration values */
export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  staffSpace: 10,
  pixelsPerTick: 0.1,
  minNoteSpacing: 15,
  viewportWidth: 1200,
  viewportHeight: 200,
  scrollX: 0,
  marginLeft: 60,
  clefWidth: 40,
  keySignatureWidthPerAccidental: 15,
  barlineWidth: 2,
  renderBuffer: 200,
  glyphFontSizeMultiplier: 4.0
};
```

---

## Input Types

### LayoutInput

All data required by NotationLayoutEngine to calculate geometry.

```typescript
/**
 * Input data for layout calculation
 */
export interface LayoutInput {
  /** Notes to render (from Voice.interval_events) */
  notes: Note[];
  
  /** Current clef type */
  clef: ClefType;
  
  /** Current key signature */
  keySignature: KeySignature;
  
  /** Current time signature for barline calculation */
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  
  /** Configuration parameters */
  config: StaffConfig;
}
```

---

## Output Types (Geometry)

### LayoutGeometry

Complete geometric layout returned by NotationLayoutEngine, ready for rendering.

```typescript
/**
 * Complete layout geometry for rendering
 */
export interface LayoutGeometry {
  /** Positioned note elements */
  notes: NotePosition[];
  
  /** Staff line positions */
  staffLines: StaffLine[];
  
  /** Barline positions */
  barlines: Barline[];
  
  /** Ledger line positions */
  ledgerLines: LedgerLine[];
  
  /** Clef symbol position and type */
  clef: ClefPosition;
  
  /** Key signature accidentals */
  keySignatureAccidentals: AccidentalPosition[];
  
  /** Total width of rendered content (for scrollbar sizing) */
  totalWidth: number;
  
  /** Total height of staff system */
  totalHeight: number;
  
  /** Left margin width (fixed region) */
  marginLeft: number;
  
  /** Indices of notes currently visible in viewport */
  visibleNoteIndices: {startIdx: number; endIdx: number};
}
```

### NotePosition

Geometric position for a single note head.

```typescript
/**
 * Positioned note head with geometry and metadata
 */
export interface NotePosition {
  /** Note ID from domain model */
  id: string;
  
  /** X coordinate (horizontal position) in pixels */
  x: number;
  
  /** Y coordinate (vertical position) in pixels, relative to top of staff */
  y: number;
  
  /** MIDI pitch number */
  pitch: number;
  
  /** Start tick position (for hover/selection tooltip) */
  start_tick: number;
  
  /** Duration in ticks (for future stem rendering) */
  duration_ticks: number;
  
  /** Staff position (for ledger line calculation) */
  staffPosition: number;
  
  /** SMuFL codepoint for note head glyph (default: U+E0A4 quarter note) */
  glyphCodepoint: string;
  
  /** Font size for this glyph in pixels */
  fontSize: number;
}
```

### StaffLine

Position for a single staff line.

```typescript
/**
 * Horizontal staff line
 */
export interface StaffLine {
  /** Y coordinate in pixels */
  y: number;
  
  /** X start coordinate (usually 0 or marginLeft) */
  x1: number;
  
  /** X end coordinate (full width) */
  x2: number;
  
  /** Line number (0=bottom, 4=top for 5-line staff) */
  lineNumber: number;
  
  /** Stroke width in pixels (default: 1) */
  strokeWidth: number;
}
```

### Barline

Position for a measure barline.

```typescript
/**
 * Vertical barline at measure boundary
 */
export interface Barline {
  /** Unique key for React rendering */
  id: string;
  
  /** X coordinate in pixels */
  x: number;
  
  /** Tick position in timeline */
  tick: number;
  
  /** Y start coordinate (top of staff) */
  y1: number;
  
  /** Y end coordinate (bottom of staff) */
  y2: number;
  
  /** Measure number (1-indexed) */
  measureNumber: number;
  
  /** Stroke width in pixels */
  strokeWidth: number;
}
```

### LedgerLine

Position for a ledger line (for notes above/below staff).

```typescript
/**
 * Short horizontal line for notes outside staff range
 */
export interface LedgerLine {
  /** Unique key for React rendering */
  id: string;
  
  /** X start coordinate (centered on note) */
  x1: number;
  
  /** X end coordinate */
  x2: number;
  
  /** Y coordinate in pixels */
  y: number;
  
  /** Associated note ID */
  noteId: string;
  
  /** Stroke width in pixels (default: 1) */
  strokeWidth: number;
}
```

### ClefPosition

Position and type for clef symbol.

```typescript
/**
 * Clef symbol position (rendered in fixed margin)
 */
export interface ClefPosition {
  /** Clef type */
  type: ClefType;
  
  /** X coordinate in pixels (within fixed margin) */
  x: number;
  
  /** Y coordinate in pixels (baseline for glyph) */
  y: number;
  
  /** SMuFL codepoint (U+E050 for treble, U+E062 for bass) */
  glyphCodepoint: string;
  
  /** Font size in pixels */
  fontSize: number;
}
```

### AccidentalPosition

Position for key signature accidentals (sharps/flats).

```typescript
/**
 * Accidental symbol in key signature
 */
export interface AccidentalPosition {
  /** Accidental type */
  type: 'sharp' | 'flat';
  
  /** X coordinate in pixels */
  x: number;
  
  /** Y coordinate in pixels */
  y: number;
  
  /** Staff line/space number where accidental appears */
  staffPosition: number;
  
  /** SMuFL codepoint (U+E262 sharp, U+E260 flat) */
  glyphCodepoint: string;
  
  /** Font size in pixels */
  fontSize: number;
}
```

---

## Layout Algorithms

### Pitch to Staff Position

Convert MIDI pitch to staff position number (for Y-coordinate calculation).

```typescript
/**
 * Convert MIDI pitch to staff position
 * @param pitch MIDI pitch number (0-127)
 * @param clef Current clef type
 * @returns Staff position (0=bottom line, 2=middle line, 4=top line, negative/above 4 for ledger lines)
 */
function midiPitchToStaffPosition(pitch: number, clef: ClefType): number {
  // Reference pitches for middle line (line 2) of staff
  const TREBLE_MIDDLE_LINE_PITCH = 71; // B4
  const BASS_MIDDLE_LINE_PITCH = 50;   // D3
  const ALTO_MIDDLE_LINE_PITCH = 60;   // C4 (middle C)
  const TENOR_MIDDLE_LINE_PITCH = 57;  // A3
  
  let referencePitch: number;
  switch (clef) {
    case 'Treble':
      referencePitch = TREBLE_MIDDLE_LINE_PITCH;
      break;
    case 'Bass':
      referencePitch = BASS_MIDDLE_LINE_PITCH;
      break;
    case 'Alto':
      referencePitch = ALTO_MIDDLE_LINE_PITCH;
      break;
    case 'Tenor':
      referencePitch = TENOR_MIDDLE_LINE_PITCH;
      break;
  }
  
  // Calculate semitone offset
  const semitoneOffset = pitch - referencePitch;
  
  // Simplified mapping: 2 semitones per staff position (approximate diatonic steps)
  // More accurate: use key signature and note letter to determine exact position
  const staffPositionOffset = semitoneOffset / 2;
  
  return 2 + staffPositionOffset; // 2 = middle line
}
```

### Staff Position to Y Coordinate

Convert staff position to pixel Y-coordinate.

```typescript
/**
 * Convert staff position to Y-coordinate
 * @param staffPosition Staff position number
 * @param config Staff configuration
 * @returns Y-coordinate in pixels (0=top of SVG, increases downward)
 */
function staffPositionToY(staffPosition: number, config: StaffConfig): number {
  const STAFF_TOP = 50; // Top of staff in SVG (leaves room for above-staff ledger lines)
  
  // Staff position 4 (top line) is at y=STAFF_TOP
  // Staff position 0 (bottom line) is at y=STAFF_TOP + 4*staffSpace
  // Higher pitches (larger staff positions) have smaller y values
  
  return STAFF_TOP + (4 - staffPosition) * config.staffSpace;
}
```

### Horizontal Note Spacing

Calculate X-coordinates for notes based on tick positions.

```typescript
/**
 * Calculate horizontal positions for notes
 * @param notes Array of notes sorted by start_tick
 * @param config Staff configuration
 * @returns Array of NotePosition objects with x, y coordinates
 */
function calculateNotePositions(
  notes: Note[],
  clef: ClefType,
  config: StaffConfig
): NotePosition[] {
  const positions: NotePosition[] = [];
  
  // Starting X position (after fixed margin and clef)
  const startX = config.marginLeft + config.clefWidth + 
                 (config.keySignatureWidthPerAccidental * 0); // Placeholder for key sig width
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    
    // Calculate proportional X based on tick
    const proportionalX = startX + (note.start_tick * config.pixelsPerTick);
    
    // Enforce minimum spacing from previous note
    const prevX = i > 0 ? positions[i - 1].x : startX;
    const minX = prevX + config.minNoteSpacing;
    const x = Math.max(proportionalX, minX);
    
    // Calculate Y from pitch
    const staffPosition = midiPitchToStaffPosition(note.pitch, clef);
    const y = staffPositionToY(staffPosition, config);
    
    positions.push({
      id: note.id,
      x,
      y,
      pitch: note.pitch,
      start_tick: note.start_tick,
      duration_ticks: note.duration_ticks,
      staffPosition,
      glyphCodepoint: '\uE0A4', // Quarter note head (SMuFL U+E0A4)
      fontSize: config.staffSpace * config.glyphFontSizeMultiplier
    });
  }
  
  return positions;
}
```

### Ledger Line Calculation

Determine which notes need ledger lines and their positions.

```typescript
/**
 * Calculate ledger lines for notes outside staff range
 * @param notePositions Positioned notes
 * @returns Array of ledger line positions
 */
function calculateLedgerLines(notePositions: NotePosition[]): LedgerLine[] {
  const ledgerLines: LedgerLine[] = [];
  const NOTE_HEAD_WIDTH = 15; // Approximate width of note head
  const LEDGER_EXTENSION = NOTE_HEAD_WIDTH * 0.75; // Extend 75% of note width on each side
  
  for (const note of notePositions) {
    // Ledger lines needed for notes outside 0-4 staff position range
    if (note.staffPosition < 0) {
      // Below staff: add ledger lines at even positions (0, -2, -4, ...)
      for (let pos = 0; pos >= note.staffPosition; pos -= 2) {
        if (pos < 0) { // Don't add ledger for bottom staff line
          ledgerLines.push({
            id: `ledger-${note.id}-${pos}`,
            x1: note.x - LEDGER_EXTENSION,
            x2: note.x + LEDGER_EXTENSION,
            y: staffPositionToY(pos, {} as StaffConfig), // Y calculation
            noteId: note.id,
            strokeWidth: 1
          });
        }
      }
    } else if (note.staffPosition > 4) {
      // Above staff: add ledger lines at even positions (6, 8, 10, ...)
      for (let pos = 6; pos <= note.staffPosition; pos += 2) {
        if (pos > 4) { // Don't add ledger for top staff line
          ledgerLines.push({
            id: `ledger-${note.id}-${pos}`,
            x1: note.x - LEDGER_EXTENSION,
            x2: note.x + LEDGER_EXTENSION,
            y: staffPositionToY(pos, {} as StaffConfig),
            noteId: note.id,
            strokeWidth: 1
          });
        }
      }
    }
  }
  
  return ledgerLines;
}
```

### Barline Calculation

Calculate measure barlines based on time signature.

```typescript
/**
 * Calculate barline positions
 * @param timeSignature Current time signature
 * @param notes All notes (to determine total width needed)
 * @param config Staff configuration
 * @returns Array of barline positions
 */
function calculateBarlines(
  timeSignature: {numerator: number; denominator: number},
  notes: Note[],
  config: StaffConfig
): Barline[] {
  const PPQ = 960; // Pulses per quarter note (from domain model)
  const ticksPerBeat = PPQ * (4 / timeSignature.denominator);
  const ticksPerMeasure = ticksPerBeat * timeSignature.numerator;
  
  // Find maximum tick position
  const maxTick = notes.length > 0 
    ? Math.max(...notes.map(n => n.start_tick + n.duration_ticks))
    : ticksPerMeasure;
  
  const barlines: Barline[] = [];
  const startX = config.marginLeft + config.clefWidth;
  
  // Add barlines at each measure boundary
  let measureNumber = 1;
  for (let tick = ticksPerMeasure; tick <= maxTick; tick += ticksPerMeasure) {
    const x = startX + (tick * config.pixelsPerTick);
    
    barlines.push({
      id: `barline-${tick}`,
      x,
      tick,
      y1: 50, // Top of staff
      y2: 50 + (4 * config.staffSpace), // Bottom of staff
      measureNumber: measureNumber++,
      strokeWidth: config.barlineWidth
    });
  }
  
  return barlines;
}
```

### Virtual Scrolling (Windowing)

Calculate which notes are visible in current viewport.

```typescript
/**
 * Calculate indices of notes visible in current viewport
 * @param notePositions All positioned notes
 * @param config Staff configuration (includes scrollX and viewportWidth)
 * @returns Start and end indices of visible notes
 */
function calculateVisibleNoteIndices(
  notePositions: NotePosition[],
  config: StaffConfig
): {startIdx: number; endIdx: number} {
  const viewportLeft = config.scrollX - config.renderBuffer;
  const viewportRight = config.scrollX + config.viewportWidth + config.renderBuffer;
  
  // Binary search for start index
  let startIdx = 0;
  for (let i = 0; i < notePositions.length; i++) {
    if (notePositions[i].x >= viewportLeft) {
      startIdx = i;
      break;
    }
  }
  
  // Linear search for end index (from startIdx)
  let endIdx = notePositions.length;
  for (let i = startIdx; i < notePositions.length; i++) {
    if (notePositions[i].x > viewportRight) {
      endIdx = i;
      break;
    }
  }
  
  return {startIdx, endIdx};
}
```

---

## SMuFL Codepoints

### Essential Glyphs

| Symbol | SMuFL Name | Codepoint | Usage |
|--------|------------|-----------|-------|
| 𝄞 | gClef | U+E050 | Treble clef |
| 𝄢 | fClef | U+E062 | Bass clef |
| 𝄡 | cClef | U+E05C | Alto/Tenor clef |
| 𝅝 | noteheadWhole | U+E0A2 | Whole note |
| 𝅗𝅥 | noteheadHalf | U+E0A3 | Half note |
| ♩ | noteheadBlack | U+E0A4 | Quarter note (MVP default) |
| ♯ | accidentalSharp | U+E262 | Sharp |
| ♭ | accidentalFlat | U+E260 | Flat |
| ♮ | accidentalNatural | U+E261 | Natural |

### Font Loading

```typescript
// index.css or App.css
@font-face {
  font-family: 'Bravura';
  src: url('/fonts/Bravura.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: block; /* Ensure font loads before rendering */
}

.music-glyph {
  font-family: 'Bravura', serif;
  font-size: 40px; /* 4x staff space */
}
```

---

## State Management

### Component State

```typescript
// StaffNotation component (layout coordinator)
interface StaffNotationState {
  /** Current horizontal scroll position */
  scrollX: number;
  
  /** Selected note ID (null if no selection) */
  selectedNoteId: string | null;
  
  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
}
```

### Memoization Strategy

```typescript
// In StaffNotation component
const layout = useMemo(() => {
  return NotationLayoutEngine.calculateLayout({
    notes,
    clef,
    keySignature,
    timeSignature,
    config: {
      ...DEFAULT_STAFF_CONFIG,
      scrollX: state.scrollX,
      viewportWidth: state.viewport.width,
      viewportHeight: state.viewport.height
    }
  });
}, [notes, clef, keySignature, timeSignature, state.scrollX, state.viewport]);

// Recalculate only when dependencies change:
// - notes: when voice data changes
// - clef/keySignature/timeSignature: when structural events change
// - scrollX: when user scrolls (Y positions don't change)
// - viewport: when window resizes
```

---

## Invariants

### Layout Correctness

1. **Y-coordinate accuracy**: Vertical position error MUST be <1px from theoretical staff position (SC-003)
2. **Horizontal spacing**: Notes at same tick MUST have same X-coordinate (FR-012)
3. **Minimum spacing**: Adjacent notes MUST be at least `minNoteSpacing` pixels apart
4. **Ledger lines**: Notes with |staffPosition| > 4 MUST have appropriate ledger lines
5. **Fixed margin**: Clef and key signature MUST remain visible when `scrollX` > 0 (FR-022)

### Performance Invariants

1. **Layout calculation**: Pure function, deterministic output for same input
2. **Virtual scrolling**: Only notes with `viewportLeft - buffer < x < viewportRight + buffer` rendered
3. **Memoization**: Layout recalculated only when dependencies change, not on every render

---

## Testing Strategy

### Unit Tests for Layout Engine

```typescript
describe('NotationLayoutEngine', () => {
  describe('midiPitchToStaffPosition', () => {
    it('places middle C correctly in treble clef', () => {
      expect(midiPitchToStaffPosition(60, 'Treble')).toBe(-3.5);
      // Middle C is below treble staff
    });
    
    it('places middle C correctly in bass clef', () => {
      expect(midiPitchToStaffPosition(60, 'Bass')).toBe(5);
      // Middle C is above bass staff
    });
  });
  
  describe('calculateNotePositions', () => {
    it('enforces minimum spacing between adjacent notes', () => {
      const notes = [
        {start_tick: 0, pitch: 60},
        {start_tick: 10, pitch: 64} // Too close (10 ticks = 1px)
      ];
      const positions = calculateNotePositions(notes, 'Treble', DEFAULT_STAFF_CONFIG);
      
      expect(positions[1].x - positions[0].x).toBeGreaterThanOrEqual(15);
    });
  });
  
  describe('calculateLedgerLines', () => {
    it('adds ledger lines for notes below staff', () => {
      const positions = [{staffPosition: -2, x: 100, y: 80, ...}];
      const ledgers = calculateLedgerLines(positions);
      
      expect(ledgers).toHaveLength(1); // One ledger line at position 0
    });
  });
});
```

### Integration Tests

```typescript
describe('StaffNotation integration', () => {
  it('renders staff system with notes', () => {
    render(
      <StaffNotation
        notes={[{start_tick: 0, pitch: 60, duration_ticks: 960}]}
        clef={{tick: 0, clef_type: 'Treble'}}
        keySignature={{tick: 0, key: 'CMajor'}}
        timeSignature={{tick: 0, numerator: 4, denominator: 4}}
      />
    );
    
    expect(screen.getAllByTestId('staff-line')).toHaveLength(5);
    expect(screen.getByTestId('clef-symbol')).toBeInTheDocument();
    expect(screen.getAllByTestId('note-head')).toHaveLength(1);
  });
});
```

---

## Future Enhancements

### Not in MVP Scope

1. **Rhythmic notation**: Stems, beams, flags (requires duration-based glyph selection)
2. **Multiple voices on same staff**: Voice layering, stem direction, rest positioning
3. **Accidentals on notes**: Key signature context, accidental placement rules
4. **Dynamics and articulations**: Text positioning, curve rendering
5. **Grand staff**: Piano system with brace, multiple staves vertically aligned

These can be added in future iterations without breaking the current architecture.

---

**Data Model Complete**: All TypeScript interfaces, algorithms, and invariants defined. Ready for implementation.
