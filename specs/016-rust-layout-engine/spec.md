# Feature Specification: Rust Layout Engine

**Feature Branch**: `016-rust-layout-engine`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input Description**: Create a Rust Layout Engine that converts a CompiledScore into a deterministic hierarchical spatial model expressed in logical units. The output defines systems as the primary virtualization boundary and provides bounding boxes for efficient rendering, hit testing, and interaction. Layout is computed ahead of runtime and is independent from the renderer. The spatial model hierarchy is: GlobalLayout → Systems[] → StaffGroups[] → Staves[] → GlyphRuns[] → Glyphs[], where GlyphRuns group glyphs sharing drawing properties to avoid duplications and optimize rendering

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compute Deterministic Layout for Caching (Priority: P1)

Musicians load scores multiple times across sessions (practice, performance, editing). The layout engine must produce byte-identical spatial models for the same input score, enabling aggressive caching without recomputation. Inconsistent layouts would cause glyphs to "jump" between sessions or require unnecessary recomputation.

**Why this priority**: Core requirement that enables all performance optimizations. Without determinism, caching is unsafe and users experience visual inconsistencies where notes appear at different positions after refreshing the page.

**Independent Test**: Import a 50-measure MusicXML file, compute layout, serialize to JSON. Clear cache, re-import same file, compute layout, serialize to JSON. Compare both JSON outputs byte-by-byte - they must be identical.

**Acceptance Scenarios**:

1. **Given** a CompiledScore with 50 measures, **When** layout is computed twice with same input, **Then** resulting GlobalLayout JSON serialization is byte-identical including all glyph positions, bounding boxes, and system breaks
2. **Given** a cached layout from previous session stored in IndexedDB, **When** same score is loaded in new browser session, **Then** newly computed layout matches cached version exactly, avoiding recomputation
3. **Given** layout computed on iPad and layout computed on Surface tablet with same score, **When** comparing serialized outputs, **Then** all logical unit positions are identical regardless of device screen resolution or pixel density

---

### User Story 2 - Virtualize Long Scores with System Boundaries (Priority: P1)

Musicians scroll through 200-measure scores (sonatas, concertos) during practice and performance. The renderer must display only visible systems to maintain 60fps scrolling. Layout engine organizes music into systems with known bounding boxes, enabling O(1) visibility checks and selective rendering.

**Why this priority**: Essential for tablet performance with long scores. Without system-based virtualization, 200-measure scores render 10,000+ glyphs unnecessarily, causing frame drops below 30fps during scrolling. Systems provide natural virtualization boundaries.

**Independent Test**: Load a 200-measure piano score, compute layout. Scroll viewport to show measures 100-105. Renderer queries visible systems using bounding boxes. Verify only surrounding systems (measures 90-120) are rendered. Scrolling maintains 60fps.

**Acceptance Scenarios**:

1. **Given** a 200-measure orchestral score with 8 staves, **When** layout engine computes systems, **Then** music is organized into 40-50 systems (4-5 measures per system) each with precise bounding box defining its screen region
2. **Given** a GlobalLayout with 45 systems, **When** renderer needs to find which system contains measure 87, **Then** lookup completes in O(1) time using system tick ranges (start_tick, end_tick per system)
3. **Given** viewport showing y-coordinates 400-800 on tablet screen, **When** renderer queries visible systems, **Then** only systems with bounding boxes intersecting that y-range are returned for rendering (typically 2-3 systems visible simultaneously)

---

### User Story 3 - Batch Glyphs for Efficient Rendering (Priority: P2)

Rendering engines (Canvas API, WebGL) minimize draw calls by batching identical operations. Layout engine groups consecutive glyphs sharing drawing properties (font, size, color, opacity) into GlyphRuns, enabling renderer to draw 100+ noteheads in single operation instead of 100 separate calls.

**Why this priority**: Significant performance optimization but not strictly required for MVP. Unbatched rendering works but performs poorly with complex scores. Can be added after basic layout works.

**Independent Test**: Compute layout for 30-measure piano score with 800 noteheads. Count GlyphRuns in output. Verify noteheads (same font/size/color) are grouped into <10 runs vs 800 individual glyphs. Mock renderer confirms single draw call per run.

**Acceptance Scenarios**:

1. **Given** a staff with 200 noteheads all using Bravura font at same size and black color, **When** layout engine computes glyph positions, **Then** all noteheads are grouped into single GlyphRun with 200 glyphs array
2. **Given** a measure with noteheads, accidentals (sharp symbols), and dynamics (forte marking), **When** batching occurs, **Then** each glyph type with different font properties gets separate GlyphRun (noteheads together, accidentals together, dynamics separate)
3. **Given** a GlyphRun containing 50 glyphs, **When** Canvas renderer draws the run, **Then** all 50 glyphs render with single fillText() call or single drawImage() call instead of 50 separate draw operations

---

### Edge Cases

- What happens when a single measure is too wide for max system width (100+ notes in one measure)? *[System contains only that measure, horizontal scroll enabled]*
- How does layout handle empty measures (whole rests only) - do they get minimum spacing? *[Apply default measure width based on time signature]*
- What happens when note durations create non-integer logical unit positions due to complex rhythms? *[Use floating point for positions, round to 2 decimal places for consistency]*
- How does system breaking work when score has dramatically different system widths (long measures mixed with short measures)? *[Each system breaks at measure boundaries, variable system widths acceptable]*
- What happens when staff groups have different numbers of measures (e.g., ossia staves appearing mid-score)?
- How does layout compute bounding boxes for glyphs with ledger lines extending outside staff? *[Include ledger lines in glyph bounding box]*
- What happens when accidentals would collide with noteheads - does layout adjust spacing automatically? *[Phase 1: Report collision warnings only. Phase 2: Auto-adjust spacing]*
- How does layout handle extremely dense chord stacks (10+ simultaneous notes in narrow space)? *[Apply minimum horizontal spacing per note column, system may become very wide]*

---

## Requirements *(mandatory)*

### Core Layout Computation

- **FR-001**: System MUST accept a CompiledScore as input and produce a GlobalLayout as output containing complete spatial model
- **FR-002**: Layout computation MUST be deterministic - identical CompiledScore inputs always produce byte-identical GlobalLayout outputs including all positions, bounding boxes, and system breaks
- **FR-003**: All positions MUST be expressed in logical units (resolution-independent coordinates) not pixels, with configurable units_per_space ratio (default: 10 logical units = 1 staff space)
- **FR-004**: Layout computation MUST complete ahead of rendering time - layout is computed once and reused, not computed during render frames
- **FR-005**: Layout output MUST be serializable to JSON for caching in browser storage (IndexedDB) and transferable between WASM and JavaScript

### Spatial Model Structure

- **FR-006**: GlobalLayout MUST organize music into Systems as primary containers, where each System represents 1-N measures arranged horizontally
- **FR-007**: Systems MUST be organized into StaffGroups for multi-staff instruments (piano treble+bass, SATB choir), where each group shares a bracket/brace and vertical alignment
- **FR-008**: Each Staff within a StaffGroup MUST contain 5 staff lines with known y-positions in logical units
- **FR-009**: Glyphs within each Staff MUST be grouped into GlyphRuns, where consecutive glyphs sharing identical drawing properties (font_family, font_size, color, opacity) are batched together
- **FR-010**: Each Glyph MUST have exact (x, y) position in logical units and rectangular bounding box (x, y, width, height) for hit testing and rendering bounds calculation

### System Layout

- **FR-011**: Each System MUST have a bounding box defining its screen region (x, y, width, height in logical units)
- **FR-012**: Each System MUST track the tick range it contains (start_tick, end_tick) enabling O(1) lookup of which system contains any measure
- **FR-013**: Systems MUST break only at measure boundaries - no system can split a single measure across multiple lines
- **FR-014**: System breaking MUST respect a maximum system width constraint (default: 800 logical units, configurable), starting new system when adding next measure would exceed limit
- **FR-015**: Systems MUST be positioned from top to bottom with consistent vertical spacing between systems (default: 150 logical units between system baselines)

### Staff Layout

- **FR-016**: Staff lines MUST be positioned at intervals of 1 staff space (10 logical units default) creating standard 4-space staff height
- **FR-017**: Multi-staff instruments MUST have staves vertically separated by 2 staff spaces minimum (20 logical units) for visual clarity and barline drawing
- **FR-018**: StaffGroup MUST include bracket_type metadata (Brace for piano/harp, Bracket for choir/strings, None for solo instruments) for renderer use
- **FR-019**: Each Staff MUST include structural glyphs array containing clefs, key signatures, and time signatures positioned at staff start
- **FR-020**: Structural glyphs MUST appear only at the first system or when values change, not repeated on every system (e.g., clef shown at score start and when clef changes)

### Glyph Positioning

- **FR-021**: Each Glyph MUST reference a SMuFL codepoint (Unicode musical symbol) defining which glyph to render
- **FR-022**: Glyph positions MUST account for SMuFL font metrics including glyph bounding boxes and baseline positions from font metadata
- **FR-023**: Noteheads MUST be positioned vertically based on pitch - each half-step up moves position by 0.5 staff spaces (5 logical units)
- **FR-024**: Accidentals (sharps, flats, naturals) MUST be positioned horizontally before noteheads with minimum spacing of 1.5 staff spaces (15 logical units) to prevent collision
- **FR-025**: Ledger lines MUST be computed for notes outside the 5-line staff range, included in note glyph bounding box
- **FR-026**: Each Glyph MUST include source_reference linking back to original CompiledScore element (instrument_id, staff_index, voice_index, event_index) for interaction like clicking notes

### Horizontal Spacing

- **FR-027**: Horizontal spacing between note columns MUST be proportional to note durations - longer notes receive more horizontal space than shorter notes
- **FR-028**: Spacing algorithm MUST use formula: `spacing_width = base_spacing + (duration_ticks / quarter_note_ticks) * duration_factor`, where base_spacing and duration_factor are configurable
- **FR-029**: Minimum spacing between adjacent note columns MUST prevent glyph overlap - if proportional spacing is too narrow, increase to minimum separation (default: 2 staff spaces)
- **FR-030**: Spacing MUST be consistent across all staves in a system - simultaneous events in different staves occur at same x-position (vertical alignment)

### Performance Requirements

- **FR-031**: Layout computation MUST complete in <100ms for 50-measure single-instrument score on mid-range tablet device (2018 iPad, 2020 Surface Go)
- **FR-032**: Layout computation MUST scale linearly - 100-measure score should complete in <200ms, 200-measure in <400ms
- **FR-033**: Serialized GlobalLayout JSON MUST be <500KB for 100-measure piano score to enable efficient caching in IndexedDB without storage pressure
- **FR-034**: WASM binary size MUST be <300KB gzipped to enable fast loading on mobile/tablet networks

---

## Key Entities *(mandatory)*

### GlobalLayout (Root Container)

```rust
pub struct GlobalLayout {
    pub systems: Vec<System>,
    pub total_width: f32,      // Logical units - widest system width
    pub total_height: f32,     // Logical units - sum of all system heights + spacing
    pub units_per_space: f32,  // Default: 10.0 (10 units = 1 staff space)
}
```

**Description**: Top-level spatial model containing entire score layout. Provides total dimensions for scrollable area and array of systems for virtualized rendering.

### System (Virtualization Boundary)

```rust
pub struct System {
    pub index: usize,                // 0-based system number
    pub bounding_box: BoundingBox,   // Screen region in logical units
    pub staff_groups: Vec<StaffGroup>,
    pub tick_range: TickRange,       // Musical time span (start_tick, end_tick)
}
```

**Description**: Contains 1-4 measures of music arranged horizontally. Primary unit for virtualized rendering - only visible systems are drawn. Knows its position and the musical time range it represents.

### StaffGroup (Multi-Staff Instruments)

```rust
pub struct StaffGroup {
    pub instrument_id: String,       // Links to CompiledScore.Instrument
    pub staves: Vec<Staff>,          // 1-2 staves (piano, SATB)
    pub bracket_type: BracketType,   // Brace | Bracket | None
}
```

**Description**: Groups related staves for multi-staff instruments. Piano has treble+bass staves. SATB choir has 4 staves. Solo instruments have 1 staff. Manages bracket/brace drawing between staves.

### Staff (Five-Line Staff)

```rust
pub struct Staff {
    pub staff_lines: [StaffLine; 5],        // Always exactly 5 lines
    pub glyph_runs: Vec<GlyphRun>,          // Batched glyphs for rendering
    pub structural_glyphs: Vec<Glyph>,      // Clefs, key sigs, time sigs at staff start
}
```

**Description**: Single staff with 5 horizontal lines. Contains glyph runs for efficient batch rendering and structural glyphs shown at beginning of staff.

### StaffLine

```rust
pub struct StaffLine {
    pub y_position: f32,     // Logical units from system top
    pub start_x: f32,        // Left edge of staff line
    pub end_x: f32,          // Right edge of staff line
}
```

**Description**: Single horizontal line in the staff. Used for rendering staff lines and calculating pitch-based vertical positions for noteheads.

### GlyphRun (Batched Glyphs)

```rust
pub struct GlyphRun {
    pub glyphs: Vec<Glyph>,       // All glyphs sharing properties below
    pub font_family: String,      // "Bravura" (SMuFL font)
    pub font_size: f32,           // Logical units (typically 40 = 4 staff spaces)
    pub color: Color,             // RGBA (default: black)
    pub opacity: f32,             // 0.0-1.0 (default: 1.0)
}
```

**Description**: Groups consecutive glyphs with identical drawing properties. Enables renderer to draw entire run with single draw call instead of per-glyph calls, dramatically reducing rendering overhead.

### Glyph (Atomic Element)

```rust
pub struct Glyph {
    pub position: Point,               // (x, y) in logical units
    pub bounding_box: BoundingBox,     // Hit testing rectangle
    pub codepoint: char,               // SMuFL codepoint (e.g., U+E0A4 = quarter notehead)
    pub source_reference: SourceReference,  // Link to CompiledScore element
}
```

**Description**: Single drawable musical symbol with exact position. Links back to domain model element for interaction (clicking note highlights it, opens inspector, etc.).

### Supporting Types

```rust
pub struct BoundingBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

pub struct Point {
    pub x: f32,
    pub y: f32,
}

pub struct TickRange {
    pub start_tick: u32,  // 960 PPQ - first tick in range
    pub end_tick: u32,    // 960 PPQ - last tick in range (exclusive)
}

pub struct SourceReference {
    pub instrument_id: String,
    pub staff_index: usize,
    pub voice_index: usize,
    pub event_index: usize,
}

pub enum BracketType {
    Brace,      // Piano, harp (curved bracket)
    Bracket,    // Choir, strings (square bracket)
    None,       // Solo instruments
}

pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Layout computation completes in <100ms for 50-measure piano score on 2018 iPad (A12 processor), measured via WASM performance profiling
- **SC-002**: Repeated computation of same score produces byte-identical JSON serialization verified by SHA-256 hash comparison across 10 imports
- **SC-003**: Virtualized rendering of 200-measure score is 80% faster than full rendering measured by frame times during 60fps scrolling (virtualized: <16ms/frame, full: >80ms/frame)
- **SC-004**: Glyph batching reduces Canvas draw calls to <10% of total glyph count for typical scores (30-measure piano: 800 glyphs -> <80 draw calls)
- **SC-005**: Serialized GlobalLayout JSON is <500KB for 100-measure piano score with 2000+ notes, enabling IndexedDB storage without quota concerns
- **SC-006**: Hit testing (finding glyph at click coordinates) completes in <10ms using bounding box spatial queries without full traversal
- **SC-007**: Layout engine produces no glyph overlaps in automated tests with 20+ diverse scores, verified by bounding box intersection checks
- **SC-008**: Visual comparison with Finale/MuseScore PDF exports shows similar spacing and alignment within 5% margin for 10 test scores

**Last Updated**: 2026-02-12
