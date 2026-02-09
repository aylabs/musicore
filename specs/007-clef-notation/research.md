# Research: Clef Notation Support in UI

**Feature**: 007-clef-notation  
**Date**: 2026-02-08  
**Phase**: Phase 0 - Research & Technology Selection

## Overview

Research findings for implementing visual clef notation display in the frontend staff notation renderer. Primary goal: enable correct display of bass clef, alto clef, and tenor clef symbols with accurate note positioning.

## Research Areas

### 1. Music Font Libraries for Clef Rendering

**Requirement**: Render standard music notation clef symbols (treble, bass, alto, tenor) that are visually clear, scalable, and recognizable to musicians.

#### Decision: Use Bravura Font with SMuFL Standard

**Rationale**:
- **SMuFL (Standard Music Font Layout)** is the industry standard for music notation fonts
- **Bravura** font (by Steinberg) is open-source, comprehensive, and widely adopted
- Already integrated in project (Feature 002 - Staff Notation View)
- Provides all required clef glyphs with correct Unicode codepoints

**SMuFL Codepoints for Clefs**:
- Treble Clef (G-clef): U+E050 (`\uE050`)
- Bass Clef (F-clef): U+E062 (`\uE062`)
- Alto Clef (C-clef): U+E05C (`\uE05C`)
- Tenor Clef (C-clef): U+E05D (`\uE05D`) - **NOTE: Different from Alto!**

**Alternatives Considered**:
1. **Custom SVG Paths**: Rejected - complex to maintain, not scalable, poor browser performance
2. **FreeSerif Music Symbols**: Rejected - inconsistent glyph quality, limited clef coverage
3. **MuseScore/LilyPond Fonts**: Rejected - licensing concerns, not SMuFL-compliant

**Verification**: Current `frontend/src/types/notation/config.ts` already defines SMUFL_CODEPOINTS. Needs update:
```typescript
const SMUFL_CODEPOINTS = {
  TREBLE_CLEF: '\uE050',  // Correct
  BASS_CLEF: '\uE062',    // Correct
  ALTO_CLEF: '\uE05C',    // Correct
  TENOR_CLEF: '\uE05D',   // VERIFY: Currently may be using E05C (Alto glyph)
};
```

---

### 2. Note Positioning Logic for Alto and Tenor Clefs

**Requirement**: Calculate correct staff line position for MIDI pitches based on active clef type.

#### Decision: Extend Existing `midiPitchToStaffPosition()` Algorithm

**Current State** (`NotationLayoutEngine.ts`):
- ✅ Treble Clef: Fully implemented with diatonic pitch mappings
- ✅ Bass Clef: Fully implemented with diatonic pitch mappings
- ❌ Alto Clef: Not implemented (falls back to error or default)
- ❌ Tenor Clef: Not implemented

**Approach**: Add diatonic mappings for Alto and Tenor clefs following existing pattern.

**Alto Clef Reference Points**:
- Middle C (MIDI 60 / C4): Staff position 0 (middle line of 5-line staff)
- Staff line positions relative to middle C:
  - Line 5 (top): A4 (MIDI 69)
  - Space 4: G4 (MIDI 67)
  - Line 4: F4 (MIDI 65)
  - Space 3: E4 (MIDI 64)
  - Line 3: **D4 (MIDI 62)** 
  - Space 2: **C4 (MIDI 60)** ← Middle C (center reference)
  - Line 2: B3 (MIDI 59)
  - Space 1: A3 (MIDI 57)
  - Line 1 (bottom): G3 (MIDI 55)

**Tenor Clef Reference Points**:
- Middle C (MIDI 60 / C4): Staff position +2 (fourth line from bottom)
- Staff line positions relative to middle C:
  - Line 5 (top): E4 (MIDI 64)
  - Space 4: D4 (MIDI 62)
  - Line 4: **C4 (MIDI 60)** ← Middle C (fourth line reference)
  - Space 3: B3 (MIDI 59)
  - Line 3: A3 (MIDI 57)
  - Space 2: G3 (MIDI 55)
  - Line 2: F3 (MIDI 53)
  - Space 1: E3 (MIDI 52)
  - Line 1 (bottom): D3 (MIDI 50)

**Implementation Pattern** (following Treble/Bass precedent):
```typescript
midiPitchToStaffPosition(pitch: number, clef: ClefType): number {
  // Existing trebleDiatonicMap and bassDiatonicMap
  
  // NEW: Alto clef diatonic map (middle C = 0)
  const altoDiatonicMap = new Map<number, number>([
    [60, 0],   // C4 (middle C) = middle line
    [62, -1],  // D4 = space  above
    [64, -2],  // E4 = line above
    // ... complete mapping
  ]);
  
  // NEW: Tenor clef diatonic map (middle C = +2, fourth line)
  const tenorDiatonicMap = new Map<number, number>([
    [60, 2],   // C4 (middle C) = fourth line
    [59, 3],   // B3 = space below
    [57, 4],   // A3 = line below
    // ... complete mapping
  ]);
  
  const diatonicMap = clef === 'Treble' ? trebleDiatonicMap 
                    : clef === 'Bass' ? bassDiatonicMap
                    : clef === 'Alto' ? altoDiatonicMap
                    : tenorDiatonicMap;
  // ... rest of algorithm unchanged
}
```

**Alternatives Considered**:
1. **Algorithmic Offset Calculation**: Rejected - less readable than explicit mappings, error-prone for C-clef variants
2. **External Library (VexFlow, abcjs)**: Rejected - adds 200KB+ bundle size for single algorithm, constitution violation (unnecessary dependency)
3. **Server-Side Calculation**: Rejected - violates hexagonal architecture (presentation concern handled in domain)

---

### 3. Clef Glyph Positioning and Vertical Alignment

**Requirement**: Position clef glyphs on staff so they appear at correct vertical location (e.g., bass clef curls around F-line).

#### Decision: Use Fixed Vertical Centering with Manual Offset Adjustments

**Current Approach** (`NotationLayoutEngine.calculateClefPosition()`):
```typescript
return {
  type: clef,
  x: config.marginLeft / 2,     // Horizontal: left margin center
  y: centerY,                    // Vertical: staff center
  glyphCodepoint: codepoints[clef],
  fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
};
```

**Problem**: `centerY` (staff vertical center) works for Treble but not for Bass/Alto/Tenor which have specific staff line alignments.

**Solution**: Add clef-specific vertical offsets based on SMuFL glyph design:
```typescript
const clefOffsets: Record<ClefType, number> = {
  Treble: 0,              // Centered (G-line passes through curl)
  Bass: config.staffSpace * 0.5,   // Shifted down (F-line alignment)
  Alto: 0,                // Centered (middle C on middle line)
  Tenor: config.staffSpace * 0.5,  // Shifted (middle C on fourth line)
};

return {
  type: clef,
  x: config.marginLeft / 2,
  y: centerY + clefOffsets[clef],  // Apply offset
  glyphCodepoint: codepoints[clef],
  fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
};
```

**Verification Method**: Visual regression tests with real musician review of staff line alignment.

**Alternatives Considered**:
1. **Bounding Box Calculation**: Rejected - requires font metrics parsing, overly complex
2. **SVG Path Anchoring**: Rejected - requires custom SVG, no longer using font glyphs
3. **Per-Zoom Adjustment**: Rejected - should scale proportionally with font size

---

### 4. Backend API Clef Serialization

**Requirement**: Ensure backend API returns clef information for each staff so frontend knows which clef to display.

####Decision: Enhance Staff Serialization to Include Active Clef

**Current State**: Backend `Staff` struct has `staff_structural_events: Vec<StaffStructuralEvent>` which includes `ClefEvent`. However, API serialization may not explicitly surface current active clef.

**Approach**: Add `active_clef` field to `StaffResponse` JSON:
```rust
// backend/src/models/staff.rs (or adapter layer)
#[derive(Serialize)]
struct StaffResponse {
    id: String,
    voices: Vec<VoiceResponse>,
    staff_structural_events: Vec<StaffStructuralEventResponse>,  // Includes ClefEvents
    active_clef: ClefType,  // NEW: Current clef for this staff (first ClefEvent)
}
```

**Backward Compatibility**: Frontend defaults to `Treble` if `active_clef` missing (graceful degradation).

**Alternatives Considered**:
1. **Frontend Parsing of ClefEvents**: Rejected - duplicates domain logic in UI, violates hexagonal architecture
2. **Separate Clef Endpoint**: Rejected - increases API calls, latency
3. **GraphQL Resolver**: Rejected - project uses REST, not GraphQL

---

### 5. Clef Change Handling (Mid-Piece)

**Requirement**: Support clef changes within a piece (User Story 3, Priority P3).

#### Decision: Phase 2 Enhancement - Defer to Post-MVP

**Rationale**:
- User Story 3 (clef changes) has P3 priority - less common scenario
- P1 (bass clef) and P2 (alto/tenor) provide 90% of value
- Implementation complexity: requires time-based clef tracking, measure-aware rendering

**Future Approach** (when implemented):
```typescript
interface ClefChangeEvent {
  measure: number;
  beat: number;
  newClef: ClefType;
}

// NotationLayoutEngine tracks active clef per note position
let activeClef = initialClef;
for (const note of notes) {
  // Check if clef change occurs before this note
  const change = clefChanges.find(c => c.tick <= note.tick);
  if (change) activeClef = change.newClef;
  
  // Position note with active clef
  const staffPos = midiPitchToStaffPosition(note.pitch, activeClef);
}
```

**Alternatives Considered**:
1. **Implement in Phase 1**: Rejected - increases risk, delays P1/P2 value delivery
2. **No Clef Changes Ever**: Rejected - would limit advanced repertoire support

---

## Technology Selection Summary

| Component | Selected Technology | Rationale |
|-----------|---------------------|-----------|
| Music Font | Bravura (SMuFL) | Already integrated, industry standard, comprehensive |
| Note Positioning | Enhanced NotationLayoutEngine | Follows existing pattern, pure TypeScript functions |
| Clef Glyphs | SVG `<text>` with font glyphs | Existing approach, scalable, performant |
| API Enhancement | Add `active_clef` to StaffResponse | Minimal backend change, backward compatible |
| Clef Changes | Deferred to Phase 2 | P3 priority, reduces initial complexity |

---

## Outstanding Questions

### Resolved
- ✅ Which music font to use? → Bravura (already integrated)
- ✅ How to position notes for Alto/Tenor? → Extend existing diatonic mapping algorithm
- ✅ Does backend API return clef data? → Needs enhancement (add `active_clef` field)
- ✅ How to handle clef changes? → Phase 2 (post-MVP)

### None Remaining
All technical decisions finalized. Ready for Phase 1 (Data Model & Contracts).

---

## References

- **SMuFL Specification**: https://w3c.github.io/smufl/latest/
- **Bravura Font Documentation**: https://github.com/steinbergmedia/bravura
- **Music Notation Reference**: "Behind Bars" by Elaine Gould (clef positioning standards)
- **Existing Codebase**:
  - `frontend/src/services/notation/NotationLayoutEngine.ts` (note positioning)
  - `frontend/src/components/notation/NotationRenderer.tsx` (clef rendering)
  - `frontend/src/types/notation/config.ts` (SMUFL codepoints)
  - `backend/src/domain/events/clef.rs` (ClefEvent domain model)
