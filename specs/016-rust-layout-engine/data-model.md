# Data Model: Rust Layout Engine

**Feature**: 016-rust-layout-engine  
**Date**: 2026-02-12  
**Status**: Phase 1 Complete

## Overview

The layout engine transforms a CompiledScore (music domain model) into a spatial model (layout domain model). This document defines all entities, relationships, and field semantics.

## Entity Hierarchy

```
GlobalLayout (root)
└── System[] (1-N systems, virtualization boundary)
    └── StaffGroup[] (1-N groups, multi-staff instruments)
        └── Staff[] (1-2 staves per group)
            ├── StaffLine[5] (exactly 5 horizontal lines)
            ├── GlyphRun[] (batched glyphs for rendering)
            │   └── Glyph[] (1-N musical symbols)
            └── Glyph[] (structural glyphs: clefs, key sigs, time sigs)
```

**Relationships**:
- GlobalLayout **aggregates** Systems (owns lifetime)
- System **aggregates** StaffGroups (owns lifetime)
- StaffGroup **aggregates** Staves (owns lifetime)
- Staff **aggregates** GlyphRuns and Structural Glyphs (owns lifetime)
- GlyphRun **aggregates** Glyphs (owns lifetime)
- Glyph **references** CompiledScore via SourceReference (readonly link)

---

## Entity Definitions

### GlobalLayout

**Purpose**: Root container for entire score layout. Single instance per score.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalLayout {
    pub systems: Vec<System>,
    pub total_width: f32,
    pub total_height: f32,
    pub units_per_space: f32,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `systems` | `Vec<System>` | Ordered array of systems from top to bottom | Non-empty (at least 1 system) |
| `total_width` | `f32` | Width of widest system in logical units | Positive, typically 600-800 |
| `total_height` | `f32` | Sum of all system heights + inter-system spacing | Positive, grows with measure count |
| `units_per_space` | `f32` | Scaling factor: how many logical units = 1 staff space | Default: 10.0, must be positive |

**Invariants**:
- `systems.len() >= 1`: Empty scores not allowed (must have at least 1 empty system)
- `total_width == systems.iter().map(|s| s.bounding_box.width).max()`: Width matches widest system
- `units_per_space > 0.0`: Must be positive for coordinate translation

**Usage**:
- Renderer queries `total_width × total_height` to set scrollable canvas size
- Viewport intersection checks against `systems[].bounding_box` for virtualization

---

### System

**Purpose**: Contains 1-N measures of music arranged horizontally. Primary virtualization boundary.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct System {
    pub index: usize,
    pub bounding_box: BoundingBox,
    pub staff_groups: Vec<StaffGroup>,
    pub tick_range: TickRange,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `index` | `usize` | 0-based system number | Sequential: 0, 1, 2, ... |
| `bounding_box` | `BoundingBox` | Screen region occupied by system | Non-negative dimensions |
| `staff_groups` | `Vec<StaffGroup>` | Instruments/staff groups in this system | Non-empty (piano = 1 group, orchestra = 8+ groups) |
| `tick_range` | `TickRange` | Musical time span covered by system | start_tick < end_tick, aligned to measure boundaries |

**Invariants**:
- `staff_groups.len() >= 1`: System needs at least one staff group
- `tick_range.start_tick % (4 * 960) == 0`: Systems start at measure boundaries (4/4 assumption)
- `tick_range.end_tick > tick_range.start_tick`: Must contain non-zero time span

**Usage**:
- Renderer checks `if viewport.intersects(system.bounding_box)` to decide rendering
- Click handler queries `system.tick_range` to find which system contains measure N

---

### StaffGroup

**Purpose**: Groups related staves for multi-staff instruments. Piano has 2 staves (treble + bass), solo instruments have 1.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffGroup {
    pub instrument_id: String,
    pub staves: Vec<Staff>,
    pub bracket_type: BracketType,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `instrument_id` | `String` | Links to `CompiledScore.Instrument.id` | Must match existing instrument |
| `staves` | `Vec<Staff>` | 1-2 staves (piano = 2, violin = 1) | 1 ≤ len ≤ 2 for MVP |
| `bracket_type` | `BracketType` | Visual grouping indicator | Enum: Brace, Bracket, None |

**Invariants**:
- `staves.len() >= 1 && staves.len() <= 2`: MVP supports up to 2 staves per group
- `instrument_id` must exist in original `CompiledScore.instruments[]`

**Usage**:
- Renderer draws brace/bracket connecting staves based on `bracket_type`
- Layout uses `instrument_id` to fetch instrument-specific settings (transposition, clef defaults)

---

### Staff

**Purpose**: Single 5-line staff with positioned glyphs.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Staff {
    pub staff_lines: [StaffLine; 5],
    pub glyph_runs: Vec<GlyphRun>,
    pub structural_glyphs: Vec<Glyph>,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `staff_lines` | `[StaffLine; 5]` | Exactly 5 horizontal lines (standard staff) | Fixed array, y_positions evenly spaced |
| `glyph_runs` | `Vec<GlyphRun>` | Batched glyphs for efficient rendering | May be empty (whole rest measure) |
| `structural_glyphs` | `Vec<Glyph>` | Clefs, key signatures, time signatures at staff start | Drawn before glyph_runs |

**Invariants**:
- `staff_lines.len() == 5`: Always exactly 5 lines
- `staff_lines[i].y_position < staff_lines[i+1].y_position`: Lines go top-to-bottom
- `staff_lines[i+1].y_position - staff_lines[i].y_position == units_per_space`: Evenly spaced

**Usage**:
- Renderer draws 5 horizontal lines using `staff_lines[].y_position`
- Pitch-to-y calculation uses `staff_lines[2]` (middle line) as reference

---

### StaffLine

**Purpose**: Single horizontal line in a staff.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffLine {
    pub y_position: f32,
    pub start_x: f32,
    pub end_x: f32,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `y_position` | `f32` | Vertical position in logical units (system-relative) | Positive, increases downward |
| `start_x` | `f32` | Left edge of line in logical units | Non-negative |
| `end_x` | `f32` | Right edge of line in logical units | > start_x |

**Invariants**:
- `end_x > start_x`: Line must have positive width
- `y_position >= 0.0`: Coordinates relative to system top

**Usage**:
- Renderer draws line from `(start_x, y_position)` to `(end_x, y_position)`
- Layout uses `y_position` to calculate notehead positions (pitch mapping)

---

### GlyphRun

**Purpose**: Batches consecutive glyphs with identical drawing properties for efficient rendering.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyphRun {
    pub glyphs: Vec<Glyph>,
    pub font_family: String,
    pub font_size: f32,
    pub color: Color,
    pub opacity: f32,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `glyphs` | `Vec<Glyph>` | All glyphs in this batch | Non-empty (at least 1 glyph) |
| `font_family` | `String` | Font name (typically "Bravura") | Non-empty string |
| `font_size` | `f32` | Font size in logical units | Positive, typically 40.0 (4 staff spaces) |
| `color` | `Color` | RGBA color for all glyphs | Alpha component used for transparency |
| `opacity` | `f32` | Additional opacity multiplier | Range [0.0, 1.0] |

**Invariants**:
- `glyphs.len() >= 1`: Empty runs not allowed
- `font_size > 0.0`: Must be positive
- `0.0 <= opacity <= 1.0`: Valid opacity range

**Usage**:
- Canvas renderer: `ctx.fillStyle = color; glyphs.forEach(g => ctx.fillText(g.codepoint, g.x, g.y))`
- WebGL renderer: Single draw call with instanced rendering

---

### Glyph

**Purpose**: Single drawable musical symbol with position and source linkage.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Glyph {
    pub position: Point,
    pub bounding_box: BoundingBox,
    pub codepoint: char,
    pub source_reference: SourceReference,
}
```

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `position` | `Point` | (x, y) coordinates in logical units (system-relative) | Non-negative |
| `bounding_box` | `BoundingBox` | Hit-testing rectangle including ledger lines | Contains position as top-left |
| `codepoint` | `char` | SMuFL Unicode codepoint (e.g., U+E0A4 = quarter notehead) | Valid Unicode scalar |
| `source_reference` | `SourceReference` | Link back to CompiledScore element | Must resolve to existing event |

**Invariants**:
- `position.x >= 0.0 && position.y >= 0.0`: Valid coordinate space
- `bounding_box.contains(position)`: Bounding box includes glyph origin
- `codepoint` is valid SMuFL codepoint (U+E000 - U+F8FF range)

**Usage**:
- Renderer draws glyph at `position` using `codepoint`
- Click handler: `if bounding_box.contains(click_pos)` → highlight via `source_reference`

---

## Supporting Types

### BoundingBox

**Purpose**: Rectangular hit-testing and clipping region.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}
```

**Methods**:
```rust
impl BoundingBox {
    pub fn contains(&self, point: &Point) -> bool {
        point.x >= self.x && point.x <= self.x + self.width &&
        point.y >= self.y && point.y <= self.y + self.height
    }
    
    pub fn intersects(&self, other: &BoundingBox) -> bool {
        !(self.x + self.width < other.x || other.x + other.width < self.x ||
          self.y + self.height < other.y || other.y + other.height < self.y)
    }
}
```

---

### Point

**Purpose**: 2D coordinate in logical units.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}
```

---

### TickRange

**Purpose**: Musical time span using 960 PPQ resolution.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TickRange {
    pub start_tick: u32,
    pub end_tick: u32,
}
```

**Invariants**:
- `end_tick > start_tick`: Must represent positive time span

---

### SourceReference

**Purpose**: Links layout glyphs back to CompiledScore domain entities.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceReference {
    pub instrument_id: String,
    pub staff_index: usize,
    pub voice_index: usize,
    pub event_index: usize,
}
```

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `instrument_id` | `String` | CompiledScore instrument identifier |
| `staff_index` | `usize` | Staff number within instrument (0 = treble, 1 = bass for piano) |
| `voice_index` | `usize` | Voice number within staff (0-3 for polyphonic notation) |
| `event_index` | `usize` | Index into voice's event array |

**Usage**:
- Frontend resolves to original `Note` or `Chord` for inspection/editing
- Example: User clicks notehead → `source_reference` → highlight note in inspector panel

---

### BracketType

**Purpose**: Visual grouping indicator for multi-staff instruments.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BracketType {
    Brace,    // Curved bracket (piano, harp)
    Bracket,  // Square bracket (choir, strings)
    None,     // No bracket (solo instruments)
}
```

---

### Color

**Purpose**: RGBA color representation.

**Rust Definition**:
```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}
```

**Constants**:
```rust
impl Color {
    pub const BLACK: Color = Color { r: 0, g: 0, b: 0, a: 255 };
    pub const GRAY: Color = Color { r: 128, g: 128, b: 128, a: 255 };
}
```

---

## Relationships & Cardinality

| Parent | Child | Cardinality | Constraint |
|--------|-------|-------------|------------|
| GlobalLayout | System | 1:N | N ≥ 1 (at least 1 system) |
| System | StaffGroup | 1:N | N = instrument_count |
| StaffGroup | Staff | 1:N | 1 ≤ N ≤ 2 (MVP limit) |
| Staff | GlyphRun | 1:N | N ≥ 0 (may be empty) |
| Staff | Glyph (structural) | 1:N | N ≥ 0 (clef + key sig + time sig) |
| GlyphRun | Glyph | 1:N | N ≥ 1 (empty runs deleted) |
| Glyph | SourceReference | 1:1 | Every glyph links to source |

---

## Coordinate System

**Logical Units**: All positions use resolution-independent logical units, not pixels.

**Conversion**: `pixels = logical_units * (pixels_per_space / units_per_space)`

**Example** (default configuration):
- `units_per_space = 10.0`
- 1 staff space = 10 logical units
- Staff height = 4 spaces = 40 logical units
- Typical font size = 40 logical units (4 staff spaces)

**Origin**:
- GlobalLayout: Top-left corner (0, 0)
- System: Relative to GlobalLayout origin
- Glyph: Relative to System origin

**Axis Convention**:
- X-axis: Left to right (positive = rightward)
- Y-axis: Top to bottom (positive = downward)

---

## Serialization Example

```json
{
  "systems": [
    {
      "index": 0,
      "bounding_box": { "x": 0.0, "y": 0.0, "width": 760.0, "height": 120.0 },
      "staff_groups": [
        {
          "instrument_id": "piano-1",
          "bracket_type": "Brace",
          "staves": [
            {
              "staff_lines": [
                { "y_position": 20.0, "start_x": 10.0, "end_x": 750.0 },
                { "y_position": 30.0, "start_x": 10.0, "end_x": 750.0 },
                { "y_position": 40.0, "start_x": 10.0, "end_x": 750.0 },
                { "y_position": 50.0, "start_x": 10.0, "end_x": 750.0 },
                { "y_position": 60.0, "start_x": 10.0, "end_x": 750.0 }
              ],
              "structural_glyphs": [
                {
                  "position": { "x": 15.0, "y": 40.0 },
                  "bounding_box": { "x": 15.0, "y": 20.0, "width": 8.0, "height": 40.0 },
                  "codepoint": "\u{E050}",
                  "source_reference": { "instrument_id": "piano-1", "staff_index": 0, "voice_index": 0, "event_index": 0 }
                }
              ],
              "glyph_runs": [
                {
                  "font_family": "Bravura",
                  "font_size": 40.0,
                  "color": { "r": 0, "g": 0, "b": 0, "a": 255 },
                  "opacity": 1.0,
                  "glyphs": [
                    {
                      "position": { "x": 50.0, "y": 40.0 },
                      "bounding_box": { "x": 48.0, "y": 38.0, "width": 12.0, "height": 8.0 },
                      "codepoint": "\u{E0A4}",
                      "source_reference": { "instrument_id": "piano-1", "staff_index": 0, "voice_index": 0, "event_index": 1 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      "tick_range": { "start_tick": 0, "end_tick": 3840 }
    }
  ],
  "total_width": 760.0,
  "total_height": 120.0,
  "units_per_space": 10.0
}
```

---

## Validation Rules

**GlobalLayout**:
- ✓ systems non-empty
- ✓ total_width matches widest system
- ✓ systems sorted by increasing y-position

**System**:
- ✓ tick_range.end > tick_range.start
- ✓ Adjacent systems have non-overlapping tick ranges
- ✓ staff_groups non-empty

**Staff**:
- ✓ Exactly 5 staff lines
- ✓ Staff lines evenly spaced (1 space = units_per_space)
- ✓ No glyph bounding box overlaps detected in tests

**Glyph**:
- ✓ source_reference resolves to existing CompiledScore event
- ✓ codepoint is valid SMuFL character
- ✓ position within system bounding box

---

**Next Phase**: Generate TypeScript contracts in `contracts/` directory for WASM bindings.
