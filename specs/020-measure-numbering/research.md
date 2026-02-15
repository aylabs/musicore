# Research: Measure Numbering

**Feature**: 020-measure-numbering  
**Date**: 2026-02-15  
**Status**: Complete

## Research Questions & Findings

### RQ-1: How are measure boundaries determined?

**Decision**: Measure number = `(system.tick_range.start_tick / 3840) + 1` (1-based)

**Rationale**: The layout engine currently hardcodes 4/4 time (3840 ticks per measure at 960 PPQ). All measure `start_tick` values are multiples of 3840. While `TimeSignatureEvent` exists in the domain model, the layout engine's `extract_measures` function ignores time signature changes entirely (comment: "simplified — assumes 4/4 time"). Since this assumption is already baked into the system breaking and measure width computation, measure numbering should use the same derivation for consistency.

**Alternatives considered**:
- Parse `global_structural_events` for time signature changes to compute variable measure lengths → rejected: the entire layout pipeline assumes 4/4, and fixing that is out of scope for this feature
- Store measure index explicitly in `MeasureInfo` → considered but unnecessary: index is trivially derived from `start_tick / 3840`

### RQ-2: Where should the measure number be positioned?

**Decision**: x = 60.0 (aligned with clef), y = topmost staff line y - 30.0 (above top staff line)

**Rationale**: 
- **Horizontal**: The clef glyph is positioned at x=60.0 (hardcoded in `compute_layout`). FR-004 requires horizontal alignment with the clef.
- **Vertical**: Staff lines for staff_index=0 start at `system.bounding_box.y + 0.0` (top line at offset 0). The measure number must be above this line (FR-003). An offset of -30.0 provides ~1.5 staff spaces of clearance, keeping the number readable without overlapping staff content. Standard engraving practice places measure numbers at approximately 1-2 staff spaces above the top line.

**Alternatives considered**:
- Place at left_margin (x=210.0+) aligned with first note → rejected: spec explicitly requires alignment with clef
- Place at x=0.0 (far left) → rejected: would be outside the visual content area and misaligned with clef
- Use -20.0 offset → too close to staff, risk of visual overlap with high notes
- Use -40.0 offset → too far, wastes vertical space

### RQ-3: How should the measure number be represented in the layout data model?

**Decision**: New `MeasureNumber` struct added to `System` as `measure_number: Option<MeasureNumber>`

**Rationale**: The measure number is a system-level concept (one per system, FR-005). It is not a staff-level or glyph-level concept. Adding it to `System` is the most natural fit. Using `Option` allows empty systems to have no measure number. A dedicated struct (not reusing `Glyph`) is cleaner because:
- Measure numbers use a standard font, not SMuFL codepoints
- No `source_reference` (no corresponding domain event)
- Simpler fields: just number + position

**Alternatives considered**:
- Add as a structural glyph on the first staff → rejected: measure numbers are system-level, not staff-level; would require changing `Glyph` to support non-SMuFL text
- Add `measure_number: u32` directly on `System` without position → rejected: violates Principle VI (layout engine must provide all positioning)
- Add a `Vec<MeasureNumber>` for future numbering of all measures → rejected: YAGNI; only first measure per system needed per spec

### RQ-4: How should the renderer display measure numbers?

**Decision**: Render as SVG `<text>` element in `renderSystem()` using `system-ui, sans-serif` font at fontSize 14

**Rationale**: 
- FR-006 requires a standard text font (not SMuFL/Bravura)  
- The renderer already uses `system-ui, sans-serif` for error text (precedent in codebase)
- fontSize 14 is appropriate for small, unobtrusive numerals (standard engraving practice). The existing structural glyphs use fontSize 80 which is much larger — measure numbers should be visually subordinate
- Rendering in `renderSystem()` (before staff groups) ensures one number per system regardless of instrument count

**Alternatives considered**:
- Use Bravura font for numbers → rejected: FR-006 explicitly forbids music font for measure numbers
- Use fontSize 20 → too large, would compete visually with notation
- Render in `renderStaffGroup()` with dedup → unnecessarily complex; `renderSystem()` is the right level

### RQ-5: How do absolute vs. relative coordinates work in the rendering pipeline?

**Decision**: Store measure number position as absolute coordinates (including `system.bounding_box.y` offset), consistent with all other layout elements

**Rationale**: The existing pattern stores all positions as absolute coordinates. Staff lines, structural glyphs, and glyph runs all include the system's y offset. The renderer's `renderSystem()` applies `translate(system.bounding_box.x, system.bounding_box.y)`, but the actual element positions already include this offset — this is the established pattern throughout the codebase. The measure number should follow the same convention.

**Alternatives considered**:
- Store as system-relative coordinates → would break the pattern used by all other layout elements and require special handling in the renderer

### RQ-6: Impact on deterministic layout output

**Decision**: No impact on determinism. Measure number is derived deterministically from `tick_range.start_tick` (integer division), and positioned at fixed coordinates.

**Rationale**: The layout engine's determinism requirement (Spec 016) is preserved because:
- `start_tick / 3840` is integer division (always deterministic)
- x and y positions are constants (60.0 and `staff_line_y - 30.0`)
- The `MeasureNumber` struct uses `#[serde(serialize_with = "round_f32")]` for `f32` fields to ensure deterministic serialization

### RQ-7: Impact on existing tests and fixtures

**Decision**: Existing tests will need minor updates to account for the new `measure_number` field on `System`. Using `Option<MeasureNumber>` means existing fixture JSON without the field will deserialize to `None` (Serde default), minimizing test breakage.

**Rationale**: Serde's `#[serde(default)]` or `Option` deserialization handles missing fields gracefully. Existing test assertions that don't check `measure_number` will continue to pass. New tests specifically verify measure numbering behavior.
