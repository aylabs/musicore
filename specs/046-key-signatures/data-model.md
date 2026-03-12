# Data Model: Key Signatures

**Branch**: `046-key-signatures` | **Date**: 2026-03-12

## Overview

No new domain entities are introduced by this feature. All data model entities already exist in the codebase. This document describes the relevant entities and their relationships, and the layout-level data shapes that need fixing.

---

## Domain Entities (Backend — No Changes)

### KeySignature
**File**: `backend/src/domain/value_objects.rs`

```rust
pub struct KeySignature(i8);
// Range: -7 (7 flats) to +7 (7 sharps), 0 = C major / A minor
// Serializes as: JSON number (e.g., 1 for G major, -3 for Eb major)
```

**Valid values**:

| Value | Key (Major) | Key (Minor) | Accidentals |
|-------|-------------|-------------|-------------|
| -7 | Cb major | Ab minor | 7 flats |
| -6 | Gb major | Eb minor | 6 flats |
| -5 | Db major | Bb minor | 5 flats |
| -4 | Ab major | F minor | 4 flats |
| -3 | Eb major | C minor | 3 flats |
| -2 | Bb major | G minor | 2 flats |
| -1 | F major | D minor | 1 flat |
| 0 | C major | A minor | none |
| +1 | G major | E minor | 1 sharp |
| +2 | D major | B minor | 2 sharps |
| +3 | A major | F# minor | 3 sharps |
| +4 | E major | C# minor | 4 sharps |
| +5 | B major | G# minor | 5 sharps |
| +6 | F# major | D# minor | 6 sharps |
| +7 | C# major | A# minor | 7 sharps |

### KeySignatureEvent
**File**: `backend/src/domain/events/key_signature.rs`

```rust
pub struct KeySignatureEvent {
    pub tick: Tick,        // Position in timeline (960 PPQ)
    pub key: KeySignature, // The key signature value
}
// Serializes as: { "tick": 0, "key": 1 }
```

### StaffStructuralEvent (variant)
**File**: `backend/src/domain/events/staff.rs`

```rust
pub enum StaffStructuralEvent {
    Clef(ClefEvent),
    KeySignature(KeySignatureEvent),
}
// Serializes as: { "KeySignature": { "tick": 0, "key": 1 } }
```

### Staff (host)
**File**: `backend/src/domain/staff.rs`

The `Staff` aggregate stores `Vec<StaffStructuralEvent>` and provides:
- `add_key_signature_event(event)` — adds with duplicate-tick validation
- `get_key_signature_at(tick)` — queries active key signature at a given tick
- `remove_key_signature_event(tick)` — removes (tick 0 protected)
- Every staff is initialized with `KeySignatureEvent { tick: 0, key: KeySignature(0) }` (C major)

---

## Layout-Level Data Shapes (Rust Layout Engine — Changes Needed)

### StaffData (internal, layout engine input)
**File**: `backend/src/layout/mod.rs:852`

```rust
struct StaffData {
    voices: Vec<VoiceData>,
    clef: String,       // "Treble" | "Bass" | "Alto" | "Tenor"
    time_numerator: u8,
    time_denominator: u8,
    key_sharps: i8,     // Already correctly populated from JSON input
}
```

`key_sharps` is already extracted from the JSON passed by `LayoutView.tsx`:
```rust
// mod.rs:938
let key_sharps = staff["key_signature"]["sharps"].as_i64().unwrap_or(0) as i8;
```

### AccidentalPosition (in `structural_glyphs` output)
Key signature accidentals are rendered as `Glyph` objects within `structural_glyphs: Vec<Glyph>`. There is no separate "AccidentalPosition" type — they share the same `Glyph` struct as clef and time signature glyphs.

```rust
// backend/src/layout/types.rs
pub struct Glyph {
    pub position: Point,              // (x, y) in logical units, system-relative
    pub bounding_box: BoundingBox,    // hit-testing rect
    pub codepoint: String,            // SMuFL: "\u{E262}" = sharp, "\u{E260}" = flat
    pub source_reference: SourceReference,
}
```

For key signature accidentals, `source_reference` uses `instrument_id: "structural"` (as currently implemented).

---

## Frontend Type Alignment (Changes Needed)

### Current (Broken)
**File**: `frontend/src/types/score.ts:20`

```typescript
// WRONG: backend serializes KeySignature(i8) as a number, not a named string
export type KeySignature =
  | "CMajor" | "GMajor" | "DMajor" | ...;

export interface KeySignatureEvent {
  tick: Tick;
  key: KeySignature;  // runtime value is a number, type says string
}
```

### Target (Correct)
```typescript
// KeySignature is the i8 value serialized directly from Rust newtype struct
export type KeySignature = number;  // -7 (7 flats) to +7 (7 sharps)

export interface KeySignatureEvent {
  tick: Tick;
  key: KeySignature;  // now correctly typed as number
}
```

### Impact on LayoutView.tsx Extraction
**File**: `frontend/src/components/layout/LayoutView.tsx:127–154`

```typescript
// Before (broken for non-C-major; keyMap[number] is undefined):
const keySig = firstKeySigEvent.KeySignature.key;
keySharps = keyMap[keySig] || 0;

// After (correct; use numeric value directly):
const keySig = firstKeySigEvent.KeySignature.key;
keySharps = typeof keySig === 'number' 
  ? keySig 
  : (keyMap[keySig as string] ?? 0);
// The keyMap fallback handles any legacy format; primary path uses number directly.
```

The entire `keyMap` constant can be removed or retained as dead-code-safe fallback — removing is preferred for cleanliness once the type is corrected.

---

## Relationships

```
Score
└── instruments[]
    └── staves[]
        ├── staff_structural_events[]
        │   └── KeySignature { tick, key: i8 }   ← domain model (no changes)
        └── [collapsed into StaffData for layout]
            ├── clef: String                       ← already used
            └── key_sharps: i8                     ← already populated, correctly

StaffData → position_key_signature(key_sharps, clef, x_start, ...)
         → Vec<Glyph>  (accidental positions)
         → LayoutStaff.structural_glyphs           ← already rendered by LayoutRenderer
```

---

## State Transitions (Not Applicable)

This feature does not introduce new state transitions. Key signature data follows the same storage and retrieval patterns already established by `ClefEvent` and `TempoEvent`.
