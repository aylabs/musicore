# Phase 1: Data Model & Entities

**Feature**: Rust Layout Engine Engraving  
**Phase**: Design - Data Model (Phase 1)  
**Date**: 2025-02-12

## Core Entities

This feature works with the existing layout engine type system defined in `backend/src/layout/types.rs`. No new entities are needed - we're completing the implementation of existing structures.

### GlobalLayout (Existing - No Changes)

```rust
pub struct GlobalLayout {
    pub systems: Vec<System>,        // ✅ Already populated correctly
    pub total_width: f32,            // ✅ Already computed correctly
    pub total_height: f32,           // ✅ Already computed correctly
    pub units_per_space: f32,        // ✅ Already set from config
}
```

**Status**: This root entity is fully implemented. No changes required.

---

### System (Existing - Partially Implemented)

```rust
pub struct System {
    pub index: usize,                // ✅ Already set correctly
    pub bounding_box: BoundingBox,   // ✅ Already computed correctly
    pub staff_groups: Vec<StaffGroup>, // ❌ EMPTY - Feature 018 fixes this
    pub tick_range: TickRange,       // ✅ Already set correctly
}
```

**Status**: Structure is correct, but `staff_groups` array is empty in current implementation.

**Changes Required**: 
- Populate `staff_groups` with correctly structured `StaffGroup` instances
- Ensure each staff group contains positioned staves

---

### StaffGroup (Existing - Not Generated)

```rust
pub struct StaffGroup {
    pub instrument_id: String,       // ❌ Never populated
    pub staves: Vec<Staff>,          // ❌ Never populated
    pub bracket_type: BracketType,   // ❌ Never populated
}
```

**Status**: Type exists, but code never creates instances.

**Changes Required**:
- Extract instrument ID from input JSON
- Create one `StaffGroup` per instrument
- Set `bracket_type` based on staff count (Brace for piano, None for solo)
- Populate `staves` array with positioned staff content

---

### Staff (Existing - Partially Generated)

```rust
pub struct Staff {
    pub staff_lines: [StaffLine; 5],      // ⚠️ Generated but may have wrong coordinates
    pub glyph_runs: Vec<GlyphRun>,        // ⚠️ Generated but may be empty due to input bug
    pub structural_glyphs: Vec<Glyph>,    // ❌ TODO comment - never implemented
}
```

**Status**: Structure exists, partial implementation.

**Changes Required**:
- Verify `staff_lines` coordinates match fixture expectations (20 units apart, not 10)
- Ensure `glyph_runs` populated after fixing input format
- **Implement**: `structural_glyphs` array with clefs, time signatures, key signatures

---

### StaffLine (Existing - Working)

```rust
pub struct StaffLine {
    pub y_position: f32,    // ✅ Vertical position in logical units
    pub start_x: f32,       // ✅ Left edge (0.0)
    pub end_x: f32,         // ✅ Right edge (system width)
}
```

**Status**: Fully implemented, generates 5 lines correctly.

**Validation Required**: Ensure vertical spacing is 20 logical units (2 staff spaces), not 10.

---

### GlyphRun (Existing - Working)

```rust
pub struct GlyphRun {
    pub glyphs: Vec<Glyph>,       // ⚠️ May be empty due to input bug
    pub font_family: String,      // ✅ Set to "Bravura"
    pub font_size: f32,           // ✅ Set to 40.0
    pub color: Color,             // ✅ Set to black
}
```

**Status**: Batching logic works, but upstream glyph positioning may produce empty arrays.

**Changes Required**:
- Fix input parsing so `glyphs` array is populated with noteheads
- Add structural glyphs (clefs, signatures) to separate glyph run or inline

---

### Glyph (Existing - Partially Working)

```rust
pub struct Glyph {
    pub position: Point,                 // ⚠️ May have NaN/incorrect values
    pub bounding_box: BoundingBox,       // ⚠️ Computed from position
    pub codepoint: char,                 // ✅ U+E0A4 (noteheadBlack) works
    pub source_reference: SourceReference, // ✅ Correctly tracks event index
}
```

**Status**: Structure correct, positioning logic exists but may not work due to input bug.

**Changes Required**:
- Fix `pitch_to_y()` calculation to match frontend expectations
- Add SMuFL codepoints for structural glyphs (clefs: U+E050, time sigs: U+E080-U+E089, etc.)
- Ensure bounding boxes calculated correctly using SMuFL metrics

---

### Stem (New Entity - To Be Created)

**Purpose**: Represents a vertical line extending from a notehead

```rust
pub struct Stem {
    pub start: Point,        // Bottom of stem (or top if stem-down)
    pub end: Point,          // Top of stem (or bottom if stem-down)
    pub thickness: f32,      // Line thickness (typically 1 logical unit)
}
```

**Why New**: Stems are not first-class SMuFL glyphs - they're geometric primitives (lines). Frontend renders them differently from glyphs.

**Alternative Approach**: Encode stems as line glyphs in `structural_glyphs` array using special convention:
- Codepoint: U+0000 (reserved for non-glyph elements)
- Position: stem start
- Bounding box: encompasses full stem length

**Decision**: Use special glyph encoding (Alternative Approach) to avoid adding new entity types. Frontend checks for codepoint U+0000 and renders as line.

---

### Beam (New Entity - To Be Created)

**Purpose**: Represents horizontal beam connecting multiple eighth notes

```rust
pub struct Beam {
    pub start: Point,        // Left endpoint
    pub end: Point,          // Right endpoint  
    pub thickness: f32,      // Beam thickness (0.5 staff spaces = 5 logical units)
    pub beam_count: u8,      // 1 = eighth notes, 2 = sixteenth, etc.
}
```

**Why New**: Beams are complex geometric shapes (thick rectangles with slope).

**Alternative Approach**: Encode beams as rectangular glyphs:
- Codepoint: U+0001 (reserved for beam elements)
- Position: left endpoint
- Bounding box: width = beam length, height = thickness

**Decision**: Use special glyph encoding (Alternative Approach) for consistency with stem approach.

---

## Entity Relationships

```
GlobalLayout (1)
  └── Systems (1..N)
      ├── bounding_box: BoundingBox (1)
      ├── tick_range: TickRange (1)
      └── staff_groups: StaffGroup (0..N) ← Currently empty, Feature 018 populates this
          ├── instrument_id: String
          ├── bracket_type: BracketType
          └── staves: Staff (1..N)
              ├── staff_lines: [StaffLine; 5]
              ├── glyph_runs: GlyphRun (0..N)
              │   └── glyphs: Glyph (1..N)
              │       ├── position: Point
              │       ├── bounding_box: BoundingBox
              │       ├── codepoint: char (SMuFL or special: U+0000=stem, U+0001=beam)
              │       └── source_reference: SourceReference
              └── structural_glyphs: Glyph (0..N)
                  └── [clefs, time signatures, key signatures at system start]
```

**Key Insight**: The entity model is already correct! Feature 018 doesn't add new types - it completes the population of existing structures.

---

## Data Flow

### Input: Score JSON

```json
{
  "instruments": [
    {
      "id": "violin-1",
      "staves": [
        {
          "clef": "Treble",
          "voices": [
            {
              "notes": [  // ← Frontend sends this
                {"tick": 0, "duration": 960, "pitch": 60}
              ],
              "interval_events": [  // ← OR this (CompiledScore format)
                {"start_tick": {"value": 0}, "duration_ticks": 960, "pitch": {"value": 60}}
              ]
            }
          ]
        }
      ]
    }
  ],
  "tempo_changes": [...],
  "time_signature_changes": [...]
}
```

**Problem**: Current `extract_instruments()` only checks `interval_events`, ignores `notes`.

**Solution**: Check for `notes` first (simplified format), fall back to `interval_events`.

---

### Processing: Layout Computation

1. **Extract measures** (`extract_measures()`) - Already works
2. **Compute measure widths** (`spacer::compute_measure_width()`) - Already works
3. **Break into systems** (`breaker::break_into_systems()`) - Already works
4. **For each system**:
   a. Extract instruments from input - ⚠️ **Needs fix** (format mismatch)
   b. For each instrument → create `StaffGroup`
   c. For each staff in instrument:
      - Create 5 `StaffLine` instances - ⚠️ **Verify spacing**
      - Position noteheads → `Glyph` instances - ⚠️ **May fail if no notes extracted**
      - **Add**: Position structural glyphs (clefs, signatures) - ❌ **Not implemented**
      - **Add**: Generate stems for noteheads - ❌ **Not implemented**
      - **Add**: Generate beams connecting eighth notes - ❌ **Not implemented**
      - Batch glyphs into `GlyphRun` instances - ✅ **Works**
      - Create `Staff` instance with lines, runs, structural glyphs
   d. Add `StaffGroup` to system
5. **Compute total dimensions** - Already works

---

### Output: GlobalLayout JSON

```json
{
  "systems": [
    {
      "index": 0,
      "bounding_box": {"x_position": 0, "y_position": 0, "width": 1200, "height": 200},
      "staff_groups": [  // ← Currently empty, Feature 018 populates
        {
          "instrument_id": "violin-1",
          "bracket_type": "None",
          "staves": [
            {
              "staff_lines": [
                {"y_position": 0, "start_x": 0, "end_x": 1200},
                {"y_position": 20, "start_x": 0, "end_x": 1200},  // ← 20 units apart, not 10
                {"y_position": 40, "start_x": 0, "end_x": 1200},
                {"y_position": 60, "start_x": 0, "end_x": 1200},
                {"y_position": 80, "start_x": 0, "end_x": 1200}
              ],
              "glyph_runs": [
                {
                  "glyphs": [
                    {
                      "position": {"x": 100, "y": 40},
                      "bounding_box": {"x_position": 95, "y_position": 35, "width": 10, "height": 10},
                      "codepoint": "\\uE0A4",  // SMuFL noteheadBlack
                      "source_reference": {"instrument_id": "violin-1", "staff_index": 0, "voice_index": 0, "event_index": 0}
                    }
                  ],
                  "font_family": "Bravura",
                  "font_size": 40.0,
                  "color": {"r": 0, "g": 0, "b": 0, "a": 255}
                }
              ],
              "structural_glyphs": [  // ← Currently empty, Feature 018 adds these
                {
                  "position": {"x": 20, "y": 40},
                  "codepoint": "\\uE050",  // Treble clef
                  "bounding_box": {...}
                }
              ]
            }
          ]
        }
      ],
      "tick_range": {"start_tick": 0, "end_tick": 3840}
    }
  ],
  "total_width": 1200,
  "total_height": 220,
  "units_per_space": 20  // ← Config value, not 10
}
```

---

## Critical Discovery: Staff Line Spacing Issue

**Problem**: Current implementation may generate staff lines 10 logical units apart:

```rust
let y_position = staff_vertical_offset + (line_index as f32 * 2.0 * units_per_space);
```

If `units_per_space = 10.0`, spacing = 20 units ✅  
If `units_per_space = 20.0`, spacing = 40 units ❌

**Root Cause**: `units_per_space` is configurable, but frontend fixtures use `units_per_space: 20` while code assumes `10`.

**Solution**: Verify default config and fixture expectations align. Document that 1 staff space = 2 lines * `units_per_space`.

---

## Validation Checklist

- [ ] `staff_groups` array populated for every system
- [ ] Each staff has exactly 5 staff lines with correct spacing
- [ ] `glyph_runs` contains positioned noteheads (after input fix)
- [ ] `structural_glyphs` contains clefs, time signatures, key signatures
- [ ] SMuFL codepoints are valid (U+E000-U+F8FF range)
- [ ] Bounding boxes calculated using SMuFL metrics
- [ ] Output JSON matches violin_10_measures.json structure
- [ ] Deterministic output (same input = identical JSON)

---

**Phase 1 Data Model Complete**: All entities documented. Ready to define contracts.
