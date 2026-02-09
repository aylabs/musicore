# Data Model: Clef Notation Support in UI

**Feature**: 007-clef-notation  
**Date**: 2026-02-08  
**Phase**: Phase 1 - Data Model & Architecture Design

## Overview

Data structures and interfaces for displaying clef notation in the frontend staff renderer. This feature is primarily frontend presentation logic with minimal backend changes (API serialization enhancement).

---

## Domain Model (Backend - No Changes)

The backend domain model already supports clefs via Feature 006 (MusicXML Import). No modifications needed.

### ClefEvent (Existing)

**File**: `backend/src/domain/events/clef.rs`

```rust
/// Structural event that changes the active clef for a staff
/// at a specific tick position
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ClefEvent {
    /// Tick position where clef change occurs
    tick: Tick,
    
    /// New clef type
    clef: Clef,
}

impl ClefEvent {
    pub fn new(tick: Tick, clef: Clef) -> Self {
        Self { tick, clef }
    }
    
    pub fn tick(&self) -> Tick {
        self.tick
    }
    
    pub fn clef(&self) -> Clef {
        self.clef
    }
}
```

### Clef (Value Object - Existing)

**File**: `backend/src/domain/value_objects.rs`

```rust
/// Musical clef types determining pitch-to-staff-line mapping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum Clef {
    /// G-clef: G4 on second line from bottom
    Treble,
    
    /// F-clef: F3 on fourth line from bottom
    Bass,
    
    /// C-clef on middle line: C4 (middle C) on third line
    Alto,
    
    /// C-clef on fourth line: C4 (middle C) on fourth line from bottom
    Tenor,
}

impl Default for Clef {
    fn default() -> Self {
        Clef::Treble
    }
}
```

**Note**: `Serde` serialization already configured with `PascalCase` for JSON API responses (e.g., `"Treble"`, `"Bass"`).

---

## API Enhancement (Backend Adapter Layer)

### StaffResponse Enhancement

**File**: `backend/src/adapters/api/responses.rs` (or `models/staff.rs`)

**Current** (inferred structure):
```rust
#[derive(Serialize)]
pub struct StaffResponse {
    pub id: String,
    pub voices: Vec<VoiceResponse>,
    pub staff_structural_events: Vec<StaffStructuralEventResponse>,
}
```

**Enhanced** (add `active_clef` field):
```rust
#[derive(Serialize)]
pub struct StaffResponse {
    pub id: String,
    pub voices: Vec<VoiceResponse>,
    pub staff_structural_events: Vec<StaffStructuralEventResponse>,
    
    /// Active clef for this staff (derived from first ClefEvent or default)
    /// NEW in Feature 007
    pub active_clef: Clef,  // Serialized as "Treble", "Bass", "Alto", "Tenor"
}
```

**Derivation Logic**:
```rust
impl From<&Staff> for StaffResponse {
    fn from(staff: &Staff) -> Self {
        // Find first ClefEvent in staff_structural_events
        let active_clef = staff.staff_structural_events
            .iter()
            .find_map(|event| match event {
                StaffStructuralEvent::Clef(clef_event) => Some(clef_event.clef()),
                _ => None,
            })
            .unwrap_or(Clef::Treble);  // Default to Treble if no ClefEvent
        
        StaffResponse {
            id: staff.id.to_string(),
            voices: staff.voices.iter().map(VoiceResponse::from).collect(),
            staff_structural_events: staff.staff_structural_events.iter()
                .map(StaffStructuralEventResponse::from)
                .collect(),
            active_clef,  // NEW
        }
    }
}
```

**JSON Example** (API response):
```json
{
  "id": "staff-001",
  "voices": [...],
  "staff_structural_events": [
    {
      "type": "Clef",
      "tick": 0,
      "clef": "Bass"
    }
  ],
  "active_clef": "Bass"
}
```

---

## Frontend Types

### ClefType (Existing - Verify Alignment)

**File**: `frontend/src/types/score.ts`

```typescript
/**
 * Musical clef types (must match backend Clef enum)
 */
export type ClefType = 'Treble' | 'Bass' | 'Alto' | 'Tenor';
```

**Verification**: Ensure exact string match with backend `Clef` enum serialization.

---

## Frontend Layout Model

### ClefPosition (Existing)

**File**: `frontend/src/types/notation/layout.ts`

```typescript
/**
 * Position and rendering information for a clef symbol
 */
export interface ClefPosition {
  /** Clef type */
  type: ClefType;
  
  /** Horizontal position (pixels from left) */
  x: number;
  
  /** Vertical position (pixels from top) */
  y: number;
  
  /** SMuFL glyph Unicode codepoint */
  glyphCodepoint: string;
  
  /** Font size for rendering (pixels) */
  fontSize: number;
}
```

**Usage**: Returned by `NotationLayoutEngine.calculateClefPosition()` and consumed by `NotationRenderer`.

---

## Frontend Configuration

### SMUFL_CODEPOINTS Enhancement

**File**: `frontend/src/types/notation/config.ts`

**Current**:
```typescript
export const SMUFL_CODEPOINTS = {
  // Clefs
  TREBLE_CLEF: '\uE050',
  BASS_CLEF: '\uE062',
  ALTO_CLEF: '\uE05C',
  TENOR_CLEF: '\uE05C',  // ⚠️ INCORRECT: Using Alto glyph
  
  // Note heads
  WHOLE_NOTE: '\uE0A2',
  // ...
};
```

**Enhanced**:
```typescript
export const SMUFL_CODEPOINTS = {
  // Clefs (SMuFL Standard Music Font Layout)
  TREBLE_CLEF: '\uE050',   // gClef (G-clef on line 2)
  BASS_CLEF: '\uE062',     // fClef (F-clef on line 4)
  ALTO_CLEF: '\uE05C',     // cClef (C-clef on line 3)
  TENOR_CLEF: '\uE05D',    // 🟢 FIXED: cClefCombining + line 4 offset
  
  // Note heads
  WHOLE_NOTE: '\uE0A2',
  // ...
} as const;
```

**Rationale**: Tenor clef uses different glyph (U+E05D) per SMuFL spec, not same as Alto (U+E05C).

---

## Frontend Layout Engine Enhancement

### Note Positioning Diatonic Maps

**File**: `frontend/src/services/notation/NotationLayoutEngine.ts`

**Enhancement**: `midiPitchToStaffPosition()` function

**New Data Structures**:
```typescript
/**
 * Diatonic pitch mappings for Alto clef
 * Middle C (MIDI 60) = staff position 0 (middle line)
 * Reference: Alto clef places C4 on the middle line (line 3)
 */
const altoDiatonicMap = new Map<number, number>([
  // Octave 5
  [72, -12],  // C5
  [71, -11],  // B4
  [69, -10],  // A4 (top line)
  [67, -9],   // G4
  [65, -8],   // F4
  [64, -7],   // E4
  [62, -6],   // D4
  
  // Octave 4 (middle C region)
  [60, 0],    // C4 (middle C) - REFERENCE POINT (middle line)
  [59, 1],    // B3
  [57, 2],    // A3
  [55, 3],    // G3 (bottom line)
  [53, 4],    // F3
  [52, 5],    // E3
  [50, 6],    // D3
  
  // Octave 3
  [48, 7],    // C3
  // ... extend as needed
]);

/**
 * Diatonic pitch mappings for Tenor clef
 * Middle C (MIDI 60) = staff position 2 (fourth line from bottom)
 * Reference: Tenor clef places C4 on the fourth line (line 4)
 */
const tenorDiatonicMap = new Map<number, number>([
  // Octave 4
  [72, -10],  // C5
  [71, -9],   // B4
  [69, -8],   // A4
  [67, -7],   // G4
  [65, -6],   // F4
  [64, -5],   // E4 (top line)
  [62, -4],   // D4
  [60, 2],    // C4 (middle C) - REFERENCE POINT (fourth line)
  
  // Octave 3
  [59, 3],    // B3
  [57, 4],    // A3 (third line)
  [55, 5],    // G3
  [53, 6],    // F3 (second line)
  [52, 7],    // E3
  [50, 8],    // D3 (bottom line)
  [48, 9],    // C3
  // ... extend as needed
]);
```

**Updated Function Signature**:
```typescript
midiPitchToStaffPosition(pitch: number, clef: ClefType): number {
  // Select appropriate diatonic map based on clef
  const diatonicMap = clef === 'Treble' ? trebleDiatonicMap 
                    : clef === 'Bass' ? bassDiatonicMap
                    : clef === 'Alto' ? altoDiatonicMap
                    : tenorDiatonicMap;
  
  // Rest of algorithm unchanged (handles accidentals, octave offsets)
  if (diatonicMap.has(pitch)) {
    return diatonicMap.get(pitch)!;
  }
  
  // ... chromatic/accidental logic ...
}
```

---

## Clef Positioning Algorithm Enhancement

**File**: `frontend/src/services/notation/NotationLayoutEngine.ts`

**Current**: `calculateClefPosition()` centers clef vertically (works for Treble, incorrect for others)

**Enhanced**:
```typescript
/**
 * Clef-specific vertical offsets relative to staff center
 * Accounts for SMuFL glyph design and staff line alignment requirements
 * 
 * - Treble: Centered (G-line passes through curl of clef)
 * - Bass: Shifted down (F-line alignment with dots)
 * - Alto: Centered (middle line alignment for C-clef)
 * - Tenor: Shifted Slightly (fourth line alignment for C-clef)
 */
const CLEF_VERTICAL_OFFSETS: Record<ClefType, number> = {
  Treble: 0,      // No offset - centered works
  Bass: 0.5,      // Half staff space down for F-line alignment
  Alto: 0,        // No offset - middle line alignment
  Tenor: 0.5,     // Half staff space adjusted for fourth line
};

calculateClefPosition(clef: ClefType, config: StaffConfig): ClefPosition {
  const centerY = config.viewportHeight / 2;
  const offset = CLEF_VERTICAL_OFFSETS[clef] * config.staffSpace;
  
  // SMuFL codepoints (corrected for Tenor)
  const codepoints: Record<ClefType, string> = {
    Treble: SMUFL_CODEPOINTS.TREBLE_CLEF,
    Bass: SMUFL_CODEPOINTS.BASS_CLEF,
    Alto: SMUFL_CODEPOINTS.ALTO_CLEF,
    Tenor: SMUFL_CODEPOINTS.TENOR_CLEF,  // Now U+E05D (corrected)
  };
  
  return {
    type: clef,
    x: config.marginLeft / 2,
    y: centerY + offset,  // Apply vertical offset
    glyphCodepoint: codepoints[clef],
    fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
  };
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Backend Domain (Feature 006 - Existing)                         │
│                                                                  │
│  Staff                                                           │
│  ├── staff_structural_events: Vec<StaffStructuralEvent>         │
│  │   └── ClefEvent { tick: 0, clef: Bass }                      │
│  └── voices: Vec<Voice>                                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ API Serialization (Feature 007)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Response JSON                                                │
│                                                                  │
│  {                                                               │
│    "id": "staff-001",                                            │
│    "active_clef": "Bass",  ← NEW                                 │
│    "staff_structural_events": [...]                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Fetch & Parse
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend State (React)                                           │
│                                                                  │
│  score.instruments[0].staves[0].active_clef = "Bass"            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Pass to Component
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ StaffNotation Component                                          │
│                                                                  │
│  <StaffNotation                                                  │
│    notes={staff.voices[0].notes}                                 │
│    clef={staff.active_clef}  ← Passed as prop                    │
│  />                                                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Layout Calculation
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ NotationLayoutEngine.calculateLayout()                           │
│                                                                  │
│  ├── calculateClefPosition(clef) → ClefPosition                  │
│  │   ├── Selects SMUFL glyph: BASS_CLEF (U+E062)                │
│  │   └── Calculates y with vertical offset                       │
│  │                                                               │
│  └── For each note:                                              │
│      ├── midiPitchToStaffPosition(pitch, clef)                   │
│      │   └── Uses bassDiatonicMap for Bass clef                  │
│      └── Positions note at correct staff line/space              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Render SVG
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ NotationRenderer                                                 │
│                                                                  │
│  <svg>                                                           │
│    <text  ← Clef glyph                                           │
│      x={clef.x}                                                  │
│      y={clef.y}                                                  │
│      fontFamily="Bravura"                                        │
│    >                                                             │
│      {clef.glyphCodepoint}  // Bass clef symbol                  │
│    </text>                                                       │
│                                                                  │
│    <text> ← Note (positioned per bass clef)                      │
│      y={noteY}  // Calculated using bassDiatonicMap              │
│    />                                                            │
│  </svg>                                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Data Structures

### Unit Test Cases

**File**: `frontend/tests/unit/ClefPositioning.test.ts`

```typescript
describe('midiPitchToStaffPosition', () => {
  describe('Alto Clef', () => {
    it('positions middle C (MIDI 60) on middle line (position 0)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(60, 'Alto')).toBe(0);
    });
    
    it('positions A4 (MIDI 69) on top line (position -10)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(69, 'Alto')).toBe(-10);
    });
    
    it('positions G3 (MIDI 55) on bottom line (position 3)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(55, 'Alto')).toBe(3);
    });
  });
  
  describe('Tenor Clef', () => {
    it('positions middle C (MIDI 60) on fourth line (position 2)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(60, 'Tenor')).toBe(2);
    });
    
    it('positions E4 (MIDI 64) on top line (position -5)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(64, 'Tenor')).toBe(-5);
    });
    
    it('positions D3 (MIDI 50) on bottom line (position 8)', () => {
      expect(NotationLayoutEngine.midiPitchToStaffPosition(50, 'Tenor')).toBe(8);
    });
  });
});
```

---

## Migration & Backward Compatibility

### Backend API
- **Adding `active_clef` field**: Backward compatible (new field, no breaking changes)
- **Existing clients**: If frontend version doesn't expect `active_clef`, it will ignore the field
- **Default fallback**: Frontend defaults to `Treble` if field missing (supports old API versions)

### Frontend
- **Existing scores without clef data**: Display with Treble clef (current behavior)
- **New scores with clef data**: Display with correct clef (enhanced behavior)

---

## Performance Considerations

### Memory
- **Diatonic maps**: Static `Map<number, number>` structures (~200 bytes per clef type)
- **ClefPosition**: Single object per staff (~50 bytes)
- **Impact**: Negligible (< 1KB for 50-staff orchestral score)

### Rendering
- **Clef glyph**: Single SVG `<text>` element per staff (same as current)
- **Note positioning**: O(n) calculation, same complexity as current (just different mapping)
- **Impact**: No performance degradation

---

## Summary

- **Backend**: Add `active_clef` field to `StaffResponse` (minimal serialization change)
- **Frontend**: 
  - Fix `TENOR_CLEF` codepoint (U+E05D)
  - Add `altoDiatonicMap` and `tenorDiatonicMap` to layout engine
  - Apply vertical offsets in `calculateClefPosition()`
- **Data flow**: Backend → API JSON → Frontend State → Layout Engine → Renderer
- **Testing**: Unit tests for note positioning, visual regression tests for clef display
