# Feature Specification: Rust Layout Engine Engraving

**Feature Branch**: `018-rust-layout-engraving`  
**Created**: 2025-01-09  
**Status**: Draft  
**Input**: User description: "Complete the Rust Layout Engine implementation to generate staff content (staff lines, glyphs, SMuFL positioning) from note data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Staff Line Rendering (Priority: P1)

When a score is loaded into Layout View, the system renders staff lines with correct vertical positioning and horizontal extent.

**Why this priority**: Staff lines are the foundational element of music notation. Without them, no other notation elements can be meaningfully positioned or displayed. This is the absolute minimum viable output.

**Independent Test**: Load a single-staff score with one measure. Verify that exactly 5 horizontal staff lines appear at correct y-positions with proper spacing (20 logical units per staff space). Measure spacing between lines to confirm standards compliance.

**Acceptance Scenarios**:

1. **Given** a score with one treble clef staff and 4 quarter notes, **When** Layout View is activated, **Then** 5 equally-spaced horizontal staff lines are rendered spanning the full system width
2. **Given** a score with multiple systems, **When** Layout View renders the score, **Then** each system displays its own set of 5 staff lines at the correct vertical offset
3. **Given** a piano score with treble and bass staves, **When** Layout View renders, **Then** both staves display 5 staff lines each with correct vertical separation (80 logical units between staves)

---

### User Story 2 - Notehead Positioning (Priority: P1)

When notes are present in a score, the system positions notehead glyphs at the correct x-coordinate (horizontal timing) and y-coordinate (pitch).

**Why this priority**: Noteheads are the primary content of a musical score. Together with staff lines (US1), this delivers a minimal but recognizable notation display showing pitch and rhythm.

**Independent Test**: Load a score with 10 notes spanning different pitches. Verify each notehead appears at the mathematically correct x-position based on its tick value and y-position based on its MIDI pitch. Measure actual glyph positions against expected values (tolerance: ±2 logical units).

**Acceptance Scenarios**:

1. **Given** a score with a C4 quarter note at tick 0, **When** rendered, **Then** the notehead glyph appears centered on the middle line of the treble staff (y=40) at x=80 logical units (after clef)
2. **Given** notes spanning two octaves (C4 to C6), **When** rendered, **Then** noteheads are positioned on or between staff lines according to the diatonic pitch mapping
3. **Given** notes with different durations (whole, half, quarter, eighth), **When** rendered, **Then** correct SMuFL notehead glyphs are used (whole note: U+E0A2, half: U+E0A3, quarter/eighth: U+E0A4)
4. **Given** a 4/4 measure with 4 quarter notes, **When** rendered, **Then** noteheads are horizontally spaced proportionally across the measure width

---

### User Story 3 - Structural Glyph Rendering (Priority: P2)

When a score begins or contains changes, the system renders clef, time signature, and key signature glyphs at the appropriate positions.

**Why this priority**: These structural elements provide essential context for reading notation. While notes can be positioned without them, the notation is not readable or meaningful to musicians without this context.

**Independent Test**: Load a score with treble clef, 4/4 time signature, and key signature of D major (2 sharps). Verify that clef glyph appears at x=20, time signature digits at x=100, and sharp glyphs at correct line positions.

**Acceptance Scenarios**:

1. **Given** a score beginning with treble clef, **When** rendered, **Then** the treble clef glyph (U+E050) appears at x=20 logical units, centered on the second staff line from bottom
2. **Given** a 4/4 time signature, **When** rendered after clef, **Then** the "4" digits (U+E080 and U+E083) appear stacked vertically at the correct x-position
3. **Given** a key signature with 2 sharps (D major), **When** rendered, **Then** sharp glyphs (U+E262) appear on F and C lines at positions between clef and time signature
4. **Given** a mid-score clef change, **When** rendered, **Then** the new clef glyph appears at the bar line with appropriate spacing

---

### User Story 4 - Stem and Beam Rendering (Priority: P2)

When eighth notes or shorter durations are present, the system renders stems and beams connecting notes according to standard engraving rules.

**Why this priority**: Stems and beams are essential for durational clarity of shorter note values. However, notes are recognizable without perfect stem/beam implementation, making this lower priority than basic notehead positioning.

**Independent Test**: Load a measure with 8 consecutive eighth notes. Verify that each note has a stem (vertical line) and notes are connected with horizontal beam glyphs. Measure stem length (35 logical units), stem direction (down for notes above middle line, up for below), and beam positioning.

**Acceptance Scenarios**:

1. **Given** a quarter note on D4, **When** rendered, **Then** a stem line extends 35 logical units upward from the notehead
2. **Given** four consecutive eighth notes, **When** rendered, **Then** stems are drawn from each notehead and connected by a single horizontal beam glyph
3. **Given** eighth notes spanning different pitches, **When** rendered, **Then** beam follows the average pitch angle with consistent thickness
4. **Given** single eighth note (not beamed), **When** rendered, **Then** a flag glyph (U+E240) is attached to the stem instead of a beam

---

### User Story 5 - Multi-Staff Layout with Braces (Priority: P3)

When piano or other multi-staff instruments are present, the system renders multiple staves with correct vertical spacing and connecting braces or brackets.

**Why this priority**: Multi-staff instruments are common but represent a subset of use cases. Single-staff rendering must work perfectly before adding complexity of staff grouping.

**Independent Test**: Load a piano score (treble + bass staves). Verify 10 total staff lines (5 per staff), brace glyph connecting staves on left edge, and correct vertical spacing between staff groups (80 logical units between paired staves, 220 units between systems).

**Acceptance Scenarios**:

1. **Given** a piano score with treble and bass staves, **When** rendered, **Then** two 5-line staves appear with 80 logical units vertical separation
2. **Given** a piano staff group, **When** rendered, **Then** a brace glyph (U+E000) appears at x=0, vertically scaled to span both staves
3. **Given** string quartet score (4 staves), **When** rendered, **Then** a bracket glyph (U+E002) connects all staves with correct vertical scaling
4. **Given** notes on both piano staves, **When** rendered, **Then** noteheads on each staff are positioned correctly relative to their respective staff lines

---

### Edge Cases

- What happens when a note's MIDI pitch falls outside the staff (e.g., high C7 on treble)? **System renders ledger lines above/below staff at 20-unit intervals**
- How does the system handle extremely long systems (400+ measures)? **System breaks into multiple systems with max_system_width constraint, preserving continuity**
- What happens when time signature changes mid-score? **New time signature glyphs rendered at bar line where change occurs**
- How are rests positioned vs. notes? **Rests positioned vertically centered on staff (line 3) with horizontal spacing proportional to duration**
- What happens when two voices share one staff? **Notes use opposing stem directions (voice 1 up, voice 2 down) with coordinated spacing**
- How does system handle grace notes or ornaments? **Rendered at reduced scale (60%) positioned slightly before main note**
- What if a note has invalid MIDI pitch (e.g., negative or >127)? **System logs warning and skips note, continues rendering remaining content**
- How are accidentals (sharps, flats, naturals) positioned? **Placed 10 logical units left of notehead at correct vertical position based on pitch**

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate exactly 5 horizontal staff lines per staff, positioned at y-coordinates: 0, 20, 40, 60, 80 logical units (relative to staff origin)
- **FR-002**: System MUST convert MIDI pitch values to staff positions using chromatic-to-diatonic mapping where C4=MIDI 60 maps to middle line of treble staff (y=40)
- **FR-003**: System MUST select correct SMuFL notehead codepoint based on note duration: whole note (U+E0A2), half note (U+E0A3), quarter/eighth/shorter (U+E0A4)
- **FR-004**: System MUST position noteheads horizontally based on tick value with proportional spacing within measures
- **FR-005**: System MUST render clef glyphs at the beginning of each system: treble (U+E050), bass (U+E062), alto (U+E05C), tenor (U+E05D)
- **FR-006**: System MUST render time signature glyphs as stacked digits using SMuFL time signature number glyphs (U+E080-U+E089)
- **FR-007**: System MUST render key signature accidentals (sharps U+E262, flats U+E260) at standard positions for each key
- **FR-008**: System MUST generate stem lines for notes shorter than whole notes, with length of 35 logical units and direction determined by notehead position relative to staff center
- **FR-009**: System MUST generate beam glyphs connecting consecutive eighth notes or shorter within the same beat
- **FR-010**: System MUST support multi-staff rendering with configurable vertical spacing (default 80 units between staves within instrument, 220 units between systems)
- **FR-011**: System MUST render brace glyphs (U+E000) for piano staves and bracket glyphs (U+E002) for ensemble staves, vertically scaled to span connected staves
- **FR-012**: System MUST calculate accurate bounding boxes for all glyphs using SMuFL glyph metrics
- **FR-013**: System MUST output JSON structure matching GlobalLayout format with systems → staff_groups → staves → staff_lines, glyph_runs, structural_glyphs
- **FR-014**: System MUST populate staff_groups array for each system (currently returns empty arrays)
- **FR-015**: System MUST produce deterministic output (identical input produces identical output regardless of execution order)
- **FR-016**: System MUST handle scores up to 1000 measures without memory overflow or performance degradation
- **FR-017**: System MUST preserve tempo_changes and time_signature_changes from input in the output layout
- **FR-018**: System MUST use 20 logical units per staff space as the fundamental spacing unit
- **FR-019**: System MUST respect max_system_width configuration to break notation across multiple systems when content exceeds width
- **FR-020**: System MUST log warnings for invalid input data (e.g., missing clef, invalid MIDI pitch) but continue rendering remaining valid content

### Key Entities *(data structures)*

- **System**: Container representing one horizontal line of notation, containing one or more staff groups, with bounding box coordinates and tick range
- **StaffGroup**: Collection of staves belonging to one instrument (e.g., piano's treble+bass), with connecting brace/bracket glyph
- **Staff**: Single 5-line music staff, containing staff lines array, glyph runs for noteheads, and structural glyphs for clefs/signatures
- **StaffLine**: Individual horizontal line, with y-position relative to staff origin, start_x and end_x coordinates
- **GlyphRun**: Sequence of related glyphs (e.g., notes in one voice), containing array of positioned glyphs
- **Glyph**: Individual rendered symbol, with SMuFL codepoint (string), position (x, y in logical units), and font size
- **StructuralGlyph**: Non-note notation element (clef, time signature, key signature, barline), positioned independently of note timing
- **BoundingBox**: Rectangular area occupied by a glyph or layout element, with x, y, width, height in logical units
- **LayoutConfig**: Configuration object with max_system_width, system_height, system_spacing, units_per_space (20)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Generated output JSON structure exactly matches structure of test fixtures (violin_10_measures.json, piano_8_measures.json) with all fields populated
- **SC-002**: Notehead glyphs are positioned within ±2 logical units of mathematically expected coordinates based on pitch and timing
- **SC-003**: All SMuFL codepoints used are valid characters from the Bravura font specification (U+E000-U+F8FF range)
- **SC-004**: Layout View in musicore app successfully renders notation from real Score data without errors
- **SC-005**: System generates layout for 100-measure score in under 100 milliseconds on standard hardware
- **SC-006**: Staff lines are rendered with correct spacing: exactly 20 logical units between adjacent lines (measured mathematically)
- **SC-007**: Multi-staff rendering maintains correct vertical spacing: 80 units between paired staves (piano), 220 units between systems
- **SC-008**: Layout engine populates staff_groups arrays with at least 1 staff for single-instrument scores and 2+ staves for piano scores
- **SC-009**: Visual comparison between rendered output and professionally-engraved notation shows alignment accuracy within 3 pixels at 1.0 zoom
- **SC-010**: Zero memory leaks or crashes when processing 50 consecutive layout operations on different scores
- **SC-011**: Deterministic output verified by running same input 10 times and comparing byte-for-byte identical JSON output
- **SC-012**: Error recovery works: Engine continues rendering when encountering 5 invalid notes in a 100-note score, skipping only the invalid notes
